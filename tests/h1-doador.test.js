// H1 · O doador acompanha as suas doações.
// Como doador, quero ver as doações que publiquei e a situação de cada uma,
// para saber se alguém vai buscar.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar, query } from '../src/db.js';

const app = criarApp();

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

function publicar(doador, tipo = 'Pão') {
  return request(app)
    .post('/api/doacoes')
    .send({ doador, tipo, quantidade: '5 kg', validade: '2026-12-30' });
}

function minhas(doador) {
  return request(app).get('/api/doacoes/minhas').query({ doador });
}

describe('H1 · o doador acompanha as suas doações', () => {
  // CA1. Dado que a "Padaria Pão Bom" publicou duas doações e a "Casa Esperança"
  // aceitou uma delas, quando a padaria consulta as suas doações, então vê as duas:
  // uma disponível e outra aceita por Casa Esperança.
  it('o doador vê as próprias doações com a situação de cada uma', async () => {
    const { body: pao } = await publicar('Padaria Pão Bom', 'Pão');
    const { body: bolo } = await publicar('Padaria Pão Bom', 'Bolo');
    await request(app).post(`/api/doacoes/${bolo.id}/aceitar`).send({ ong: 'Casa Esperança' });

    const res = await minhas('Padaria Pão Bom');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const porId = Object.fromEntries(res.body.map((d) => [d.id, d]));
    expect(porId[pao.id]).toMatchObject({ tipo: 'Pão', status: 'disponivel', ong: null });
    expect(porId[bolo.id]).toMatchObject({ tipo: 'Bolo', status: 'aceita', ong: 'Casa Esperança' });
  });

  // CA2. Dado que outro doador publicou uma doação, quando a "Padaria Pão Bom"
  // consulta as suas, então essa doação não aparece.
  it('a doação de outro doador não aparece nas doações do doador', async () => {
    const { body: minha } = await publicar('Padaria Pão Bom');
    await publicar('Mercado Bom Preço');

    const res = await minhas('Padaria Pão Bom');

    expect(res.body.map((d) => d.id)).toEqual([minha.id]);
  });

  // CA3. Dado que o doador não é informado na publicação, quando a doação é
  // enviada, então ela é recusada com uma mensagem clara e nada é gravado.
  it('recusa publicar doação sem o doador e não grava nada', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Pão', quantidade: '5 kg', validade: '2026-12-30' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/doador/);
    const { rows } = await query('SELECT count(*) AS n FROM doacoes');
    expect(rows[0].n).toBe(0);
  });

  // Limite (decisão do grupo, D8): o doador se identifica pelo nome digitado.
  // Espaços nas pontas e maiúsculas/minúsculas não criam outro doador.
  it('encontra as doações do doador mesmo com espaços e maiúsculas diferentes', async () => {
    const { body: doacao } = await publicar('Padaria Pão Bom');

    const res = await minhas('  padaria pão bom ');

    expect(res.body.map((d) => d.id)).toEqual([doacao.id]);
  });

  // Limite (decisão do grupo, D8): doações publicadas antes de H1 não têm doador.
  // Continuam na lista das ONGs, mas não aparecem como de ninguém.
  it('doação antiga sem doador continua disponível para as ONGs e não aparece para nenhum doador', async () => {
    await query("INSERT INTO doacoes (tipo, quantidade, validade) VALUES ('Sopa', '10 porções', '2026-12-01')");

    const lista = await request(app).get('/api/doacoes');
    const daPadaria = await minhas('Padaria Pão Bom');

    expect(lista.body).toHaveLength(1);
    expect(lista.body[0].doador).toBeNull();
    expect(daPadaria.body).toEqual([]);
  });

  // Erro: consultar sem dizer quem é o doador.
  it('recusa consultar as doações sem informar o doador', async () => {
    const res = await request(app).get('/api/doacoes/minhas');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/doador/);
  });
});

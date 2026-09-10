import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

const app = criarApp();

// Cada teste parte de um banco limpo: nenhum depende da ordem de execução.
beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

// Doação de exemplo. Cada teste sobrescreve só o campo que lhe interessa.
const doacaoValida = {
  tipo: 'Sopa',
  quantidade: '10 porções',
  validade: '2026-09-30',
};

async function publicar(dados = doacaoValida) {
  return request(app).post('/api/doacoes').send(dados);
}

// Este teste já passa e não depende do banco:
// prova que a aplicação sobe e que o CI está funcionando.
describe('a aplicação sobe', () => {
  it('responde na verificação de saúde', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe('publicar e listar doações', () => {
  // Dado que um doador publicou uma doação
  // Quando uma ONG consulta as doações disponíveis
  // Então a doação aparece na lista
  it('mostra a doação publicada na lista de disponíveis', async () => {
    await publicar();

    const res = await request(app).get('/api/doacoes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      tipo: 'Sopa',
      quantidade: '10 porções',
      validade: '2026-09-30',
      status: 'disponivel',
    });
  });

  // Dado um doador preenchendo uma doação
  // Quando ele deixa um campo obrigatório em branco
  // Então a doação é recusada e nada é gravado
  it('recusa doação sem os campos obrigatórios', async () => {
    const res = await publicar({ tipo: 'Sopa', quantidade: '', validade: '' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/quantidade/);
    expect(res.body.erro).toMatch(/validade/);

    const lista = await request(app).get('/api/doacoes');
    expect(lista.body).toHaveLength(0);
  });
});

describe('aceitar uma doação', () => {
  // Dado que existe uma doação disponível
  // Quando uma ONG a aceita
  // Então a doação fica registrada como aceita por aquela ONG
  it('marca a doação como aceita pela ONG', async () => {
    const { body: doacao } = await publicar();

    const res = await request(app)
      .post(`/api/doacoes/${doacao.id}/aceitar`)
      .send({ ong: 'Casa do Caminho' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('aceita');
    expect(res.body.ong).toBe('Casa do Caminho');
  });

  // Dado que uma ONG aceitou uma doação
  // Quando outra ONG consulta as doações disponíveis
  // Então a doação aceita não aparece na lista
  it('remove a doação da lista de disponíveis depois de aceita', async () => {
    const { body: doacao } = await publicar();
    await request(app)
      .post(`/api/doacoes/${doacao.id}/aceitar`)
      .send({ ong: 'Casa do Caminho' });

    const res = await request(app).get('/api/doacoes');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // Dado que uma ONG já aceitou uma doação
  // Quando uma segunda ONG tenta aceitar a mesma doação
  // Então a tentativa é recusada e a primeira ONG continua sendo a dona
  it('recusa aceitar uma doação que já foi aceita por outra ONG', async () => {
    const { body: doacao } = await publicar();
    await request(app)
      .post(`/api/doacoes/${doacao.id}/aceitar`)
      .send({ ong: 'Casa do Caminho' });

    const res = await request(app)
      .post(`/api/doacoes/${doacao.id}/aceitar`)
      .send({ ong: 'Lar Esperança' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/Casa do Caminho/);
  });
});

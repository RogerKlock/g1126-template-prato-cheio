// H3 · A ONG devolve uma doação aceita.
// Como ONG, quero devolver uma doação que aceitei e não vou conseguir buscar,
// para que outra ONG possa aproveitá-la a tempo.
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

async function publicarEAceitar(ong = 'Casa Esperança') {
  const { body: doacao } = await request(app)
    .post('/api/doacoes')
    .send({ doador: 'Padaria Pão Bom', tipo: 'Pão', quantidade: '5 kg', validade: '2026-12-30' });
  await request(app).post(`/api/doacoes/${doacao.id}/aceitar`).send({ ong });
  return doacao;
}

function devolver(id, ong, motivo) {
  return request(app).post(`/api/doacoes/${id}/devolver`).send({ ong, motivo });
}

describe('H3 · a ONG devolve uma doação aceita', () => {
  // CA1. Dado que a "Casa Esperança" aceitou uma doação, quando ela a devolve com
  // o motivo "sem voluntário hoje", então a doação volta para a lista de
  // disponíveis, sem ONG, e o motivo fica registrado.
  it('a doação devolvida volta inteira para a lista, sem ONG, e o motivo fica registrado', async () => {
    const doacao = await publicarEAceitar();

    const res = await devolver(doacao.id, 'Casa Esperança', 'sem voluntário hoje');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: doacao.id, status: 'disponivel', ong: null, aceita_em: null });
    const { body: lista } = await request(app).get('/api/doacoes');
    expect(lista).toEqual([
      expect.objectContaining({ id: doacao.id, tipo: 'Pão', quantidade: '5 kg', status: 'disponivel', ong: null }),
    ]);
    const { rows } = await query('SELECT doacao_id, ong, motivo FROM devolucoes');
    expect(rows).toEqual([{ doacao_id: doacao.id, ong: 'Casa Esperança', motivo: 'sem voluntário hoje' }]);
  });
});

describe('H3 · regras da devolução', () => {
  // CA2. Dado que a doação já foi coletada, quando a ONG tenta devolvê-la, então a
  // devolução é recusada com mensagem.
  it('recusa devolver uma doação já coletada', async () => {
    const doacao = await publicarEAceitar();
    await request(app).post(`/api/doacoes/${doacao.id}/coletar`).send({ voluntario: 'Rui' });

    const res = await devolver(doacao.id, 'Casa Esperança', 'sem voluntário hoje');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não pode ser devolvida: está coletada/);
    const { rows } = await query('SELECT status, ong FROM doacoes WHERE id = $1', [doacao.id]);
    expect(rows[0]).toEqual({ status: 'coletada', ong: 'Casa Esperança' });
  });

  // CA3. Dado que a "Casa Esperança" aceitou a doação, quando outra ONG tenta
  // devolvê-la, então a devolução é recusada e a doação continua aceita pela
  // Casa Esperança.
  it('recusa a devolução feita por outra ONG e a doação continua com quem aceitou', async () => {
    const doacao = await publicarEAceitar('Casa Esperança');

    const res = await devolver(doacao.id, 'Lar Esperança', 'engano');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/só Casa Esperança pode devolvê-la/);
    const { body: aceitas } = await request(app).get('/api/doacoes/aceitas');
    expect(aceitas).toEqual([expect.objectContaining({ id: doacao.id, status: 'aceita', ong: 'Casa Esperança' })]);
    const { rows } = await query('SELECT count(*) AS n FROM devolucoes');
    expect(rows[0].n).toBe(0);
  });

  // Decisão do grupo (D10): o motivo é obrigatório.
  it('recusa devolver sem motivo e a doação continua aceita', async () => {
    const doacao = await publicarEAceitar();

    const res = await devolver(doacao.id, 'Casa Esperança', '  ');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/motivo/);
    const { rows } = await query('SELECT status FROM doacoes WHERE id = $1', [doacao.id]);
    expect(rows[0].status).toBe('aceita');
  });

  // Decisão do grupo (D10): a ONG que devolveu pode aceitar a mesma doação de novo.
  it('a ONG que devolveu pode aceitar a mesma doação de novo', async () => {
    const doacao = await publicarEAceitar('Casa Esperança');
    await devolver(doacao.id, 'Casa Esperança', 'sem voluntário hoje');

    const res = await request(app).post(`/api/doacoes/${doacao.id}/aceitar`).send({ ong: 'Casa Esperança' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'aceita', ong: 'Casa Esperança' });
  });

  // Erro: devolver uma doação que não existe.
  it('recusa devolver uma doação que não existe', async () => {
    const res = await devolver(999999, 'Casa Esperança', 'sem voluntário hoje');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não encontrada/);
  });
});

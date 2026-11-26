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

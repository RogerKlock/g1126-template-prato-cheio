import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

const app = criarApp();

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

const doacaoValida = {
  tipo: 'Frutas',
  quantidade: '3 caixas',
  validade: '2026-10-28',
};

async function publicar() {
  const { body } = await request(app).post('/api/doacoes').send(doacaoValida);
  return body;
}

describe('doador cancela uma doação', () => {
  // Dado que um doador publicou uma doação e nenhuma ONG a aceitou
  // Quando o doador a cancela
  // Então ela fica "cancelada" e some da lista de disponíveis
  it('cancela uma doação disponível e a tira da lista', async () => {
    const doacao = await publicar();

    const res = await request(app).post(`/api/doacoes/${doacao.id}/cancelar`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelada');
    const lista = await request(app).get('/api/doacoes');
    expect(lista.body).toHaveLength(0);
  });

  // Dado que uma ONG já aceitou a doação
  // Quando o doador tenta cancelá-la
  // Então o cancelamento é recusado e a doação continua no nome da ONG
  it('recusa cancelar uma doação já aceita', async () => {
    const doacao = await publicar();
    await request(app)
      .post(`/api/doacoes/${doacao.id}/aceitar`)
      .send({ ong: 'Casa do Caminho' });

    const res = await request(app).post(`/api/doacoes/${doacao.id}/cancelar`);

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/aceita/);
    const aceitas = await request(app).get('/api/doacoes/aceitas');
    expect(aceitas.body).toMatchObject([{ id: doacao.id, ong: 'Casa do Caminho' }]);
  });

  // Dado que o doador cancelou uma doação
  // Quando uma ONG tenta aceitá-la (pelo link antigo, por exemplo)
  // Então o aceite é recusado e a ONG fica sabendo que foi cancelada
  it('não deixa uma ONG aceitar uma doação cancelada', async () => {
    const doacao = await publicar();
    await request(app).post(`/api/doacoes/${doacao.id}/cancelar`);

    const res = await request(app)
      .post(`/api/doacoes/${doacao.id}/aceitar`)
      .send({ ong: 'Lar Esperança' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/cancelada/);
  });
});

// H2 · O voluntário confirma a coleta.
// Como voluntário, quero confirmar que busquei a doação, para que a ONG e o
// doador saibam que ela chegou.
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

async function publicar() {
  const { body } = await request(app)
    .post('/api/doacoes')
    .send({ doador: 'Padaria Pão Bom', tipo: 'Pão', quantidade: '5 kg', validade: '2026-12-30' });
  return body;
}

async function publicarEAceitar(ong = 'Casa Esperança') {
  const doacao = await publicar();
  await request(app).post(`/api/doacoes/${doacao.id}/aceitar`).send({ ong });
  return doacao;
}

function confirmarColeta(id, voluntario) {
  return request(app).post(`/api/doacoes/${id}/coletar`).send({ voluntario });
}

async function situacao(id) {
  const { body } = await request(app).get('/api/doacoes/minhas').query({ doador: 'Padaria Pão Bom' });
  return body.find((d) => d.id === id);
}

describe('H2 · o voluntário confirma a coleta', () => {
  // CA1. Dado que a "Casa Esperança" aceitou uma doação, quando o voluntário "Rui"
  // confirma a coleta, então ela passa a coletada, com o nome do voluntário e o
  // horário da coleta.
  it('a coleta confirmada grava o voluntário e o horário', async () => {
    const doacao = await publicarEAceitar();
    const antes = Date.now();

    const res = await confirmarColeta(doacao.id, 'Rui');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'coletada', voluntario: 'Rui', ong: 'Casa Esperança' });
    const horario = new Date(res.body.coletada_em).getTime();
    expect(horario).toBeGreaterThanOrEqual(antes - 5000);
    expect(horario).toBeLessThanOrEqual(Date.now() + 5000);
  });

  // CA2. Dado que a doação ainda está disponível, quando alguém tenta confirmar a
  // coleta, então a confirmação é recusada com mensagem e a doação não muda.
  it('recusa confirmar a coleta de uma doação ainda disponível e não a altera', async () => {
    const doacao = await publicar();

    const res = await confirmarColeta(doacao.id, 'Rui');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/não pode ser coletada: está disponivel/);
    expect(await situacao(doacao.id)).toMatchObject({ status: 'disponivel', coletada_em: null, ong: null });
  });

  // CA3. Dado que a doação foi coletada, quando o doador consulta as suas
  // doações (H1), então ela aparece como coletada.
  it('o doador vê a doação coletada nas suas doações', async () => {
    const doacao = await publicarEAceitar();
    await confirmarColeta(doacao.id, 'Rui');

    expect(await situacao(doacao.id)).toMatchObject({ status: 'coletada', ong: 'Casa Esperança' });
  });

  // Decisão do grupo (D9): confirmar duas vezes é recusado, e a segunda
  // confirmação não troca o voluntário nem o horário registrados.
  it('recusa a segunda confirmação sem trocar o voluntário nem o horário', async () => {
    const doacao = await publicarEAceitar();
    const primeira = await confirmarColeta(doacao.id, 'Rui');

    const segunda = await confirmarColeta(doacao.id, 'Ana');

    expect(segunda.status).toBe(400);
    expect(segunda.body.erro).toMatch(/já foi coletada/);
    const { body: aceitasOuNao } = await request(app).get('/api/doacoes/aceitas');
    expect(aceitasOuNao).toEqual([]);
    const { body: coletadas } = await request(app).get('/api/doacoes/minhas').query({ doador: 'Padaria Pão Bom' });
    expect(coletadas[0].coletada_em).toBe(primeira.body.coletada_em);
  });

  // Decisão do grupo (D9): o nome do voluntário é obrigatório.
  it('recusa confirmar a coleta sem o nome do voluntário e a doação continua aceita', async () => {
    const doacao = await publicarEAceitar();

    const res = await confirmarColeta(doacao.id, '   ');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/voluntário/);
    expect(await situacao(doacao.id)).toMatchObject({ status: 'aceita', coletada_em: null });
  });

  // Decisão do grupo (D9): o nome do voluntário é dado pessoal — a ONG vê,
  // o doador não.
  it('o doador não recebe o nome do voluntário', async () => {
    const doacao = await publicarEAceitar();
    await confirmarColeta(doacao.id, 'Rui');

    expect(await situacao(doacao.id)).not.toHaveProperty('voluntario');
  });
});

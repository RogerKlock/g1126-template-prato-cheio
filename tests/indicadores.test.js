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

const doacaoValida = {
  tipo: 'Marmitas',
  quantidade: '20 unidades',
  validade: '2026-10-23',
};

async function publicar() {
  const { body } = await request(app).post('/api/doacoes').send(doacaoValida);
  return body;
}

async function aceitar(id) {
  return request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'Casa do Caminho' });
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

describe('Marta vê quantas doações foram aceitas no mês', () => {
  // Dado duas doações aceitas neste mês (uma delas já coletada) e uma ainda disponível
  // Quando a Marta consulta as aceitas do mês
  // Então o número é 2
  it('conta as aceitas no mês, inclusive as que já foram coletadas', async () => {
    const a = await publicar();
    const b = await publicar();
    await publicar();
    await aceitar(a.id);
    await aceitar(b.id);
    await request(app).post(`/api/doacoes/${b.id}/coletar`);

    const res = await request(app).get('/api/indicadores/aceitas-no-mes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mes: mesAtual(), aceitas: 2 });
  });

  // Dado uma doação aceita em outro mês
  // Quando a Marta consulta as aceitas deste mês
  // Então ela não entra na conta
  it('não conta doações aceitas em outro mês', async () => {
    const antiga = await publicar();
    await aceitar(antiga.id);
    await query("UPDATE doacoes SET aceita_em = '2026-09-15 12:00:00' WHERE id = ?", [antiga.id]);

    const deste = await request(app).get('/api/indicadores/aceitas-no-mes');
    const desetembro = await request(app).get('/api/indicadores/aceitas-no-mes?mes=2026-09');

    expect(deste.body.aceitas).toBe(0);
    expect(desetembro.body).toEqual({ mes: '2026-09', aceitas: 1 });
  });

  // Dado um mês escrito fora do formato
  // Quando a Marta consulta
  // Então a consulta é recusada com o formato esperado
  it('recusa mês fora do formato AAAA-MM', async () => {
    const res = await request(app).get('/api/indicadores/aceitas-no-mes?mes=10/2026');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/AAAA-MM/);
  });
});

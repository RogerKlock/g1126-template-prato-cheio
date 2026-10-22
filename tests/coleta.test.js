import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar, conexao, query } from '../src/db.js';

const app = criarApp();

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

const doacaoValida = {
  tipo: 'Pão',
  quantidade: '5 kg',
  validade: '2026-10-30',
};

async function publicarEAceitar() {
  const { body: doacao } = await request(app).post('/api/doacoes').send(doacaoValida);
  await request(app)
    .post(`/api/doacoes/${doacao.id}/aceitar`)
    .send({ ong: 'Casa do Caminho' });
  return doacao;
}

describe('voluntário marca a doação como coletada', () => {
  // Dado que uma ONG aceitou uma doação
  // Quando o voluntário marca a doação como coletada
  // Então ela passa a "coletada", com a data da coleta, e continua no nome da ONG
  it('marca como coletada uma doação aceita e registra quando', async () => {
    const doacao = await publicarEAceitar();

    const res = await request(app).post(`/api/doacoes/${doacao.id}/coletar`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('coletada');
    expect(res.body.coletada_em).toBeTruthy();
    expect(res.body.ong).toBe('Casa do Caminho');
  });

  // Dado que uma doação ainda está disponível (nenhuma ONG aceitou)
  // Quando o voluntário tenta marcá-la como coletada
  // Então a ação é recusada e a doação continua disponível
  it('recusa coletar uma doação que ainda não foi aceita', async () => {
    const { body: doacao } = await request(app).post('/api/doacoes').send(doacaoValida);

    const res = await request(app).post(`/api/doacoes/${doacao.id}/coletar`);

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/disponivel/);
    const lista = await request(app).get('/api/doacoes');
    expect(lista.body).toHaveLength(1);
  });

  // Dado que o voluntário já marcou a doação como coletada
  // Quando o celular reenvia a mesma ação (conexão instável)
  // Então a repetição é recusada e a data da coleta não muda
  it('não altera a coleta quando a ação é repetida', async () => {
    const doacao = await publicarEAceitar();
    const primeira = await request(app).post(`/api/doacoes/${doacao.id}/coletar`);

    const repetida = await request(app).post(`/api/doacoes/${doacao.id}/coletar`);

    expect(repetida.status).toBe(400);
    expect(repetida.body.erro).toMatch(/já foi coletada/);
    const { rows } = await query('SELECT coletada_em FROM doacoes WHERE id = ?', [doacao.id]);
    expect(rows[0].coletada_em).toBe(primeira.body.coletada_em);
  });

  // Dado uma doação aceita e outra já coletada
  // Quando o voluntário consulta o que precisa buscar
  // Então só a aceita aparece
  it('lista para o voluntário só as aceitas que ainda faltam buscar', async () => {
    const aBuscar = await publicarEAceitar();
    const jaColetada = await publicarEAceitar();
    await request(app).post(`/api/doacoes/${jaColetada.id}/coletar`);

    const res = await request(app).get('/api/doacoes/aceitas');

    expect(res.status).toBe(200);
    expect(res.body.map((d) => d.id)).toEqual([aBuscar.id]);
  });
});

describe('migração do schema com dados reais', () => {
  // Dado um banco criado antes desta história, com uma doação gravada
  // Quando o schema é migrado
  // Então a coluna nova aparece e a doação continua lá, intacta
  it('acrescenta a coluna nova sem apagar as doações existentes', async () => {
    conexao().exec('DROP TABLE doacoes');
    conexao().exec(`
      CREATE TABLE doacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT, tipo TEXT NOT NULL,
        quantidade TEXT NOT NULL, validade TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'disponivel', ong TEXT,
        criada_em TEXT NOT NULL DEFAULT (datetime('now'))
      )`);
    await query("INSERT INTO doacoes (tipo, quantidade, validade) VALUES ('Sopa', '10 porções', '2026-10-25')");

    await migrar();
    await migrar(); // rodar de novo não pode quebrar nem duplicar nada

    const colunas = conexao().prepare('PRAGMA table_info(doacoes)').all().map((c) => c.name);
    expect(colunas).toContain('coletada_em');
    const { rows } = await query('SELECT tipo, status FROM doacoes');
    expect(rows).toEqual([{ tipo: 'Sopa', status: 'disponivel' }]);
  });
});

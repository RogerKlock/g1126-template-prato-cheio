// História 4b — os testes não conseguem apagar nem alterar dados de um banco que
// não seja o de teste, seja qual for a máquina ou a configuração (ADR 0002).
// Adaptado na Refatoração 1 (PostgreSQL): o banco de teste deixa de ser `:memory:`
// e passa a ser o banco `pratocheio_teste` (revisão do ADR 0001).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';

const URL_DO_DB = pathToFileURL(join(import.meta.dirname, '../src/db.js')).href;
const URL_BASE = process.env.DATABASE_URL || 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio';

function urlComBanco(nome) {
  const url = new URL(URL_BASE);
  url.pathname = `/${nome}`;
  return url.toString();
}

async function comCliente(banco, fn) {
  const cliente = new pg.Client({ connectionString: urlComBanco(banco) });
  await cliente.connect();
  try { return await fn(cliente); } finally { await cliente.end(); }
}

describe('isolamento do banco de teste', () => {
  const databaseUrlOriginal = process.env.DATABASE_URL;

  afterEach(() => {
    if (databaseUrlOriginal === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = databaseUrlOriginal;
    vi.resetModules();
  });

  // Dado que a configuração aponta DATABASE_URL para o banco real
  // Quando os testes carregam a conexão
  // Então o banco em uso continua sendo o de teste
  it('usa o banco de teste mesmo com DATABASE_URL apontando para o banco real', async () => {
    process.env.DATABASE_URL = urlComBanco('pratocheio');
    vi.resetModules();

    const db = await import('../src/db.js');

    expect(db.bancoEmUso()).toBe(db.BANCO_DE_TESTE);
  });

  // Dado que o banco em uso não é o de teste (fora do Vitest, apontando para outro banco)
  // Quando a limpeza é chamada
  // Então ela falha e nenhuma doação é apagada
  it('recusa limpar um banco que não é o de teste e não apaga nenhuma doação', async () => {
    // Um banco descartável faz o papel do "banco real": o teste nunca toca o banco
    // de desenvolvimento de quem roda a suíte.
    const bancoReal = `pratocheio_sonda_${process.pid}_${Date.now()}`;
    await comCliente('postgres', (c) => c.query(`CREATE DATABASE ${bancoReal}`));

    // Roda em outro processo, sem a variável VITEST: é o que acontece quando os
    // testes são executados por outra ferramenta ou outra configuração.
    const ambiente = { ...process.env, DATABASE_URL: urlComBanco(bancoReal) };
    delete ambiente.VITEST;

    const script = `
      const db = await import(${JSON.stringify(URL_DO_DB)});
      await db.migrar();
      await db.query("INSERT INTO doacoes (tipo, quantidade, validade) VALUES ('Pão', '5 kg', '2026-10-30')");
      let erro = null;
      try { await db.limparBanco(); } catch (e) { erro = e.message; }
      await db.encerrar();
      console.log(JSON.stringify({ erro }));
    `;

    try {
      const saida = execFileSync(
        process.execPath,
        ['--no-warnings', '--input-type=module', '-e', script],
        { env: ambiente, encoding: 'utf8' }
      );
      const { erro } = JSON.parse(saida.trim().split('\n').pop());

      expect(erro).toMatch(/limparBanco recusado/);

      // Confere direto no banco, sem passar pelo código que está sendo testado.
      const n = await comCliente(bancoReal, async (c) =>
        (await c.query('SELECT count(*)::int AS n FROM doacoes')).rows[0].n
      );
      expect(n).toBe(1);
    } finally {
      await comCliente('postgres', (c) => c.query(`DROP DATABASE IF EXISTS ${bancoReal}`));
    }
  });
});

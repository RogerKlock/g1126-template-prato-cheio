// História 4b — os testes não conseguem apagar nem alterar dados de um banco que
// não seja o de teste, seja qual for a máquina ou a configuração (ADR 0002).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
const URL_DO_DB = pathToFileURL(join(import.meta.dirname, '../src/db.js')).href;

describe('isolamento do banco de teste', () => {
  const databaseFileOriginal = process.env.DATABASE_FILE;

  afterEach(() => {
    process.env.DATABASE_FILE = databaseFileOriginal;
    vi.resetModules();
  });

  // Dado que a configuração aponta DATABASE_FILE para o banco real
  // Quando os testes carregam a conexão
  // Então o banco em uso continua sendo o de teste
  it('usa o banco de teste mesmo com DATABASE_FILE apontando para o banco real', async () => {
    process.env.DATABASE_FILE = 'dados.sqlite';
    vi.resetModules();

    const db = await import('../src/db.js');

    expect(db.bancoEmUso()).toBe(db.BANCO_DE_TESTE);
  });

  // Dado que o banco em uso não é o de teste (fora do Vitest, apontando para um arquivo)
  // Quando a limpeza é chamada
  // Então ela falha e nenhuma doação é apagada
  it('recusa limpar um banco que não é o de teste e não apaga nenhuma doação', () => {
    const arquivo = join(tmpdir(), `prato-cheio-real-${process.pid}-${Date.now()}.sqlite`);

    // Roda em outro processo, sem a variável VITEST: é o que acontece quando os
    // testes são executados por outra ferramenta ou outra configuração.
    const ambiente = { ...process.env, DATABASE_FILE: arquivo };
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

      // Confere direto no arquivo, sem passar pelo código que está sendo testado.
      const banco = new DatabaseSync(arquivo);
      const { n } = banco.prepare('SELECT count(*) AS n FROM doacoes').get();
      banco.close();
      expect(n).toBe(1);
    } finally {
      rmSync(arquivo, { force: true });
    }
  });
});

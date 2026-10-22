// Conexão com o banco. Já vem pronto — não precisa mexer agora.
//
// UNIDADE 1: SQLite, embutido no Node (módulo `node:sqlite`) — nada para instalar.
// UNIDADE 3: este arquivo será refatorado para PostgreSQL. A interface abaixo
//            (`query` devolvendo `{ rows }`) foi desenhada para que a troca fique
//            contida aqui, sem espalhar mudança pelo resto do código.
// `node:sqlite` é módulo embutido do Node 22+. Carregado via createRequire porque
// algumas ferramentas (como o Vite/Vitest) ainda não o reconhecem como embutido.
import { createRequire } from 'node:module';
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');

// O banco dos testes. Sob o Vitest é sempre este, seja qual for a configuração:
// nem DATABASE_FILE nem outro vitest.config trocam o banco dos testes pelo banco
// real (ADR 0002). Fora do Vitest vale DATABASE_FILE, e o padrão é o arquivo local.
export const BANCO_DE_TESTE = ':memory:';

function arquivoDoBanco() {
  if (process.env.VITEST) return BANCO_DE_TESTE;
  return process.env.DATABASE_FILE || 'dados.sqlite';
}

let db;
let arquivoAberto;

export function conexao() {
  if (!db) {
    arquivoAberto = arquivoDoBanco();
    db = new DatabaseSync(arquivoAberto);
  }
  return db;
}

/** Qual banco esta conexão usa (ou usaria, se ainda não foi aberta). */
export function bancoEmUso() {
  return arquivoAberto ?? arquivoDoBanco();
}

/**
 * Executa uma consulta e devolve { rows }.
 * Use `?` como marcador de parâmetro (evita injeção de SQL):
 *   query('SELECT * FROM doacoes WHERE id = ?', [id])
 */
export async function query(sql, valores = []) {
  const stmt = conexao().prepare(sql);
  const ehLeitura = /^\s*(select|with)/i.test(sql) || /returning/i.test(sql);
  if (ehLeitura) return { rows: stmt.all(...valores) };
  const info = stmt.run(...valores);
  return { rows: [], alteradas: info.changes };
}

/** Cria o schema, se ainda não existir. Rodado por `npm run db:migrar` e ao subir o servidor. */
export async function migrar() {
  conexao().exec(`
    CREATE TABLE IF NOT EXISTS doacoes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo        TEXT NOT NULL,
      quantidade  TEXT NOT NULL,
      validade    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'disponivel',
      ong         TEXT,
      criada_em   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Apaga todos os dados. Usado pelos testes.
 * Recusa, antes de apagar qualquer linha, quando o banco aberto não é o de teste:
 * foi assim que o piloto perdeu as doações reais (ADR 0002).
 */
export async function limparBanco() {
  conexao();
  if (arquivoAberto !== BANCO_DE_TESTE) {
    throw new Error(
      `limparBanco recusado: o banco em uso é "${arquivoAberto}", não o banco de teste (${BANCO_DE_TESTE})`
    );
  }
  conexao().exec('DELETE FROM doacoes');
}

export async function encerrar() {
  if (db) { db.close(); db = undefined; }
}

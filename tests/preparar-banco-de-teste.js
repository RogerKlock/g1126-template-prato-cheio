// Roda uma vez antes da suíte (globalSetup do Vitest): garante que o banco de
// teste existe no servidor da DATABASE_URL. Nunca toca o banco real — só se
// conecta ao banco de manutenção `postgres` para criar o de teste.
import pg from 'pg';
import { BANCO_DE_TESTE } from '../src/db.js';

export default async function prepararBancoDeTeste() {
  const url = new URL(process.env.DATABASE_URL || 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio');
  url.pathname = '/postgres';
  const cliente = new pg.Client({ connectionString: url.toString() });
  await cliente.connect();
  try {
    const { rowCount } = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [BANCO_DE_TESTE]);
    if (rowCount === 0) await cliente.query(`CREATE DATABASE ${BANCO_DE_TESTE}`);
  } finally {
    await cliente.end();
  }
}

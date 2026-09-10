// Camada de dados do Prato Cheio — acesso ao banco.
// A conexão e o schema já estão prontos em src/db.js.
//
// Marcador de parâmetro é `?` (SQL parametrizado evita injeção):
//   const { rows } = await query('SELECT * FROM doacoes WHERE id = ?', [id]);
import { query } from './db.js';

export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade)
     VALUES (?, ?, ?)
     RETURNING *`,
    [tipo, quantidade, validade]
  );
  return rows[0];
}

export async function listarDisponiveis() {
  const { rows } = await query(
    `SELECT * FROM doacoes
     WHERE status = 'disponivel'
     ORDER BY criada_em, id`
  );
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await query('SELECT * FROM doacoes WHERE id = ?', [id]);
  return rows[0];
}

// O `AND status = 'disponivel'` é a trava: o próprio UPDATE só altera a linha
// se ela ainda estiver disponível. Se duas ONGs aceitarem ao mesmo tempo, a
// segunda não encontra linha para alterar e recebe `undefined` — a decisão é
// do banco, não de um `if` que pode rodar entre a leitura e a escrita.
export async function aceitar(id, ong) {
  const { rows } = await query(
    `UPDATE doacoes
     SET status = 'aceita', ong = ?
     WHERE id = ? AND status = 'disponivel'
     RETURNING *`,
    [ong, id]
  );
  return rows[0];
}

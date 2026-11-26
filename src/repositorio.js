// Camada de dados do Prato Cheio — acesso ao banco.
// A conexão e o schema já estão prontos em src/db.js.
//
// Marcador de parâmetro é `$1, $2…` (PostgreSQL; SQL parametrizado evita injeção):
//   const { rows } = await query('SELECT * FROM doacoes WHERE id = $1', [id]);
import { query } from './db.js';

export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade)
     VALUES ($1, $2, $3)
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

export async function listarAceitas() {
  const { rows } = await query(
    `SELECT * FROM doacoes
     WHERE status = 'aceita'
     ORDER BY validade, id`
  );
  return rows;
}

export async function buscarPorId(id) {
  const { rows } = await query('SELECT * FROM doacoes WHERE id = $1', [id]);
  return rows[0];
}

// O `AND status = 'disponivel'` é a trava: o próprio UPDATE só altera a linha
// se ela ainda estiver disponível. Se duas ONGs aceitarem ao mesmo tempo, a
// segunda não encontra linha para alterar e recebe `undefined` — a decisão é
// do banco, não de um `if` que pode rodar entre a leitura e a escrita.
export async function aceitar(id, ong) {
  const { rows } = await query(
    `UPDATE doacoes
     SET status = 'aceita', ong = $1, aceita_em = now()
     WHERE id = $2 AND status = 'disponivel'
     RETURNING *`,
    [ong, id]
  );
  return rows[0];
}

// Mesma trava do aceite: só sai de 'aceita' para 'coletada'. Se o celular do
// voluntário reenviar a requisição, a segunda não encontra linha e nada muda.
export async function marcarColetada(id) {
  const { rows } = await query(
    `UPDATE doacoes
     SET status = 'coletada', coletada_em = now()
     WHERE id = $1 AND status = 'aceita'
     RETURNING *`,
    [id]
  );
  return rows[0];
}

// Só uma doação ainda disponível pode ser cancelada. Se uma ONG aceitar no
// mesmo instante, quem chegar primeiro ao banco ganha e o outro não altera nada.
export async function cancelar(id) {
  const { rows } = await query(
    `UPDATE doacoes
     SET status = 'cancelada'
     WHERE id = $1 AND status = 'disponivel'
     RETURNING *`,
    [id]
  );
  return rows[0];
}

// Datas são gravadas como timestamptz (`now()`); o mês é contado no fuso da
// sessão, que o src/db.js iguala ao da máquina do piloto — o mês que a Marta enxerga.
export async function contarAceitasNoMes(mes) {
  const { rows } = await query(
    `SELECT count(*) AS aceitas FROM doacoes
     WHERE aceita_em IS NOT NULL
       AND to_char(aceita_em, 'YYYY-MM') = $1`,
    [mes]
  );
  return rows[0].aceitas;
}

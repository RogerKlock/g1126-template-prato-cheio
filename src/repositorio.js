// Camada de dados do Prato Cheio — acesso ao banco.
// A conexão e o schema já estão prontos em src/db.js.
//
// Marcador de parâmetro é `$1, $2…` (PostgreSQL; SQL parametrizado evita injeção):
//   const { rows } = await query('SELECT * FROM doacoes WHERE id = $1', [id]);
import { query } from './db.js';

export async function inserir({ doador, tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (doador, tipo, quantidade, validade)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [doador, tipo, quantidade, validade]
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

// H1: todas as doações de um doador, em qualquer situação, as mais novas primeiro.
// O nome é comparado sem diferenciar maiúsculas; doações sem doador (anteriores
// a H1) nunca casam com nenhum nome (D8).
export async function listarDoDoador(doador) {
  const { rows } = await query(
    // O nome do voluntário fica de fora: é dado pessoal que o doador não vê (D9).
    `SELECT id, doador, tipo, quantidade, validade, status, ong,
            criada_em, aceita_em, coletada_em
     FROM doacoes
     WHERE lower(doador) = lower($1)
     ORDER BY criada_em DESC, id DESC`,
    [doador]
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
export async function marcarColetada(id, voluntario) {
  const { rows } = await query(
    `UPDATE doacoes
     SET status = 'coletada', coletada_em = now(), voluntario = $2
     WHERE id = $1 AND status = 'aceita'
     RETURNING *`,
    [id, voluntario]
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

// H3: só sai de 'aceita' para 'disponivel', só pela ONG que aceitou (CA3), e a
// doação volta sem ONG e sem data de aceite. O registro da devolução entra no mesmo comando: ou as duas coisas
// acontecem, ou nenhuma.
export async function devolver(id, ong, motivo) {
  const { rows } = await query(
    `WITH devolvida AS (
       UPDATE doacoes
       SET status = 'disponivel', ong = NULL, aceita_em = NULL
       WHERE id = $1 AND status = 'aceita' AND lower(ong) = lower($2)
       RETURNING *
     ), registro AS (
       INSERT INTO devolucoes (doacao_id, ong, motivo)
       SELECT id, $2, $3 FROM devolvida
     )
     SELECT * FROM devolvida`,
    [id, ong, motivo]
  );
  return rows[0];
}

// H4: o resultado de um mês, contando cada doação no mês em que foi PUBLICADA
// (D11), no fuso da sessão (o do piloto — ver src/db.js).
// count(*) volta como bigint e round() como numeric: o src/db.js os entrega como
// número. Sem coletas, avg() é NULL, e NULL continua null.
export async function resultadoDoMes(mes) {
  const { rows } = await query(
    `SELECT
       count(*) AS publicadas,
       count(*) FILTER (WHERE status IN ('aceita', 'coletada')) AS aceitas,
       count(*) FILTER (WHERE status = 'coletada') AS coletadas,
       (SELECT count(*) FROM devolucoes v
          JOIN doacoes d ON d.id = v.doacao_id
         WHERE to_char(d.criada_em, 'YYYY-MM') = $1) AS devolvidas,
       round(
         avg(extract(epoch FROM coletada_em - criada_em)) FILTER (WHERE status = 'coletada') / 3600,
         1
       ) AS tempo_medio_horas,
       round(
         avg(extract(epoch FROM coletada_em - criada_em)) FILTER (WHERE status = 'coletada') / 60
       ) AS tempo_medio_minutos
     FROM doacoes
     WHERE to_char(criada_em, 'YYYY-MM') = $1`,
    [mes]
  );
  return rows[0];
}

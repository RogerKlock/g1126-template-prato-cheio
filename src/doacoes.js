// Regras de negócio das doações.
import * as repo from './repositorio.js';

const CAMPOS_OBRIGATORIOS = ['doador', 'tipo', 'quantidade', 'validade'];

// História zero — "um doador publica uma doação".
// Critério: tipo, quantidade e validade são obrigatórios.
// H1 (CA3): o doador também é — sem ele, ninguém consegue acompanhar a doação.
export async function criarDoacao({ doador, tipo, quantidade, validade }) {
  const doacao = { doador: normalizarDoador(doador), tipo, quantidade, validade };

  const faltando = CAMPOS_OBRIGATORIOS.filter(
    (campo) => String(doacao[campo] ?? '').trim() === ''
  );
  if (faltando.length > 0) {
    throw new Error(`campos obrigatórios ausentes: ${faltando.join(', ')}`);
  }

  return repo.inserir(doacao);
}

// História zero — "uma ONG vê as doações disponíveis".
export async function listarDisponiveis() {
  return repo.listarDisponiveis();
}

// História zero — "uma ONG aceita uma doação".
// Regra do caso: uma doação aceita não fica disponível para outra ONG.
export async function aceitar(id, ong) {
  return aplicarTransicao(id, {
    escrever: () => repo.aceitar(id, ong),
    recusa: (atual) =>
      atual.status === 'cancelada'
        ? 'doação foi cancelada pelo doador'
        : `doação já foi aceita por ${atual.ong ?? 'outra ONG'}`,
  });
}

// H1 — "o doador acompanha as suas doações".
// O doador se identifica pelo nome digitado (D8): sem login, o nome é a chave.
export async function doacoesDoDoador(doador) {
  const nome = normalizarDoador(doador);
  if (!nome) {
    throw new Error('informe o doador para ver as suas doações');
  }
  return repo.listarDoDoador(nome);
}

// Espaços nas pontas e espaços repetidos não criam outro doador.
function normalizarDoador(doador) {
  return String(doador ?? '').trim().replace(/\s+/g, ' ');
}

// "O voluntário vê as doações aceitas que precisa buscar."
export async function listarAceitas() {
  return repo.listarAceitas();
}

// H2 — "o voluntário confirma a coleta".
// Só uma doação aceita pode ser coletada; repetir a ação não muda o registro (D9).
// O nome do voluntário é obrigatório: a ONG e a vigilância precisam saber quem buscou (R5).
export async function marcarColetada(id, voluntario) {
  const nome = String(voluntario ?? '').trim();
  if (!nome) {
    throw new Error('informe o nome do voluntário que buscou a doação');
  }

  return aplicarTransicao(id, {
    escrever: () => repo.marcarColetada(id, nome),
    recusa: (atual) =>
      atual.status === 'coletada'
        ? 'doação já foi coletada'
        : `doação não pode ser coletada: está ${atual.status}`,
  });
}

// "O doador cancela uma doação ainda disponível."
// Depois do aceite, a ONG já conta com a comida: cancelar deixa de ser permitido.
export async function cancelar(id) {
  return aplicarTransicao(id, {
    escrever: () => repo.cancelar(id),
    recusa: (atual) => `doação não pode ser cancelada: está ${atual.status}`,
  });
}

// H3 — "a ONG devolve uma doação aceita".
// A doação volta para a lista de disponíveis, sem ONG; o motivo fica registrado.
// Só a ONG que aceitou pode devolver (CA3), e o motivo é obrigatório (D10).
export async function devolver(id, ong, motivo) {
  const quem = String(ong ?? '').trim();
  const porque = String(motivo ?? '').trim();
  if (!porque) {
    throw new Error('informe o motivo da devolução');
  }

  return aplicarTransicao(id, {
    escrever: () => repo.devolver(id, quem, porque),
    recusa: (atual) =>
      atual.status === 'aceita'
        ? `doação foi aceita por ${atual.ong}; só ${atual.ong} pode devolvê-la`
        : `doação não pode ser devolvida: está ${atual.status}`,
  });
}

// Refatoração 2 — o começo comum de toda mudança de situação (D7).
// Toda transição faz o mesmo: buscar a doação, recusar se ela não existe e
// tentar a escrita condicional, que só altera a linha se a doação ainda estiver
// na situação de origem (o banco decide — D1). Se a escrita não alterou nada,
// a transição não é permitida: relê a doação, porque a situação pode ter mudado
// entre a leitura e a escrita, e recusa com a mensagem própria da operação.
//   escrever(doacao) → a doação alterada, ou undefined se a transição foi recusada
//   recusa(atual)    → a mensagem de erro, a partir da situação atual
async function aplicarTransicao(id, { escrever, recusa }) {
  const doacao = await repo.buscarPorId(id);
  if (!doacao) {
    throw new Error('doação não encontrada');
  }

  const alterada = await escrever(doacao);
  if (alterada) return alterada;

  const atual = (await repo.buscarPorId(id)) ?? doacao;
  throw new Error(recusa(atual));
}

// "A Marta vê quantas doações foram aceitas no mês."
// Conta toda doação aceita no mês, mesmo que já tenha sido coletada depois.
export async function aceitasNoMes(mes = mesAtual()) {
  validarMes(mes);
  return { mes, aceitas: await repo.contarAceitasNoMes(mes) };
}

// H4 — "a Marta vê o resultado do mês".
// Cada doação conta no mês em que foi publicada (D11). O tempo médio vai da
// publicação até a coleta, em horas com uma casa decimal; sem coletas no mês,
// ele não é zero: é "sem coletas no mês".
export async function resultadoDoMes(mes = mesAtual()) {
  validarMes(mes);
  const r = await repo.resultadoDoMes(mes);
  const horas = r.tempo_medio_horas;
  return {
    mes,
    publicadas: r.publicadas,
    aceitas: r.aceitas,
    coletadas: r.coletadas,
    devolvidas: r.devolvidas,
    tempoMedioAteColetaHoras: horas,
    tempoMedioAteColeta:
      horas === null ? 'sem coletas no mês' : `${String(horas).replace('.', ',')} h`,
  };
}

function validarMes(mes) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    throw new Error('mês inválido: use o formato AAAA-MM');
  }
}

function mesAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

// Regras de negócio das doações.
import * as repo from './repositorio.js';

const CAMPOS_OBRIGATORIOS = ['tipo', 'quantidade', 'validade'];

// História zero — "um doador publica uma doação".
// Critério: tipo, quantidade e validade são obrigatórios.
export async function criarDoacao({ tipo, quantidade, validade }) {
  const doacao = { tipo, quantidade, validade };

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
  const doacao = await repo.buscarPorId(id);
  if (!doacao) {
    throw new Error('doação não encontrada');
  }

  // `repo.aceitar` devolve undefined quando a doação deixou de estar
  // disponível entre esta verificação e a escrita.
  const aceita = await repo.aceitar(id, ong);
  if (!aceita) {
    // Relê: a situação pode ter mudado entre a leitura acima e a escrita.
    const atual = await repo.buscarPorId(id);
    if (atual.status === 'cancelada') {
      throw new Error('doação foi cancelada pelo doador');
    }
    throw new Error(`doação já foi aceita por ${atual.ong ?? 'outra ONG'}`);
  }

  return aceita;
}

// "O voluntário vê as doações aceitas que precisa buscar."
export async function listarAceitas() {
  return repo.listarAceitas();
}

// "O voluntário marca a doação como coletada."
// Só uma doação aceita pode ser coletada; repetir a ação não muda o registro.
export async function marcarColetada(id) {
  const doacao = await repo.buscarPorId(id);
  if (!doacao) {
    throw new Error('doação não encontrada');
  }

  const coletada = await repo.marcarColetada(id);
  if (!coletada) {
    throw new Error(
      doacao.status === 'coletada'
        ? 'doação já foi coletada'
        : `doação não pode ser coletada: está ${doacao.status}`
    );
  }

  return coletada;
}

// "O doador cancela uma doação ainda disponível."
// Depois do aceite, a ONG já conta com a comida: cancelar deixa de ser permitido.
export async function cancelar(id) {
  const doacao = await repo.buscarPorId(id);
  if (!doacao) {
    throw new Error('doação não encontrada');
  }

  const cancelada = await repo.cancelar(id);
  if (!cancelada) {
    throw new Error(`doação não pode ser cancelada: está ${doacao.status}`);
  }

  return cancelada;
}

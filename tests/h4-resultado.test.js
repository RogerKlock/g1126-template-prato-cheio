// H4 · A Marta vê o resultado do mês.
// Como coordenadora, quero ver o resultado do mês, para mostrar aos apoiadores
// se a comida está chegando mais rápido.
//
// Datas nos testes: toda data que conta é fixada com fuso explícito (-03, o do
// piloto) por UPDATE depois de criar a doação pela API. Nenhum teste depende do
// dia em que roda nem do fuso da máquina (as datas escolhidas caem no mesmo mês
// em UTC e em America/Sao_Paulo).
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar, query } from '../src/db.js';

const app = criarApp();

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

async function publicadaEm(criadaEm) {
  const { body } = await request(app)
    .post('/api/doacoes')
    .send({ doador: 'Padaria Pão Bom', tipo: 'Pão', quantidade: '5 kg', validade: '2026-12-30' });
  await query('UPDATE doacoes SET criada_em = $2 WHERE id = $1', [body.id, criadaEm]);
  return body;
}

function aceitar(id, ong = 'Casa Esperança') {
  return request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong });
}

async function coletadaEm(id, coletadaEm) {
  await request(app).post(`/api/doacoes/${id}/coletar`).send({ voluntario: 'Rui' });
  await query('UPDATE doacoes SET coletada_em = $2 WHERE id = $1', [id, coletadaEm]);
}

function resultado(mes) {
  return request(app).get('/api/indicadores/resultado-do-mes').query({ mes });
}

describe('H4 · a Marta vê o resultado do mês', () => {
  // CA1. Dado que, em novembro, 3 doações foram publicadas, 2 aceitas e 1 coletada
  // 5 horas depois de publicada, quando a Marta consulta o resultado de novembro,
  // então vê 3 publicadas, 2 aceitas, 1 coletada e tempo médio até a coleta: 5 h.
  it('mostra publicadas, aceitas, coletadas e o tempo médio até a coleta do mês', async () => {
    const a = await publicadaEm('2026-11-10 08:00:00-03');
    const b = await publicadaEm('2026-11-12 09:00:00-03');
    await publicadaEm('2026-11-20 10:00:00-03');
    await aceitar(a.id);
    await aceitar(b.id);
    await coletadaEm(a.id, '2026-11-10 13:00:00-03');

    const res = await resultado('2026-11');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      mes: '2026-11',
      publicadas: 3,
      aceitas: 2,
      coletadas: 1,
      devolvidas: 0,
      tempoMedioAteColetaHoras: 5,
      tempoMedioAteColeta: '5 h',
    });
  });

  // CA2. Dado um mês sem nenhuma coleta, quando a Marta consulta o resultado,
  // então o tempo médio aparece como "sem coletas no mês" — não como zero, nem como erro.
  it('mostra "sem coletas no mês" quando nenhuma doação do mês foi coletada', async () => {
    const a = await publicadaEm('2026-11-05 08:00:00-03');
    await aceitar(a.id);

    const res = await resultado('2026-11');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      publicadas: 1,
      aceitas: 1,
      coletadas: 0,
      tempoMedioAteColetaHoras: null,
      tempoMedioAteColeta: 'sem coletas no mês',
    });
  });

  // CA3. Dado uma doação publicada em 31/10 e coletada em 01/11, quando a Marta
  // consulta novembro, então ela conta no mês da PUBLICAÇÃO (outubro) — decisão D11.
  it('a doação que atravessa a virada do mês conta no mês em que foi publicada', async () => {
    const virada = await publicadaEm('2026-10-31 18:00:00-03');
    await aceitar(virada.id);
    await coletadaEm(virada.id, '2026-11-01 09:00:00-03');

    const novembro = await resultado('2026-11');
    const outubro = await resultado('2026-10');

    expect(novembro.body).toMatchObject({ publicadas: 0, coletadas: 0, tempoMedioAteColeta: 'sem coletas no mês' });
    expect(outubro.body).toMatchObject({ publicadas: 1, coletadas: 1, tempoMedioAteColetaHoras: 15, tempoMedioAteColeta: '15 h' });
  });

  // Decisão do grupo (D11): horas com uma casa decimal, arredondadas.
  // Coletas de 1 h e de 1 h 40 min → média 1 h 20 min = 1,33… h → 1,3 h.
  it('arredonda o tempo médio para uma casa decimal, em horas', async () => {
    const a = await publicadaEm('2026-11-03 08:00:00-03');
    const b = await publicadaEm('2026-11-04 08:00:00-03');
    await aceitar(a.id);
    await aceitar(b.id);
    await coletadaEm(a.id, '2026-11-03 09:00:00-03');
    await coletadaEm(b.id, '2026-11-04 09:40:00-03');

    const res = await resultado('2026-11');

    expect(res.body).toMatchObject({ coletadas: 2, tempoMedioAteColetaHoras: 1.3, tempoMedioAteColeta: '1,3 h' });
  });

  // Decisão do grupo (D11): abaixo de 1 h, o tempo aparece em minutos — "0 h"
  // pareceria que nada foi coletado (achado na demo, ver Uso de IA).
  it('mostra o tempo médio em minutos quando ele fica abaixo de 1 hora', async () => {
    const a = await publicadaEm('2026-11-07 08:00:00-03');
    await aceitar(a.id);
    await coletadaEm(a.id, '2026-11-07 08:40:00-03');

    const res = await resultado('2026-11');

    expect(res.body).toMatchObject({ coletadas: 1, tempoMedioAteColetaHoras: 0.7, tempoMedioAteColeta: '40 min' });
  });

  // Decisão do grupo (D11): a doação devolvida (H3) e não aceita de novo não conta
  // como aceita; a devolução aparece no número de devolvidas.
  it('a devolvida não conta como aceita e entra nas devolvidas', async () => {
    const a = await publicadaEm('2026-11-06 08:00:00-03');
    await aceitar(a.id);
    await request(app).post(`/api/doacoes/${a.id}/devolver`).send({ ong: 'Casa Esperança', motivo: 'sem voluntário hoje' });

    const res = await resultado('2026-11');

    expect(res.body).toMatchObject({ publicadas: 1, aceitas: 0, devolvidas: 1 });
  });

  // Erro: mês fora do formato.
  it('recusa o resultado de um mês fora do formato AAAA-MM', async () => {
    const res = await resultado('11/2026');

    expect(res.status).toBe(400);
    expect(res.body.erro).toMatch(/AAAA-MM/);
  });

  // Tipos do banco: o PostgreSQL devolve count(*) como bigint, que o driver
  // entrega como texto ("3"). Se o conserto do src/db.js sumir, este teste
  // e o CA1 (toEqual com 3, não "3") ficam vermelhos.
  it('a contagem do banco chega como número, não como texto', async () => {
    const { rows } = await query('SELECT count(*) AS n, round(1.25, 1) AS media FROM doacoes');

    expect(rows[0]).toEqual({ n: 0, media: 1.3 });
  });
});

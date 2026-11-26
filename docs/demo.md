# Roteiro da demo — Prato Cheio

*Trabalho 3 · 3 minutos · outra pessoa precisa conseguir reproduzir só lendo isto*

## Antes de começar

```bash
docker compose up -d
cp .env.example .env
npm install
npm start
```

Abra `http://<ip-do-computador>:3000` **no navegador do celular** (mesma rede Wi-Fi;
o IP aparece em Ajustes de rede do computador). Comece com o banco vazio:
`docker compose down -v && docker compose up -d` antes de `npm start`.

## Roteiro (3 minutos)

| Tempo | O que mostrar | Passos | O que se prova |
|---|---|---|---|
| 0:00–0:20 | O problema em uma frase | — | por que o produto existe |
| 0:20–1:50 | A vida de uma doação | 1 a 4 | publicada → aceita → coletada, e uma devolvida |
| 1:50–2:30 | Um caso de erro tratado | 5 | o limite foi pensado |
| 2:30–3:00 | O resultado do mês e o que falta | 6 e 7 | o objetivo de impacto vira número; vocês sabem onde estão |

**O problema em uma frase:** depois que uma ONG aceita uma doação, ninguém sabia se a
comida foi buscada — e a Marta não tinha como mostrar se ela chega mais rápido.

## Passo a passo reproduzível

### Passo 1 — H1 · O doador publica e acompanha as suas doações
1. **Ação:** em *Publicar doação*, digite `Padaria Pão Bom` no campo do doador,
   `Pão` em tipo, `5 kg` em quantidade, uma data de amanhã em validade, e toque **Publicar**.
   Repita com tipo `Bolo`.
2. **Resultado esperado:** em *Minhas doações* aparecem `Bolo` e `Pão`, os dois com
   **"disponível — aguardando uma ONG"**; os dois também aparecem em *Doações disponíveis*.
3. **Ação:** apague o nome do doador e digite `Mercado Bom Preço` (toque fora do campo).
4. **Resultado esperado:** *Minhas doações* mostra **"Você ainda não publicou doações com este nome."**
   Volte o nome para `Padaria Pão Bom`.

### Passo 2 — A ONG aceita
1. **Ação:** em *Doações disponíveis*, digite `Casa Esperança` no campo da ONG e toque **Aceitar**
   no item `Bolo` e depois no item `Pão`.
2. **Resultado esperado:** `Bolo` e `Pão` saem de *Doações disponíveis* e aparecem em
   *Aceitas — aguardando coleta*; em *Minhas doações*, os dois passam a
   **"aceita por Casa Esperança — aguardando coleta"**.

### Passo 3 — H2 · O voluntário confirma a coleta
1. **Ação:** em *Aceitas — aguardando coleta*, digite `Rui` no campo do voluntário e toque
   **Confirmar coleta** no item `Bolo`.
2. **Resultado esperado:** `Bolo` sai de *Aceitas*; em *Minhas doações* aparece **"coletada por Casa Esperança"**
   (o nome do voluntário não aparece para o doador — D9).

### Passo 4 — H3 · A ONG devolve uma doação aceita
1. **Ação:** em *Aceitas — aguardando coleta*, no item `Pão`, toque **Devolver (ONG)** e confirme o
   motivo `sem voluntário hoje`.
2. **Resultado esperado:** `Pão` sai de *Aceitas* e **volta para *Doações disponíveis***, com os
   botões **Aceitar** e **Cancelar**; em *Minhas doações* volta a **"disponível — aguardando uma ONG"**.

### Passo 5 — Um caso de erro: outra ONG tenta devolver
1. **Ação:** com `Casa Esperança` no campo da ONG, toque **Aceitar** no `Pão` de novo. Troque o campo
   da ONG para `Lar Esperança` e toque **Devolver (ONG)** no `Pão`, em *Aceitas*.
2. **Resultado esperado:** aparece o aviso **"doação foi aceita por Casa Esperança; só Casa Esperança
   pode devolvê-la"**, e o `Pão` continua em *Aceitas*, no nome da Casa Esperança.

### Passo 6 — H4 · A Marta vê o resultado do mês
1. **Ação:** no topo, em *Resultado do mês (coordenação)*, deixe o mês atual.
2. **Resultado esperado:** **Publicadas: 2 · Aceitas: 2 · Coletadas: 1 · Devolvidas: 1** — o `Bolo`
   (coletado) e o `Pão` (devolvido no passo 4 e aceito de novo no passo 5) — e *Tempo médio até a
   coleta* em minutos (ex.: `3 min`), contado da publicação do `Bolo` até a coleta.
3. **Ação:** troque o mês para o mês anterior.
4. **Resultado esperado:** **Publicadas: 0** e **Tempo médio até a coleta: sem coletas no mês** — não `0`.

### Passo 7 — O que falta (fala, 30 s)
Ler `## Limitações do produto` em `docs/validacao.md`: o doador e a ONG se identificam só pelo nome
digitado (qualquer um que digite o nome vê e age), não há envio offline e a Marta não exporta o resultado.

## Testado por

Outro integrante executou este roteiro sem ajuda: **[nome]**, em **[data]**.
Se ele travou em algum passo, o roteiro está incompleto — corrija antes de entregar.

- **O que mudou depois do teste:** *(preencher)*

# Refatorações — Prato Cheio

*Trabalho 3 · uma seção por refatoração · o que importa é o motivo e a evidência*

## Refatoração 1 — Migração de SQLite para PostgreSQL

- **Motivo:** ADR 0001 — o SQLite é um arquivo numa máquina com um escritor por vez e não
  acompanha o crescimento que a Marta pede (R4); a revisão do ADR 0001 (22/10) exige ainda
  que os testes continuem sem conseguir apagar o banco real (ADR 0002, R6).
- **O que mudou:** `src/db.js` (`pg` com pool e `DATABASE_URL`; schema com `IDENTITY`,
  `TIMESTAMPTZ` e `ADD COLUMN IF NOT EXISTS`; tipos do driver consertados aqui; fuso da sessão =
  fuso da máquina; banco de teste `pratocheio_teste`, com `limparBanco()` conferindo
  `current_database()`); `src/repositorio.js` (`$1, $2…`, `now()`, `to_char`); `ci.yml`
  (`services: postgres`); `docker-compose.yml`; README. Nos `tests/`, **só a preparação** mudou.
- **O que NÃO mudou:** `src/doacoes.js` (fora do diff: `git diff main -- src/doacoes.js`
  vazio no PR da migração), `src/app.js`, as rotas, a interface e **nenhum `expect`**.
- **Evidência de que o comportamento se manteve:**
  - testes antes da mudança (SQLite, `main` em `0ce2a3b`): **19 passando** (5 arquivos) —
    CI: https://github.com/RogerKlock/g1126-template-prato-cheio/actions/runs/39832291225
  - testes depois da mudança (PostgreSQL 16): **19 passando** (5 arquivos)
  - link da execução do CI verde (PostgreSQL, PR #8): https://github.com/RogerKlock/g1126-template-prato-cheio/actions/runs/45857870069

## Refatoração 2 — Extrair `aplicarTransicao` das mudanças de situação

- **Cheiro de código atacado:** **duplicação**. Com a fatia 1 da H3, quatro operações de
  `src/doacoes.js` — `aceitar`, `marcarColetada`, `cancelar` e `devolver` — começavam do
  mesmo jeito: buscar a doação, recusar se ela não existe, tentar o `UPDATE` condicional
  e, se ele não alterou nada, montar a recusa a partir da situação. Era a terceira
  repetição de aceitar/coletar (a regra de três da Aula 12) — `devolver` entrou copiado de
  propósito, com o teste verde, no PR da fatia 1.
- **Qual dor concreta isso resolvia:** as fatias seguintes da H3 iam pôr regra numa quarta
  cópia, e as cópias já tinham divergido: só `aceitar` relia a doação antes de recusar (a correção
  da U2), e as outras montavam a mensagem com a leitura velha.
- **O que mudou:** `src/doacoes.js` ganhou `aplicarTransicao(id, { escrever, recusa })`,
  que faz o começo comum e sempre relê antes de recusar; cada operação passou a dizer só o
  que escreve e que mensagem dá. `repositorio.js`, `app.js` e os testes **não** mudaram.
  `src/doacoes.js`: 36 linhas entraram, 48 saíram.
- **Evidência (testes verdes antes e depois):**
  - antes (fatia 1 da H3, com a terceira cópia): **32 passando** — CI do PR da fatia 1:
    https://github.com/RogerKlock/g1126-template-prato-cheio/actions/runs/45859266280
  - depois (só a extração, nenhum teste alterado): **32 passando** — CI do PR da Refatoração 2
  - as fatias seguintes da H3 (CA2, CA3, motivo) já entraram usando `aplicarTransicao`.
- Revisão: https://github.com/RogerKlock/g1126-template-prato-cheio/pull/12

---

**Limitações e o que ficou de fora:**
- `src/app.js` repete `try/catch → 400` em cada rota. Não extraímos: nenhuma mudança doeu por
  isso, e um middleware mudaria o código HTTP de erros inesperados.
- Os testes repetem `publicar()` e `publicarEAceitar()` em cada arquivo. Ficou assim para
  cada arquivo ler sozinho o seu `Dado`; o custo apareceu quando o doador ficou obrigatório
  (5 arquivos de fixture mudaram) e é o próximo candidato.

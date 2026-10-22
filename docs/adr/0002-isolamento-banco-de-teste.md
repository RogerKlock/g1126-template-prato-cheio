# ADR 0002 — Os testes só tocam o banco de teste

- **Data:** 2026-10-22
- **Status:** aceito
- **Relacionado:** ADR 0001 (migração para PostgreSQL), que recebe uma `## Revisão` por causa desta decisão

## Contexto
**O que aconteceu.** O piloto já tinha doações reais. Uma pessoa da equipe da Marta rodou
os testes na máquina do piloto com a configuração apontando para o banco real, e a limpeza
dos testes apagou todas as doações. A Marta pediu que isso não possa acontecer de novo.

**O que o código permitia** (lido em `src/db.js` e `vitest.config.js`, no commit `da51365`):
- O banco vinha de `process.env.DATABASE_FILE || 'dados.sqlite'`. Quando a variável falta,
  o padrão é **o arquivo do banco real**.
- Quem define `DATABASE_FILE=:memory:` para os testes é só o `vitest.config.js`. Testamos
  (sonda em 22/10):
  - `npm test` → `:memory:` ✔
  - `DATABASE_FILE=dados.sqlite npm test` → `:memory:` ✔ (o config vence a variável)
  - `vitest --config outro.config.js`, ou o `vitest.config.js` editado → `DATABASE_FILE`
    indefinida → **`dados.sqlite`** ✘
- `limparBanco()` executava `DELETE FROM doacoes` **sem conferir qual banco estava aberto**.

Reproduzimos o incidente: com um `dados.sqlite` de 2 doações e os testes rodando com outro
arquivo de config, as 2 doações foram apagadas.

## Alternativas consideradas
1. **Só procedimento:** documentar "nunca rode testes na máquina do piloto".
   Prós: custo zero. Contras: o incidente já foi um erro humano; a regra depende de que
   todos leiam e lembrem. Não atende "não possa acontecer".
2. **O banco dos testes não pode ser trocado:** sob o Vitest (`process.env.VITEST`),
   `src/db.js` usa sempre `:memory:`, ignorando `DATABASE_FILE` e o config.
   Prós: os testes nunca abrem o arquivo real, então não apagam **nem alteram**.
   Contras: não protege se os testes forem executados fora do Vitest.
3. **A limpeza confere o banco:** `limparBanco()` recusa, antes de apagar, quando o banco
   aberto não é `:memory:`.
   Prós: vale em qualquer ferramenta e máquina; como o `beforeEach` chama a limpeza antes
   de cada teste, a suíte para antes de gravar qualquer coisa.
   Contras: sozinha, deixa os testes abrirem o banco real; o `migrar()` ainda roda nele
   (`CREATE TABLE IF NOT EXISTS`, que não muda dados).
4. **Combinar 2 e 3.**

## Decisão
**Alternativa 4: combinar 2 e 3.** A 2 cobre o caminho do incidente (outra configuração do
Vitest); a 3 cobre o que a 2 não alcança (outra ferramenta, script manual). A 1 fica
como orientação no README, mas não é a proteção.

## Consequências
- **Positivas:** a história 4b vira verificável por teste (`tests/banco-teste.test.js`);
  o pedido da Marta passa a valer em qualquer máquina, sem depender de quem roda.
- **Negativas / o que abrimos mão:**
  - Não é mais possível rodar a suíte contra um arquivo SQLite para inspecionar os dados
    depois. **Quem paga:** o grupo, ao depurar.
  - A guarda depende de o banco de teste ser `:memory:`. Na U3 (PostgreSQL) não há
    `:memory:`; a regra terá de ser reescrita (banco de teste com nome próprio).
    **Quem paga:** o grupo na U3; registrado na revisão do ADR 0001.
- **Riscos e o que fazer se der errado:**
  - Alguém chamar `limparBanco()` fora dos testes: a recusa também vale ali.
  - Alguém remover a guarda: os dois testes de `tests/banco-teste.test.js` ficam
    vermelhos e o CI bloqueia o merge (`main` protegida).

## Rastreabilidade
- **R6** (`docs/analise.md`): dados reais do piloto apagados ou alterados por operação fora
  do uso normal.
- **R5**: sem as doações, não há rastreabilidade nenhuma para a vigilância sanitária.

## Critério de validação
| O que precisa ser verdade | Como se verifica |
|---|---|
| Sob o Vitest, o banco é `:memory:` mesmo com `DATABASE_FILE` apontando para o banco real | teste `usa o banco de teste mesmo com DATABASE_FILE apontando para o banco real` |
| Fora do Vitest, num banco que não é o de teste, a limpeza falha e nenhuma doação é apagada | teste `recusa limpar um banco que não é o de teste e não apaga nenhuma doação` |
| Os testes antigos continuam passando | `npm test` verde no CI |

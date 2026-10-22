# Documento de Projeto — Prato Cheio

*Trabalho 2 · máximo 4 páginas (fora diagramas) · entrega na Aula 10*

## Decisões de projeto
Os riscos `R1`–`R6` estão em `docs/analise.md`, `## Riscos`; `CA5` é o critério de aceite 5 da história zero.

| # | Decisão | Alternativas | Requisito/risco da Análise que a motiva |
|---|---|---|---|
| D1 | Onde se garante que uma doação aceita não é aceita por outra ONG | **A) `UPDATE` condicional: o banco decide quem ganhou** ✔ · B) `doacoes.js` lê, confere num `if` e grava | Regra "aceita não fica disponível para outra" (CA5); **R2** |
| D2 | Que banco o piloto usa, e quando trocar | **A) SQLite agora, PostgreSQL em contêiner na U3** ✔ · B) ficar em SQLite · C) serviço gerenciado (ADR 0001) | Orçamento ≈ 0 e piloto em semanas; **R4** |
| D3 | Como impedir que os testes apaguem dados reais (mudança de contexto) | A) banco de teste fixo sob o Vitest · B) limpeza recusa outro banco · **A + B** ✔ (ADR 0002) | **R6** (incidente no piloto); **R5** |
| D4 | Como representar o ciclo de vida da doação | **A) `status` com transições condicionais + data por transição** ✔ · B) tabela de eventos | Objetivo "reduzir o tempo entre disponível e coletada"; **R5**, **R3** |
| D5 | Que interface o voluntário e a ONG usam | **A) uma página HTML sem framework** ✔ · B) PWA com fila offline | Restrição "navegador do celular, conexão instável"; **R3** |
| D6 | Aceites anteriores a `aceita_em` no indicador da Marta | **A) não contar e declarar o corte** ✔ · B) usar `criada_em` no lugar | Marta quer "mostrar impacto"; **R4** |

D5-B fica **adiada**: resolve R3 melhor, mas custa service worker e estratégia de conflito sem medição de quantas ações se perdem; até lá, D4 trata R3 no servidor. D6-B inventaria datas, e um número inventado não serve para a Marta mostrar impacto.

## Tabela de trade-offs (uma decisão em detalhe)
**D4 — ciclo de vida da doação.**

| Critério | A) `status` + data por transição ✔ | B) tabela de eventos |
|---|---|---|
| Medir "disponível → coletada" (objetivo de impacto) | direto: `coletada_em − criada_em` | junta dois eventos por doação |
| Rastreabilidade para a vigilância (R5) | situação atual e datas; correções sobrescrevem | histórico completo de quem fez o quê |
| Aceite duplo e reenvio (R2, R3) | um `UPDATE` condicional numa linha resolve | precisa de transação ou de restrição única nos eventos |
| Mudar o schema com dados reais no piloto | `ALTER TABLE ... ADD COLUMN`, aditivo | tabela nova + reconstruir o histórico das doações existentes |
| Risco na migração da U3 (ADR 0001) | baixo: só colunas | médio: mais tabelas e junções |

**Escolha: A.** B só ganha em rastreabilidade, e a vigilância pede hoje "o que, quanto, validade", que A guarda. **Gatilho para rever:** a vigilância exigir histórico de alterações.

## Diagramas
- Contexto: [`docs/diagramas/contexto.md`](diagramas/contexto.md)
- Dados: [`docs/diagramas/dados.md`](diagramas/dados.md)

**Divergências entre o diagrama de dados e o `src/db.js`:**
1. **`DOADOR` não existe no código.** A doação não tem dono, então "o doador vê as próprias doações" não é implementável e qualquer um que tenha o `id` pode agir sobre ela.
2. **`ONG` é texto livre (`doacoes.ong`), não entidade.** "Casa do Caminho" e "casa do caminho" contam como duas ONGs, e não há chave estrangeira.
3. **`VOLUNTARIO` não existe.** O código guarda *quando* a doação foi coletada (`coletada_em`), mas não *quem* coletou, informação que a vigilância pode pedir (R5).

## ADRs
- [ADR 0001](adr/0001-migracao-sqlite-postgresql.md) — migrar de SQLite para PostgreSQL (contêiner) na U3 · aceito · `## Revisão — 2026-10-22`: continua válido, com 3 ajustes pela mudança de contexto
- [ADR 0002](adr/0002-isolamento-banco-de-teste.md) — os testes só tocam o banco de teste (mudança de contexto) · aceito

## Requisitos não-funcionais
| Requisito | Como afeta o design |
|---|---|
| **NF1 — conexão instável.** Quando o celular do voluntário, com sinal fraco, reenvia a mesma ação, o sistema aplica a mudança uma única vez e recusa a repetição sem alterar o registro, medido pelo teste `não altera a coleta quando a ação é repetida` (a data gravada não muda). | Decide D4: toda transição é `UPDATE ... WHERE status = '<origem>'`. **Custo:** o voluntário vê "já foi coletada" em vez de sucesso e pode estranhar; o grupo escreve condição e teste por transição. |
| **NF2 — celular.** Quando uma ONG abre o Prato Cheio no navegador do celular, a página inteira tem no máximo 30 KB, sem dependência externa, medido por `wc -c public/index.html`. | Decide D5. **Custo:** o grupo escreve DOM à mão e a interface fica simples. |
| **NF3 — integridade dos dados do piloto** *(acrescentado pela mudança de contexto, etapa 4c)*. Quando alguém roda os testes em qualquer máquina, com qualquer `DATABASE_FILE` ou config do Vitest, o sistema não apaga nem altera nenhuma linha fora do banco de teste, medido pelos testes de `tests/banco-teste.test.js` e por `SELECT count(*) FROM doacoes` igual antes e depois. | Decide D3 (ADR 0002). **Custo:** o grupo perde rodar a suíte contra um arquivo para depurar, e paga na U3 a reescrita da guarda para PostgreSQL. |
| **NF4 — migração.** Quando o banco trocar para PostgreSQL (U3), todos os testes passam sem mudar nenhum `expect`, medido por `npm test` verde no CI com `DATABASE_URL` e `git diff entrega-2 -- src/doacoes.js` vazio. | Contém a troca em `db.js` e `repositorio.js` (D2). **Custo:** as regras não podem usar recurso do SQLite; paga o grupo na U3. |

## Critérios de validação do projeto
| # | Critério (sim/não) | Fonte |
|---|---|---|
| V1 | Toda decisão em `## Decisões de projeto` cita um risco `R*` ou uma regra da Análise que existe em `docs/analise.md`? | `docs/projeto.md`, `docs/analise.md` `## Riscos` |
| V2 | O último CI da `main` está verde e roda `npm test` e a verificação de saúde? | aba Actions; `.github/workflows/ci.yml` |
| V3 | Toda mudança de `status` em `src/repositorio.js` tem `WHERE ... status = '<origem>'`? | `src/repositorio.js` |
| V4 | `src/doacoes.js` não contém SQL nem importa `db.js`? (a troca de banco não chega às regras) | `src/doacoes.js` |
| V5 | **Migração:** o ADR 0001 lista, para cada coisa que precisa continuar igual, o comando ou teste que mostra isso, e exige backup antes da cópia? | `docs/adr/0001-...md`, `## Critério de validação` |
| V6 | Cada diagrama começa com Pergunta, Decisão que sustenta e Situação, tem no máximo 9 elementos e todas as setas rotuladas? | `docs/diagramas/` |
| V7 | A `main` exige PR com 1 aprovação e CI verde, inclusive para administradores? | `docs/evidencias/protecao-main.md` |
| V8 | *(etapa 4c)* `limparBanco()` lança erro antes do `DELETE` quando o banco aberto não é `:memory:`, e há teste que prova que nenhuma doação é apagada? | `src/db.js`; `tests/banco-teste.test.js` |

## Uso de IA
**Ferramenta:** Claude Code (modelo Claude Opus 5.5), em 22/10/2026, como colaboradora.

**O que veio da IA:** o rascunho de `## Decisões de projeto`, da tabela de trade-offs, dos não-funcionais e dos critérios; o ADR 0001; os dois diagramas em Mermaid; a tabela `## Riscos` de `docs/analise.md`, que estava vazia e da qual as decisões dependem para ter origem; o código e os testes das histórias 4b, coleta, cancelamento e aceitas no mês. Conferido com `npm test` e com o servidor rodando sobre um banco no schema antigo com doações (a migração aditiva não apagou nada).

**Mudança de contexto:** a IA reproduziu o incidente com uma sonda antes de propor a correção (ADR 0002, `## Contexto`). A sonda desmentiu a explicação óbvia: `DATABASE_FILE` externo **não** troca o banco; outro config troca. Os testes novos ficam vermelhos com o `db.js` antigo e verdes com o novo.

**Erro da IA corrigido:** na história do cancelamento, uma ONG que tentasse aceitar uma doação **cancelada** recebia *"já foi aceita por outra ONG"*, e o teste passava porque só conferia o status 400. Corrigido em `aceitar()`, que agora relê a situação, e o teste passou a exigir `/cancelada/`. **Por quê:** a mensagem errada manda a ONG atrás de uma "outra ONG" que não existe.

**O que o grupo mudou:** Roger revisou e aceitou as propostas da IA. Miguel revisou e aprovou o PR #1, que reúne todas as histórias, e corrigiu os integrantes no README (PR #6). O grupo manteve o nome da ferramenta nesta seção, porque o uso de IA é permitido e precisa ser declarado.

# Documento de Projeto — Prato Cheio

*Trabalho 2 · máximo 4 páginas (fora diagramas) · entrega na Aula 10*

## Decisões de projeto
Os riscos `R1`–`R6` estão em `docs/analise.md`, `## Riscos`; `CA5` é o critério de aceite 5 da história zero.

| # | Decisão | Alternativas | Requisito/risco da Análise que a motiva |
|---|---|---|---|
| D1 | Onde se garante que uma doação aceita não é aceita por outra ONG | **A) `UPDATE ... WHERE status = 'disponivel'`: o banco decide quem ganhou** ✔ · B) `doacoes.js` lê a doação, confere o status num `if` e depois grava | Regra "aceita não fica disponível para outra" (CA5); **R2** |
| D2 | Que banco o piloto usa, e quando trocar | **A) SQLite embutido até a U2, PostgreSQL em contêiner na U3** ✔ · B) ficar em SQLite · C) PostgreSQL já, em serviço gerenciado — ADR 0001 | Orçamento ≈ 0 e piloto em semanas; **R4** |
| D3 | Como impedir que os testes apaguem ou alterem dados reais (mudança de contexto, 22/10) | A) sob o Vitest o banco é sempre `:memory:` · B) `limparBanco()` recusa banco que não é o de teste · **A + B** ✔ — ADR 0002 | **R6** (incidente no piloto); **R5** |
| D4 | Como representar o ciclo de vida da doação | **A) coluna `status` com transições condicionais e uma data por transição** ✔ · B) tabela de eventos (histórico só de inserção) | Objetivo "reduzir o tempo entre disponível e coletada"; **R5**, **R3** |
| D5 | Que interface o voluntário e a ONG usam | **A) uma página HTML sem framework, servida pelo próprio Express** ✔ · B) PWA com fila offline (service worker) | Restrição "navegador do celular, conexão instável"; **R3** |

D1 e D4 são de projeto, e não de implementação, porque mudam o que acontece quando duas pessoas agem ao mesmo tempo ou quando a rede repete uma requisição. Em D5, a alternativa B fica **adiada**: a fila offline resolve R3 melhor, mas custa um service worker, uma estratégia de conflito e testes no navegador, sem medição de quantas ações se perdem hoje. Até lá, R3 é tratado no servidor por D4 (repetir não muda nada).

## Tabela de trade-offs (uma decisão em detalhe)
**D4 — ciclo de vida da doação.**

| Critério | A) `status` + data por transição ✔ | B) tabela de eventos |
|---|---|---|
| Medir "disponível → coletada" (objetivo de impacto) | direto: `coletada_em − criada_em` | junta dois eventos por doação |
| Rastreabilidade para a vigilância (R5) | situação atual e datas; correções sobrescrevem | histórico completo de quem fez o quê |
| Aceite duplo e reenvio (R2, R3) | um `UPDATE` condicional numa linha resolve | precisa de transação ou de restrição única nos eventos |
| Mudar o schema com dados reais no piloto | `ALTER TABLE ... ADD COLUMN`, aditivo | tabela nova + reconstruir o histórico das doações existentes |
| Consulta da Marta (aceitas no mês) | um `COUNT` com `WHERE` | `COUNT` sobre eventos do tipo aceite |
| Risco na migração da U3 (ADR 0001) | baixo: só colunas | médio: mais tabelas e junções |

**Escolha: A.** B só ganha em rastreabilidade, e a vigilância pede hoje "o que, quanto, validade", que A guarda. **Gatilho para rever:** a vigilância exigir histórico de alterações.

## Diagramas
- Contexto: [`docs/diagramas/contexto.md`](diagramas/contexto.md)
- Dados: [`docs/diagramas/dados.md`](diagramas/dados.md)

**Divergências entre o diagrama de dados e o `src/db.js`:**
1. **`DOADOR` não existe no código.** A doação não tem dono, então "o doador vê as próprias doações" não é implementável e qualquer um que tenha o `id` pode agir sobre ela.
2. **`ONG` é texto livre (`doacoes.ong`), não entidade.** "Casa do Caminho" e "casa do caminho" contam como duas ONGs, e não há chave estrangeira.
3. **`VOLUNTARIO` não existe, e falta uma data de transição.** O código guarda `criada_em` e `coletada_em`, mas não quando a doação foi aceita nem quem a coletou (R5).

## ADRs
| ADR | Decisão | Status |
|---|---|---|
| [0001](adr/0001-migracao-sqlite-postgresql.md) | Migrar de SQLite para PostgreSQL (contêiner) na U3 | aceito; `## Revisão — 2026-10-22`: continua válido, com 3 ajustes pela mudança de contexto |
| [0002](adr/0002-isolamento-banco-de-teste.md) | Os testes só tocam o banco de teste (resposta à mudança de contexto) | aceito |

## Requisitos não-funcionais
| Requisito | Como afeta o design |
|---|---|
| **NF1 — conexão instável.** Quando o voluntário, com sinal fraco no celular, toca duas vezes na mesma ação (ou o navegador reenvia após um timeout), o sistema aplica a mudança uma única vez e responde à repetição com erro, sem alterar o registro, medido por um teste automatizado que envia a mesma ação duas vezes e confere que a data gravada não mudou. | Decide D4: toda transição é um `UPDATE ... WHERE status = '<origem>'`. **Custo:** o voluntário recebe "já foi coletada" em vez de sucesso silencioso e pode estranhar; o grupo escreve a condição e o teste de cada transição. |
| **NF2 — celular.** Quando uma ONG abre o Prato Cheio no navegador do celular, a página inteira (HTML + CSS + JS) tem no máximo 30 KB e nenhuma dependência externa, medido por `wc -c public/index.html` e pela aba Rede do navegador (uma única requisição de página). | Decide D5: página única sem framework nem bundler. **Custo:** o grupo escreve DOM à mão, sem componentes prontos, e a interface fica simples. |
| **NF3 — integridade dos dados do piloto** *(acrescentado pela mudança de contexto, etapa 4c)*. Quando alguém roda `npm test` em qualquer máquina, inclusive a do piloto, com qualquer `DATABASE_FILE` ou arquivo de configuração do Vitest, o sistema não apaga nem altera nenhuma linha de um banco que não seja o de teste, medido pelos dois testes de `tests/banco-teste.test.js` e, na máquina do piloto, por `SELECT count(*) FROM doacoes` igual antes e depois de rodar os testes. | Decide D3 (ADR 0002): banco de teste fixo sob o Vitest e guarda em `limparBanco()`. **Custo:** o grupo perde a opção de rodar a suíte contra um arquivo para depurar, e na U3 paga a reescrita da guarda para PostgreSQL (revisão do ADR 0001). |
| **NF4 — migração.** Quando o banco trocar para PostgreSQL (U3), todos os testes passam sem mudar nenhum `expect` e sem tocar em `src/doacoes.js`, medido por `npm test` verde no CI com `DATABASE_URL` e por `git diff entrega-2 -- src/doacoes.js` vazio. | Mantém a troca contida em `db.js` e `repositorio.js` (D2, ADR 0001). **Custo:** as regras de negócio não podem usar recurso específico do SQLite; quem paga é o grupo na U3. |

## Critérios de validação do projeto
| # | Critério (sim/não) | Fonte |
|---|---|---|
| V1 | Toda decisão em `## Decisões de projeto` cita um risco `R*` ou uma regra da Análise que existe em `docs/analise.md`? | `docs/projeto.md`, `docs/analise.md` `## Riscos` |
| V2 | O último CI da `main` está verde e roda `npm test` e a verificação de saúde? | aba Actions; `.github/workflows/ci.yml` |
| V3 | Toda mudança de `status` em `src/repositorio.js` tem `WHERE ... status = '<origem>'`? | `src/repositorio.js` |
| V4 | `src/doacoes.js` não contém SQL nem importa `db.js`? (a troca de banco não chega às regras) | `src/doacoes.js` |
| V5 | **Migração:** o ADR 0001 lista, para cada coisa que precisa continuar igual, o comando ou teste que mostra isso? | `docs/adr/0001-...md`, `## Critério de validação` |
| V6 | Cada diagrama começa com Pergunta, Decisão que sustenta e Situação, tem no máximo 9 elementos e todas as setas rotuladas? | `docs/diagramas/` |
| V7 | A `main` exige PR com 1 aprovação e CI verde, inclusive para administradores? | `docs/evidencias/protecao-main.md` |
| V8 | *(etapa 4c)* `limparBanco()` lança erro antes do `DELETE` quando o banco aberto não é `:memory:`, e há teste que prova que nenhuma doação é apagada? | `src/db.js`; `tests/banco-teste.test.js` |
| V9 | *(migração, após a revisão)* O ADR 0001 exige backup do `dados.sqlite` antes da cópia e mantém a guarda do banco de teste no PostgreSQL? | `docs/adr/0001-...md`, `## Revisão — 2026-10-22` |

## Uso de IA
**Ferramenta:** Claude Code (modelo Claude Opus 5.5), em 22/10/2026, como colaboradora.

**O que veio da IA:** o rascunho de `## Decisões de projeto`, da tabela de trade-offs, dos não-funcionais e dos critérios; o ADR 0001; os dois diagramas em Mermaid; a tabela `## Riscos` de `docs/analise.md`, que estava vazia e da qual as decisões dependem para ter origem.

**Mudança de contexto (história 4b, ADR 0002):** a IA leu `src/db.js` e `vitest.config.js`, escreveu uma sonda e reproduziu o incidente antes de propor a correção, a guarda, os testes, o ADR 0002 e a revisão do ADR 0001. A sonda **desmentiu** a explicação óbvia ("a variável `DATABASE_FILE` sobrescreveu o config"): o config vence a variável. O caminho real é outro config, ou o config editado, deixando a variável indefinida, o que leva ao padrão `dados.sqlite`. A correção foi desenhada para esse caminho. Conferido: os dois testes novos ficam **vermelhos** com o `db.js` antigo e verdes com o novo, e um `dados.sqlite` com 2 doações continua com 2 depois de `vitest --config outro.config.mjs`.

**O que o grupo mudou:** *(preencher na revisão do PR: o que foi aceito, cortado ou reescrito, e por quê).*

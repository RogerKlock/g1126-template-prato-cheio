# Organização do Trabalho 2 — responsável e revisor por etapa

Regra: responsável e revisor de uma etapa nunca são a mesma pessoa. O revisor é
quem aprova o PR correspondente.

| Etapa | O quê | PR | Responsável | Revisor |
|---|---|---|---|---|
| 0 | Organizar, CI verde, proteção da `main` | #1 | Roger Klock | Miguel David Hort |
| 1 | `## Decisões de projeto` e `## Tabela de trade-offs` | #1 | Roger Klock | Miguel David Hort |
| 2 | Diagramas de contexto e de dados | #1 | Roger Klock | Miguel David Hort |
| 3 | ADR 0001 — migração SQLite → PostgreSQL | #1 | Roger Klock | Miguel David Hort |
| 4 | Mudança de contexto: ADR 0002, história 4b, ajuste 4c | #2 (integrado via #1) | Roger Klock | Miguel David Hort |
| 5 | Não-funcionais e critérios de validação | #1 | Roger Klock | Miguel David Hort |
| 6 | Histórias novas | #3, #4, #5 (integrados via #1) | Roger Klock | Miguel David Hort |
| 7 | `## Uso de IA` | #1 | Roger Klock | Miguel David Hort |
| 8 | Conferência pelo checklist e limite de 4 páginas | #1 | Roger Klock | Miguel David Hort |
| 9 | Branch `entrega-2` | — | Roger Klock | Miguel David Hort |
| — | Integrantes no README | #6 | Miguel David Hort | Roger Klock |

Os PRs #2 a #5 foram empilhados sobre o #1 e integrados nele; a aprovação que
liberou a entrada na `main` foi a do #1, que contém todos os seus commits.

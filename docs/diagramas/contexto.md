**Pergunta:** quem troca o que com o Prato Cheio, e quem fica de fora do sistema?

**Decisão que sustenta:** D4 (ciclo de vida da doação) e D5 (uma página web para o celular) em `docs/projeto.md`.

**Situação:** retrato da `main` no commit `6a04804`; setas marcadas *(proposta)* ainda não existem no código.

# Diagrama de contexto — Prato Cheio

```mermaid
flowchart LR
  D["Doador<br/>restaurante, padaria, mercado"]
  O["ONG / cozinha comunitária"]
  V["Voluntário entregador<br/>(celular, conexão instável)"]
  M["Marta<br/>coordenadora"]
  VS["Vigilância sanitária"]
  S(("Prato Cheio<br/>(navegador do celular)"))

  D -- "publica doação: tipo, quantidade, validade" --> S
  D -- "cancela doação ainda disponível" --> S
  S -- "lista doações disponíveis" --> O
  O -- "aceita uma doação" --> S
  V -- "marca doação aceita como coletada" --> S
  S -- "aceitas no mês (proposta)" --> M
  S -- "registro: o que, quanto, validade, qual ONG (proposta)" --> VS
```

6 elementos. O banco não aparece porque é parte do sistema, não ator externo.
O WhatsApp, que hoje faz a articulação, fica fora de propósito: o piloto não se
integra a ele (restrição "sem integração").

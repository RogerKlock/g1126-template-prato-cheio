# Documento de Análise — Prato Cheio

*Trabalho 1 · máximo 4 páginas · entrega na Aula 5*

## Problema central

## Incertezas

## Stakeholders
<!-- Os cinco stakeholders do caso + pelo menos um que o caso não lista.
     Papel de tela não é stakeholder: "administrador do sistema" não entra.
     A quinta coluna é o que torna o mapa útil — linha sem consequência é
     linha decorativa. -->

| Stakeholder | Interesse | Influência | O que espera | O que muda na iteração 1 |
|---|---|---|---|---|

## Objetivos de impacto
<!-- Cada um com métrica + linha de base + direção.
     O caso não tem linha de base: "hoje desconhecida, medir desde o primeiro
     dia do piloto" é válido; em branco não é.
     Teste: existe um número que, em dezembro, diz que isso NÃO aconteceu? -->

1.
2.
3.

## Regras de negócio
<!-- Três regras que o caso usa e não enuncia. Para cada uma: origem (dita,
     praticada, imposta, derivada, ausente ou inventada), enunciado explícito e
     verificável (sujeito + condição observável + efeito) e como se verifica.
     Marcar qual é ausente e quem decide. Regra criada pelo grupo = inventada.
     Teste: dois devs diferentes leem o enunciado e implementam a mesma coisa? -->

| # | Origem | Enunciado (sujeito + condição + efeito) | Como se verifica | Quem decide |
|---|---|---|---|---|

## Conflitos de prioridade
<!-- Um conflito do caso. O critério tem de ser aplicável por outra pessoa sem
     consultar o grupo: "priorizar o usuário" é opinião, não critério. -->

- **Fala A** (em primeira pessoa, na voz do stakeholder):
- **Fala B** (em primeira pessoa, na voz do stakeholder):
- **Eixo do trade-off** (a variável em que um lado ganha na medida em que o outro perde):
- **O que cada lado perde:**
  - A perde:
  - B perde:
- **Critério que decide:**
- **Saída usada** (decidir · adiar com data · anular o eixo):
  <!-- Se foi adiar: qual a data e o que será medido até lá. -->

## Histórias de usuário
<!-- Oito linhas: as 5 histórias do Trabalho 1 + as 3 fatias da história gigante
     do Trabalho 2. Marcar a história zero com ★ na coluna #.
     - O papel vem do mapa de stakeholders (nada de "como usuário").
     - O "para" termina num objetivo de impacto ou numa perda concreta.
     - As 3 fatias precisam ser demonstráveis sozinhas.
     - A 4ª coluna é a que vale: a letra é carimbo, a ação é diagnóstico. -->

| # | História (Como… quero… para…) | INVEST: o que falha | Ação corretiva |
|---|---|---|---|

### História zero
- **Qual é:**
- **Por que ela** (uma frase, usando a regra de negócio central do caso):
- **O que ficou FORA da fatia:**
- **Por quê** (para cada exclusão — o motivo tem de ser risco ou medição;
  "é difícil" e "não deu tempo" não são motivos):

## Critérios de aceite
<!-- Estes cinco vêm da história zero e são exatamente o que
     tests/doacoes.test.js verifica hoje. Ao numerar as histórias na tabela
     acima, troquem "História zero" pelo número correspondente (#). -->

**História zero — um doador publica uma doação e uma ONG a aceita**

1. **Dado** que um doador publicou uma doação com tipo, quantidade e validade
   **Quando** uma ONG consulta as doações disponíveis
   **Então** a doação aparece na lista com status `disponivel`
   <br>→ `mostra a doação publicada na lista de disponíveis`

2. **Dado** um doador publicando uma doação
   **Quando** tipo, quantidade ou validade está em branco
   **Então** a publicação é recusada, a resposta nomeia os campos que faltaram
   e nada é gravado
   <br>→ `recusa doação sem os campos obrigatórios`

3. **Dado** que existe uma doação disponível
   **Quando** uma ONG a aceita
   **Então** a doação passa a `aceita` e fica registrada no nome daquela ONG
   <br>→ `marca a doação como aceita pela ONG`

4. **Dado** que uma ONG aceitou uma doação
   **Quando** qualquer ONG consulta as doações disponíveis
   **Então** a doação aceita não aparece na lista
   <br>→ `remove a doação da lista de disponíveis depois de aceita`

5. **Dado** que uma ONG já aceitou uma doação
   **Quando** uma segunda ONG tenta aceitar a mesma doação
   **Então** a tentativa é recusada e a doação continua no nome da primeira ONG
   <br>→ `recusa aceitar uma doação que já foi aceita por outra ONG`

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|

## Hipótese e experimento

## Decisão de análise
<!-- Reservada para a Aula 4. O conflito NÃO vai aqui — vai em
     ## Conflitos de prioridade. -->

- **Problema:**
- **Alternativas:**
- **Decisão e justificativa:**
- **Riscos e limitações:**

## Uso de IA

### Walking skeleton (10/09) — assistido por IA
Ferramenta: Claude (Claude Code). Sessão registrada nos commits `eef7182` e `d990e8b`.

**O que a IA gerou:** a implementação de `src/repositorio.js` (4 funções SQL) e
`src/doacoes.js` (3 funções de regra), e a conversão dos cinco `it.todo` de
`tests/doacoes.test.js` em testes executáveis. Também a reestruturação deste
documento para o formato exigido pelas Aulas 2 e 3 — as seções seguem vazias,
o julgamento sobre o caso é do grupo.

**O que o grupo verificou:** 6 de 6 testes passando; os três passos do `ci.yml`
reproduzidos localmente (`npm ci`, `npm test`, subir a aplicação e bater em
`/api/saude`); e o fluxo completo exercitado com o servidor no ar —
publicar → listar → aceitar → sumir da lista → recusar o segundo aceite.

**Regras de negócio que a IA inventou** — nenhuma delas está no caso, e todas
precisam de ratificação (dono: a Marta, não o grupo):

| # | Regra inventada | Onde | Alternativa descartada |
|---|---|---|---|
| RI-1 | Campo em branco (string vazia) conta como campo ausente | `doacoes.js` | aceitar `""` como preenchido |
| RI-2 | Aceite é definitivo — não existe cancelar nem devolver | ausência de rota | ONG poder desistir e a doação voltar à lista |
| RI-3 | A lista de disponíveis é ordenada por data de publicação | `repositorio.js` | ordenar por **validade** — comida que vence antes aparece primeiro |

RI-3 é a mais cara: o produto é sobre comida que estraga, e ordenar pela mais
antiga publicada não é a mesma coisa que ordenar pela que vence primeiro.

**Restrições do caso que a IA descartou:** celular, conexão instável, um bairro
e orçamento perto de zero não influenciaram nada do que foi gerado. Em
particular, não há tratamento de envio offline nem de reenvio após queda de
conexão — e o caso diz que a conexão é instável.

### Histórias geradas com IA (Trabalho 3)
<!-- Pelo menos 3 histórias identificadas PELO NÚMERO (#) da tabela
     ## Histórias de usuário. Preencher quando a tabela existir. -->

**História #**
- O que a IA gerou:
- O que mudamos — e por quê:
- Regra de negócio que ela inventou / quem decide sobre ela:

**História #**
- O que a IA gerou:
- O que mudamos — e por quê:
- Regra de negócio que ela inventou / quem decide sobre ela:

**História #**
- O que a IA gerou:
- O que mudamos — e por quê:
- Regra de negócio que ela inventou / quem decide sobre ela:

**Restrições do caso que a IA descartou:**

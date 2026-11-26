# Validação — Prato Cheio

*Trabalho 3 · confronto do produto com os critérios de aceite escritos na Unidade 1 e com os critérios de H1 a H4*

Status: **atende**, **parcial**, **não atende** ou **não verificável**. A evidência é o nome do
teste (`arquivo › nome do it`), o passo do roteiro (`docs/demo.md`) ou a execução do CI.
CI de referência: aba *Actions*, job `build-e-testes`, no branch `entrega-3`.

## Critérios de aceite da Análise (Unidade 1 — `docs/analise.md`, copiados como estão)

| # | Critério de aceite | Status | Evidência |
|:--:|---|:--:|---|
| U1-1 | **Dado** que um doador publicou uma doação com tipo, quantidade e validade **Quando** uma ONG consulta as doações disponíveis **Então** a doação aparece na lista com status `disponivel` | atende | `doacoes.test.js › mostra a doação publicada na lista de disponíveis`; demo passo 1 |
| U1-2 | **Dado** um doador publicando uma doação **Quando** tipo, quantidade ou validade está em branco **Então** a publicação é recusada, a resposta nomeia os campos que faltaram e nada é gravado | atende | `doacoes.test.js › recusa doação sem os campos obrigatórios` |
| U1-3 | **Dado** que existe uma doação disponível **Quando** uma ONG a aceita **Então** a doação passa a `aceita` e fica registrada no nome daquela ONG | atende | `doacoes.test.js › marca a doação como aceita pela ONG` |
| U1-4 | **Dado** que uma ONG aceitou uma doação **Quando** qualquer ONG consulta as doações disponíveis **Então** a doação aceita não aparece na lista | atende | `doacoes.test.js › remove a doação da lista de disponíveis depois de aceita` |
| U1-5 | **Dado** que uma ONG já aceitou uma doação **Quando** uma segunda ONG tenta aceitar a mesma doação **Então** a tentativa é recusada e a doação continua no nome da primeira ONG | atende | `doacoes.test.js › recusa aceitar uma doação que já foi aceita por outra ONG` |

## Critérios das histórias do Trabalho 3

| # | Critério de aceite | Status | Evidência |
|:--:|---|:--:|---|
| H1-CA1 | Dado que a "Padaria Pão Bom" publicou duas doações e a "Casa Esperança" aceitou uma delas, quando a padaria consulta as suas doações, então vê as duas: uma *disponível* e outra *aceita por Casa Esperança* | atende | `h1-doador.test.js › o doador vê as próprias doações com a situação de cada uma`; demo passos 1 e 2 |
| H1-CA2 | Dado que outro doador publicou uma doação, quando a "Padaria Pão Bom" consulta as suas, então essa doação não aparece | atende | `h1-doador.test.js › a doação de outro doador não aparece nas doações do doador`; demo passo 1 (itens 3–4) |
| H1-CA3 | Dado que o doador não é informado na publicação, quando a doação é enviada, então ela é recusada com uma mensagem clara e nada é gravado | atende | `h1-doador.test.js › recusa publicar doação sem o doador e não grava nada` |

## Critérios que não atendem — por quê

## Mudanças de critério

## Limitações do produto

## Uso de IA

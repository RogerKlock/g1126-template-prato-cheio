# Validação — Prato Cheio

*Trabalho 3 · confronto do produto com os critérios de aceite escritos na Unidade 1 e com os critérios de H1 a H4*

Evidência: teste (`arquivo › nome do it`), passo de `docs/demo.md` ou CI (job `build-e-testes`, branch `entrega-3`).

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
| H2-CA1 | Dado que a "Casa Esperança" aceitou uma doação, quando o voluntário "Rui" confirma a coleta, então ela passa a *coletada*, com o nome do voluntário e o horário da coleta | atende | `h2-coleta.test.js › a coleta confirmada grava o voluntário e o horário`; demo passo 3 |
| H2-CA2 | Dado que a doação ainda está *disponível*, quando alguém tenta confirmar a coleta, então a confirmação é recusada com mensagem e a doação não muda | atende | `h2-coleta.test.js › recusa confirmar a coleta de uma doação ainda disponível e não a altera`; inversão de regra no PR da H2 (2 vermelhos) |
| H2-CA3 | Dado que a doação foi coletada, quando o doador consulta as suas doações (H1), então ela aparece como *coletada* | atende | `h2-coleta.test.js › o doador vê a doação coletada nas suas doações`; demo passo 3 |
| H3-CA1 | Dado que a "Casa Esperança" aceitou uma doação, quando ela a devolve com o motivo "sem voluntário hoje", então a doação volta para a lista de disponíveis, sem ONG, e o motivo fica registrado | atende | `h3-devolucao.test.js › a doação devolvida volta inteira para a lista, sem ONG, e o motivo fica registrado`; demo passo 4 |
| H3-CA2 | Dado que a doação já foi *coletada*, quando a ONG tenta devolvê-la, então a devolução é recusada com mensagem | atende | `h3-devolucao.test.js › recusa devolver uma doação já coletada` |
| H3-CA3 | Dado que a "Casa Esperança" aceitou a doação, quando **outra** ONG tenta devolvê-la, então a devolução é recusada e a doação continua aceita pela Casa Esperança | atende | `h3-devolucao.test.js › recusa a devolução feita por outra ONG e a doação continua com quem aceitou`; demo passo 5 |
| H4-CA1 | Dado que, em novembro, 3 doações foram publicadas, 2 aceitas e 1 coletada 5 horas depois de publicada, quando a Marta consulta o resultado de novembro, então vê *3 publicadas*, *2 aceitas*, *1 coletada* e *tempo médio até a coleta: 5 h* | atende | `h4-resultado.test.js › mostra publicadas, aceitas, coletadas e o tempo médio até a coleta do mês` (datas fixas: passa em qualquer dia); demo passo 6 |
| H4-CA2 | Dado um mês sem nenhuma coleta, quando a Marta consulta o resultado, então o tempo médio aparece como *sem coletas no mês* — não como zero, nem como erro | atende | `h4-resultado.test.js › mostra "sem coletas no mês" quando nenhuma doação do mês foi coletada`; demo passo 6 (itens 3–4) |
| H4-CA3 | Dado uma doação publicada em 31/10 e coletada em 01/11, quando a Marta consulta novembro, então o grupo decide em que mês ela conta — e o teste diz qual | atende | decisão D11 (mês da publicação → outubro); `h4-resultado.test.js › a doação que atravessa a virada do mês conta no mês em que foi publicada` |

## Critérios que não atendem — por quê

Nenhum critério ficou **parcial** ou **não atende**. O ponto fraco é de evidência:
**H2-CA2, H2-CA3 e H3-CA2 passavam antes do código novo** (o `UPDATE` condicional já recusava).
Para o H2-CA2, a prova de que o teste morde é a inversão de regra (2 vermelhos). Nos outros, o teste
confere a mensagem e a linha no banco, não só o 400. "No celular" foi conferido em 375×812 e pelo roteiro.

## Mudanças de critério

- **U1-2:** a publicação passou a exigir também o **doador** (H1-CA3). O critério segue valendo.
- **"Aceite é definitivo" (RI-2 da U1)** caiu com a H3: a ONG devolve. A trava do U1-5 vale enquanto a doação está aceita.
- **Coleta da U2** virou H2: agora guarda quem coletou. **H4-CA3** foi decidido na D11 (mês da publicação).

## Limitações do produto

- **Identificação sem login:** doador, ONG e voluntário são o nome digitado (D8). Quem digitar
  "Padaria Pão Bom" vê as doações dela, e quem digitar "Casa Esperança" pode devolver as doações
  dela. Serve para o piloto de um bairro, não para crescer.
- **ONG é texto livre:** "Casa Esperança" e "casa esperança" contam como a mesma ONG, mas um erro
  de digitação cria outra.
- **Sem envio offline (D5-B adiada):** com o sinal caindo, a ação se perde e o voluntário precisa
  tocar de novo (a repetição é recusada sem estragar nada, NF1).
- **Doações anteriores a H1 não têm doador** e não aparecem para ninguém em "Minhas doações" (D8).
- **O resultado do mês é só na tela.** Não há exportação, e o número de um mês ainda muda nos
  primeiros dias do mês seguinte, porque conta pela publicação (D11).

## Uso de IA

**Ferramenta:** Claude Code (Claude Opus 5.5), como colaboradora. Ela gerou código, testes e
rascunhos de cada história; o detalhe está no `## Uso de IA` de cada PR. O grupo verificou: na
**iteração 0**, 19 verdes antes e depois, sem `expect` alterado; na **H1**, testes vermelhos antes;
na **H2**, a inversão de regra; na **H3**, verde antes e depois da extração; na **H4**, o conversor
de bigint removido de propósito (10 vermelhos).

**Erros da IA que corrigimos:**
1. **"0 h" para uma coleta de 2 minutos (H4):** os testes da IA usavam só horas cheias. A demo
   mostrou o erro. Corrigido para minutos abaixo de 1 h, com um teste que ficou vermelho antes.
2. **Tipo do banco (iteração 0):** `timestamptz` chegaria como `Date` e quebraria `não altera a
   coleta quando a ação é repetida`. Consertado no `db.js`, abaixo do contrato.
3. **Testes que passam sem conferir a regra** (H2-CA2, H3-CA2): reforçados como dito acima.

**O que continua sendo do grupo:** as decisões D7 a D11, o corte das fatias, o esperado de cada
caso limite e o status de cada linha deste quadro.

# Prato Cheio

Projeto da disciplina **Análise, Projeto e Desenvolvimento Ágil**.
Conecta doadores de alimentos excedentes a ONGs, antes que a comida se perca.

> Este repositório é a base do produto que evolui nas três unidades:
> walking skeleton (U1) → incremento guiado pelo projeto (U2) → produto refatorado (U3).

## Integrantes
- Miguel David Hort — @MiguelHort
- Roger Klock — @RogerKlock

### Donos e revisores do Trabalho 3

| Iteração | História | Dono | Revisor |
|---|---|---|---|
| 0 | Base: PostgreSQL, CI, definição de pronto, estados da doação | Miguel David Hort | Roger Klock |
| 1 | H1 · O doador acompanha as suas doações | Miguel David Hort | Roger Klock |
| 2 | H2 · O voluntário confirma a coleta | Miguel David Hort | Roger Klock |
| 3 | H3 · A ONG devolve uma doação aceita + Refatoração 2 | Miguel David Hort | Roger Klock |
| 4 | H4 · A Marta vê o resultado do mês | Miguel David Hort | Roger Klock |
| F | Fechamento: clone limpo, demo testada, validação, retrospectiva | Roger Klock | Miguel David Hort |

## Como rodar

O produto roda sobre **PostgreSQL 16** (Refatoração 1, ADR 0001). Requisitos:
**Node.js 22.13 ou superior** e um PostgreSQL alcançável pela `DATABASE_URL` —
o caminho escolhido pelo grupo é o contêiner do `docker-compose.yml` (precisa de Docker).

**1. Subir o banco** (uma vez por sessão de trabalho):

```bash
docker compose up -d
```

**2. Apontar a `DATABASE_URL`** para ele. Copie o exemplo — ele já serve para o
contêiner acima; em outro servidor, troque usuário, senha, host e porta
(**nunca** coloque no repositório a senha real do piloto):

```bash
cp .env.example .env
# DATABASE_URL=postgres://pratocheio:pratocheio@localhost:5432/pratocheio
```

O `npm start` lê o `.env`; para os testes, exporte a variável no terminal
(`export DATABASE_URL=...`) ou use o valor padrão, que é o mesmo do exemplo.

**3. Os três comandos:**

```bash
npm install       # só na primeira vez
npm start         # cria/atualiza o schema e sobe em http://localhost:3000
npm test          # roda os testes (no banco pratocheio_teste, criado sozinho)
```

Outros: `npm run db:migrar` (só cria/atualiza o schema) e `npm run dev` (recarrega a cada alteração).

Os testes **nunca** usam o banco `pratocheio`: sob o Vitest o `src/db.js` troca o nome
do banco da `DATABASE_URL` por `pratocheio_teste`, e o `limparBanco()` se recusa a apagar
qualquer banco cujo `current_database()` não seja esse (ADR 0002). Os arquivos de teste
rodam um de cada vez, porque compartilham o mesmo banco.

Para abrir no celular, na mesma rede Wi-Fi: `http://<ip-do-computador>:3000`.

**Sem Docker:** qualquer PostgreSQL 16 serve. Crie o usuário e o banco `pratocheio` e aponte
a `DATABASE_URL` para ele, com a porta certa (um PostgreSQL instalado no Windows pode estar
na 5432 ou na 5433). Dois erros vistos no teste do clone limpo:
- `could not bind ... Permission denied`: a porta já está em uso por outro PostgreSQL; use outra.
- `Execution of PostgreSQL by a user with administrative permissions is not permitted`: abra o
  terminal sem "Executar como administrador".

## Definição de pronto

Uma história só está pronta quando **todos** os itens abaixo são verdade — e cada um se confere sem perguntar a ninguém:

| # | Item | Onde se confere |
|---|---|---|
| 1 | Cada critério de aceite da história tem um `it` com o nome da regra, e há pelo menos um caso limite ou de erro | `tests/` — o nome do `it` citado no PR e em `docs/validacao.md` |
| 2 | `npm test` passa sobre PostgreSQL no CI, no PR e na `main` depois do merge | aba *Actions* (job `build-e-testes`) |
| 3 | Entrou por PR revisado e aprovado por outro integrante, com a branch atualizada antes do merge | aba *Pull requests* → revisões do PR |
| 4 | O PR descreve a história, o critério de origem, as fatias e a seção `## Uso de IA` | descrição do PR |
| 5 | Regra em `src/doacoes.js`, SQL só em `src/repositorio.js` (nenhum SQL nem tipo do banco nas regras) | `git diff` do PR |
| 6 | Há um passo novo no roteiro da demo, executável no navegador do celular | `docs/demo.md` |
| 7 | A história tem a sua linha no quadro de validação, com evidência | `docs/validacao.md` |

## O banco: SQLite nas Unidades 1 e 2, PostgreSQL na Unidade 3

| Unidade | Banco | O que precisa instalar |
|---|---|---|
| 1 — Análise | SQLite (`node:sqlite`, embutido) | nada além do Node |
| 2 — Projeto | SQLite | nada |
| 3 — Construção | **PostgreSQL 16** (Refatoração 1) | Docker (`docker compose up -d`) ou outro PostgreSQL |

A troca foi decidida no **ADR 0001** e executada como a **Refatoração 1**
(`docs/refatoracoes.md`): os testes existentes provam que o comportamento se manteve,
e `src/doacoes.js` ficou fora do diff da migração, porque `query()` continua devolvendo `{ rows }`.

## Estrutura

```
src/server.js        entrypoint (npm start)
src/db.js            conexão PostgreSQL, schema e tipos do banco
src/app.js           rotas da API
src/doacoes.js       regras de negócio
src/repositorio.js   acesso ao banco (SQL)
public/index.html    interface (funciona no celular)
tests/               testes automatizados
docs/analise.md      documento de análise   (Trabalho 1)
docs/projeto.md      documento de projeto   (Trabalho 2)
docs/adr/            decisões arquiteturais (Trabalho 2)
docs/validacao.md    validação e testes     (Trabalho 3)
docs/refatoracoes.md refatorações feitas    (Trabalho 3)
docs/demo.md         roteiro da demo        (Trabalho 3)
docs/retrospectivas/ retrospectiva de cada iteração
.github/workflows/   pipeline de CI (sobre PostgreSQL)
docker-compose.yml   PostgreSQL de desenvolvimento
```

## Como trabalhar (fluxo de Pull Request)

A partir da Unidade 2, **nada entra direto na `main`**:

```bash
git checkout -b historia/ong-aceita-doacao
# ... implementa, escreve o teste, roda npm test ...
git commit -m "ONG aceita uma doação e ela sai da lista"
git push -u origin historia/ong-aceita-doacao
```

Abra o Pull Request no GitHub, preencha o template, espere o **CI ficar verde** e
peça a revisão de **outro integrante**. Só então faça o merge.

## O que já está pronto e o que falta

**Unidade 1 — walking skeleton: concluído.** A história zero funciona ponta a
ponta, sem mock em nenhuma camada:

```
public/index.html  →  src/app.js  →  src/doacoes.js  →  src/repositorio.js  →  PostgreSQL
   interface            HTTP            regras             SQL                  dados
```

Um doador publica uma doação → uma ONG vê a doação na lista → a ONG aceita →
a doação sai da lista → uma segunda ONG que tente aceitar é recusada.

Os cinco critérios de aceite estão em `tests/doacoes.test.js` (6 de 6 testes
passando) e escritos em Dado/Quando/Então em `docs/analise.md`.

**Unidade 2 — projeto + incremento.** Documento de projeto em `docs/projeto.md`,
ADRs em `docs/adr/`, diagramas em `docs/diagramas/`.

**Unidade 3 — produto evoluído + refatoração (Trabalho 3).** Produto sobre PostgreSQL
(Refatoração 1), quatro histórias e a Refatoração 2 (`docs/refatoracoes.md`):

| História | Rota |
|---|---|
| H1 · o doador acompanha as suas doações | `POST /api/doacoes` (com `doador`), `GET /api/doacoes/minhas?doador=` |
| H2 · o voluntário confirma a coleta | `POST /api/doacoes/:id/coletar` `{ voluntario }`, `GET /api/doacoes/aceitas` |
| H3 · a ONG devolve uma doação aceita | `POST /api/doacoes/:id/devolver` `{ ong, motivo }` |
| H4 · a Marta vê o resultado do mês | `GET /api/indicadores/resultado-do-mes?mes=AAAA-MM` |
| (U2) doador cancela · aceitas no mês | `POST /api/doacoes/:id/cancelar`, `GET /api/indicadores/aceitas-no-mes` |

Validação em `docs/validacao.md`, roteiro em `docs/demo.md`, retrospectiva em `docs/retrospectivas/3.md`.

## Uso de IA

A IA pode participar da produção, mas o grupo é responsável por verificar, testar,
corrigir e **defender** o resultado. Registre em cada Pull Request o que foi gerado
com IA e o que vocês alteraram.

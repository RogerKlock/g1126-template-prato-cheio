# ADR 0001 — Migrar o banco de SQLite para PostgreSQL na Unidade 3

- **Data:** 2026-10-22
- **Status:** aceito

## Contexto
O piloto roda hoje com SQLite embutido no Node (`node:sqlite`, arquivo `dados.sqlite`):
nada para instalar, o que cabe na restrição de **orçamento perto de zero** e no prazo
de **piloto em poucas semanas, um bairro só**.

**Por que migrar.** O SQLite é um arquivo único numa máquina, com um escritor por vez.
Isso basta para um bairro, mas o caso diz que a Marta quer **crescer rápido** (mais
doadores, mais ONGs) e ninguém sabe o volume real (R4). Com mais bairros vêm mais
aceites simultâneos (R2), mais de uma máquina acessando o mesmo banco e a necessidade
de backup sem parar o sistema. O PostgreSQL resolve isso: é servidor, aceita
concorrência e tem backup online. Além disso, é o banco exigido pela disciplina para a
Unidade 3.

**Por que só na Unidade 3.** (1) Hoje não há medição que justifique a troca: o volume é
desconhecido (R4), e migrar agora seria pagar um custo certo por um ganho hipotético.
(2) A migração é uma **refatoração**: o comportamento não pode mudar, e só agora existem
os testes que provam isso (`tests/`). (3) Na Unidade 2 o esforço do grupo está nas
decisões e nas histórias. A troca fica contida em `src/db.js` e no SQL de
`src/repositorio.js` porque `query()` já devolve `{ rows }`, então esperar não espalha
custo pelo código.

## Alternativas consideradas
1. **Ficar em SQLite.**
   Prós: zero instalação, zero custo, backup é copiar um arquivo.
   Contras: um escritor por vez; não funciona em pasta sincronizada nem em disco de rede;
   não serve a mais de uma máquina; não atende ao requisito da disciplina para a U3.
2. **PostgreSQL instalado direto na máquina do piloto** (instalador nativo).
   Prós: sem camada extra; desempenho nativo.
   Contras: instalação e versão diferentes em cada máquina (Windows de voluntário ×
   Linux do CI); desinstalar e atualizar é manual; o banco de teste fica no mesmo
   servidor do banco real.
3. **PostgreSQL em contêiner** (`postgres:16-alpine`, via Docker Compose).
   Prós: a mesma versão no dev, no CI (bloco `services` já previsto em `ci.yml`) e no
   piloto; subir e derrubar com um comando; banco de teste em contêiner separado.
   Contras: exige Docker (no Windows, WSL2 e virtualização habilitada), cerca de 1–2 GB
   de RAM; a equipe da Marta precisa aprender `docker compose up`.
4. **Serviço gerenciado gratuito** (Neon, Supabase, Render).
   Prós: nada para manter; backup do provedor.
   Contras: depende de internet, e o caso diz que a conexão é **instável**; o plano
   gratuito hiberna e tem limite de armazenamento; os dados de doação ficam num
   terceiro; se o plano mudar, o custo deixa de ser zero.

## Decisão
**Migrar para PostgreSQL na Unidade 3, rodando em contêiner (alternativa 3)**, com
`DATABASE_URL` como único ponto de configuração.

- Não **ficar em SQLite** (1): resolve o hoje, mas não o crescimento que a Marta pede, e
  descumpre o compromisso da U3.
- Não **instalar direto** (2): cada máquina com uma versão diferente é exatamente o tipo
  de diferença de configuração que já causa problemas (ver ADR 0002).
- Não **serviço gerenciado** (4): coloca a disponibilidade do piloto na mão da conexão
  instável e de um plano gratuito que pode mudar.

## Consequências
- **Positivas:** concorrência real nos aceites; backup sem parar o sistema; o mesmo banco
  no dev, no CI e no piloto; base para mais de um bairro.
- **Negativas / o que abrimos mão:**
  - A máquina do piloto passa a precisar de Docker e de ~1–2 GB de RAM a mais. **Quem
    paga:** a equipe da Marta, que mantém essa máquina e terá de instalar e operar
    o Docker.
  - Rodar o projeto deixa de ser "só Node". **Quem paga:** cada integrante e cada novo
    voluntário dev, com mais um passo no README.
  - Os dados reais do piloto em `dados.sqlite` precisam ser copiados para o PostgreSQL.
    **Quem paga:** o grupo, que escreve e testa o script de cópia.
  - Diferenças de SQL (`datetime('now')` → `now()`, `AUTOINCREMENT` → `GENERATED ...
    AS IDENTITY`, `?` → `$1`) precisam ser ajustadas em `db.js` e `repositorio.js`.
- **Riscos e o que fazer se der errado:**
  - Perder doações reais na cópia: fazer backup de `dados.sqlite` antes, comparar
    contagens antes e depois (ver critério de validação) e manter o arquivo SQLite
    intacto até a validação passar.
  - Docker não rodar na máquina do piloto (sem virtualização): cair para a alternativa 2
    na mesma versão (16) e registrar a revisão neste ADR.
  - Comportamento mudar sem ninguém notar: os testes existentes são o critério; nenhum
    teste pode ser alterado para "passar".

## Rastreabilidade
- **R4** (volume desconhecido, crescimento além de um bairro) — motivo da migração.
- **R2** (aceite simultâneo por duas ONGs) — a trava do `UPDATE ... WHERE status =
  'disponivel'` precisa continuar valendo no novo banco.
- Restrições do caso: **orçamento perto de zero** (descarta serviço pago) e **conexão
  instável** (descarta serviço gerenciado).

## Critério de validação
O que precisa continuar igual depois da migração, e como se mostra:

| O que continua igual | Como se verifica |
|---|---|
| Todo o comportamento coberto pelos testes (publicar, listar, aceitar, recusar segundo aceite, e as histórias da U2) | `npm test` verde no CI com o serviço `postgres` do `ci.yml` habilitado e `DATABASE_URL` definida |
| Os testes não foram reescritos para passar | `git diff entrega-2 -- tests/` mostra mudanças só em preparação do banco (setup), nunca em `expect` |
| As regras de negócio não sabem qual banco é usado | `git diff entrega-2 -- src/doacoes.js` vazio |
| Nenhuma doação real se perde na cópia | `SELECT status, count(*) FROM doacoes GROUP BY status` dá o mesmo resultado no `dados.sqlite` (antes) e no PostgreSQL (depois) |
| A aplicação sobe | passo "Verificar se a aplicação sobe" do CI (`curl --fail /api/saude`) |

**Pergunta:** que dados o piloto precisa guardar para saber o que foi doado, por quem, para quem e quando?

**Decisão que sustenta:** D4 (ciclo de vida da doação) e ADR 0001 (o mesmo modelo vai para o PostgreSQL).

**Situação:** proposta — modelo-alvo. O que existe hoje está em `src/db.js` no commit `7dcff13`; as diferenças estão em `docs/projeto.md`, `## Diagramas`.

# Diagrama de dados — Prato Cheio

```mermaid
erDiagram
  DOADOR ||--o{ DOACAO : "publica"
  ONG |o--o{ DOACAO : "aceita"
  VOLUNTARIO |o--o{ DOACAO : "coleta"

  DOADOR {
    int id PK
    text nome
    text endereco_retirada
  }
  ONG {
    int id PK
    text nome
  }
  VOLUNTARIO {
    int id PK
    text nome
  }
  DOACAO {
    int id PK
    text tipo
    text quantidade
    date validade
    text status "disponivel, aceita, coletada ou cancelada"
    datetime criada_em
    datetime aceita_em
    datetime coletada_em
    int doador_id FK
    int ong_id FK
    int voluntario_id FK
  }
```

4 entidades. Regras que o desenho carrega:
- uma doação tem no máximo uma ONG (`|o`), coerente com "aceita não fica disponível para outra";
- `status` só avança: `disponivel → aceita → coletada` ou `disponivel → cancelada`;
- cada avanço tem a sua data, para medir o tempo entre "disponível" e "coletada".

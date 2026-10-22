export default {
  test: {
    // SQLite em memória: os testes não tocam o arquivo do banco de desenvolvimento.
    // Esta linha é só documentação: o src/db.js já força o banco de teste sempre
    // que roda sob o Vitest, mesmo que este arquivo seja trocado (ADR 0002).
    env: { DATABASE_FILE: ':memory:' }
  }
};

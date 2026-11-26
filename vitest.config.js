export default {
  test: {
    // Cria o banco de teste (pratocheio_teste) no servidor da DATABASE_URL, se faltar.
    globalSetup: ['./tests/preparar-banco-de-teste.js'],
    // Todos os arquivos de teste usam o mesmo banco PostgreSQL e cada teste o limpa
    // antes de rodar: rodar arquivos em paralelo faria um apagar os dados do outro.
    fileParallelism: false,
  },
};

const express = require('express');

const produtosRoutes = require('./routes/produtosRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');
const relatoriosRoutes = require('./routes/relatoriosRoutes');

const app = express();

app.use(express.json());

// Aqui só aplicamos os prefixos. Nenhuma rota é declarada neste arquivo.
app.use('/api/produtos', produtosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// JSON malformado no corpo da requisição -> 400 em vez de erro genérico
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(erro);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Cantina ULBRA API rodando em http://localhost:${PORT}`);
});

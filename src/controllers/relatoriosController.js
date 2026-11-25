const db = require('../database/connection');

// GET /api/relatorios/vendas-por-categoria
async function vendasPorCategoria(req, res) {
  try {
    const dados = await db('pedidos')
      .join('produtos', 'pedidos.produto_id', 'produtos.id')
      .select('produtos.categoria')
      .sum({ total_vendido: 'pedidos.valor_total' })
      .sum({ quantidade_itens: 'pedidos.quantidade' })
      .count({ total_pedidos: 'pedidos.id' })
      .groupBy('produtos.categoria')
      .orderBy('total_vendido', 'desc');

    return res.status(200).json(dados);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao gerar relatório.' });
  }
}

// GET /api/relatorios/top-produtos
async function topProdutos(req, res) {
  try {
    const dados = await db('pedidos')
      .join('produtos', 'pedidos.produto_id', 'produtos.id')
      .select('produtos.id', 'produtos.nome')
      .sum({ total_vendido: 'pedidos.quantidade' })
      .groupBy('produtos.id', 'produtos.nome')
      .orderBy('total_vendido', 'desc')
      .limit(5);

    return res.status(200).json(dados);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao gerar relatório.' });
  }
}

// GET /api/relatorios/faturamento?data_inicio=2026-11-01&data_fim=2026-11-30
async function faturamento(req, res) {
  try {
    const { data_inicio, data_fim } = req.query;
    const formatoData = /^\d{4}-\d{2}-\d{2}$/;

    if (!data_inicio || !data_fim) {
      return res.status(400).json({ erro: 'Informe "data_inicio" e "data_fim" (formato AAAA-MM-DD).' });
    }
    if (!formatoData.test(data_inicio) || !formatoData.test(data_fim)) {
      return res.status(400).json({ erro: 'Datas devem estar no formato AAAA-MM-DD.' });
    }
    if (data_inicio > data_fim) {
      return res.status(400).json({ erro: '"data_inicio" não pode ser maior que "data_fim".' });
    }

    // data_fim vai até 23:59:59 para incluir o dia inteiro
    const resultado = await db('pedidos')
      .whereBetween('created_at', [`${data_inicio} 00:00:00`, `${data_fim} 23:59:59`])
      .sum({ faturamento: 'valor_total' })
      .count({ total_pedidos: 'id' })
      .first();

    return res.status(200).json({
      data_inicio,
      data_fim,
      faturamento: resultado.faturamento || 0,
      total_pedidos: Number(resultado.total_pedidos),
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao gerar relatório.' });
  }
}

module.exports = { vendasPorCategoria, topProdutos, faturamento };

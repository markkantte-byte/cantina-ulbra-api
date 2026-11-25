const db = require('../database/connection');

// Classe de erro para "abortar" a transação com um status HTTP específico
class ErroNegocio extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// GET /api/pedidos?limit=10&offset=0&aluno=ana
async function listar(req, res) {
  try {
    const limit = req.query.limit === undefined ? 10 : Number(req.query.limit);
    const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({ erro: '"limit" deve ser um inteiro entre 1 e 100.' });
    }
    if (!Number.isInteger(offset) || offset < 0) {
      return res.status(400).json({ erro: '"offset" deve ser um inteiro maior ou igual a 0.' });
    }

    const filtroAluno = (qb) => {
      if (req.query.aluno) qb.where('aluno_nome', 'like', `%${req.query.aluno}%`);
    };

    const pedidos = await db('pedidos')
      .select('id', 'aluno_nome', 'produto_id', 'quantidade', 'valor_total', 'created_at', 'updated_at')
      .modify(filtroAluno)
      .orderBy('id')
      .limit(limit)
      .offset(offset);

    const contagem = await db('pedidos').modify(filtroAluno).count({ total: '*' }).first();

    return res.status(200).json({
      total: Number(contagem.total),
      limit,
      offset,
      dados: pedidos,
    });
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao listar pedidos.' });
  }
}

// GET /api/pedidos/:id  (com JOIN para trazer o nome do produto)
async function buscar(req, res) {
  try {
    const pedido = await db('pedidos')
      .join('produtos', 'pedidos.produto_id', 'produtos.id')
      .select(
        'pedidos.id',
        'pedidos.aluno_nome',
        'pedidos.produto_id',
        'produtos.nome as produto_nome',
        'pedidos.quantidade',
        'pedidos.valor_total',
        'pedidos.created_at',
        'pedidos.updated_at'
      )
      .where('pedidos.id', req.params.id)
      .first();

    if (!pedido) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    return res.status(200).json(pedido);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao buscar pedido.' });
  }
}

// POST /api/pedidos  (R1, R2, R4 dentro de uma transação)
async function criar(req, res) {
  try {
    // R1: valor_total enviado pelo cliente é ignorado de propósito (nem lemos)
    const { aluno_nome, produto_id, quantidade } = req.body;

    if (typeof aluno_nome !== 'string' || aluno_nome.trim() === '' || aluno_nome.length > 100) {
      return res.status(400).json({ erro: 'O campo "aluno_nome" é obrigatório (até 100 caracteres).' });
    }
    if (!Number.isInteger(produto_id) || produto_id < 1) {
      return res.status(400).json({ erro: 'O campo "produto_id" é obrigatório e deve ser um inteiro.' });
    }
    if (!Number.isInteger(quantidade) || quantidade < 1) {
      return res.status(400).json({ erro: 'O campo "quantidade" é obrigatório e deve ser um inteiro maior ou igual a 1.' });
    }

    const pedidoCriado = await db.transaction(async (trx) => {
      const produto = await trx('produtos').where({ id: produto_id }).first();

      if (!produto) {
        throw new ErroNegocio(404, 'Produto não encontrado.');
      }
      // R4: produto inativo não vende
      if (!produto.ativo) {
        throw new ErroNegocio(400, 'Produto inativo: não é possível criar pedido.');
      }
      // R2: estoque precisa cobrir a quantidade
      if (produto.estoque < quantidade) {
        throw new ErroNegocio(
          409,
          `Estoque insuficiente: disponível ${produto.estoque}, solicitado ${quantidade}.`
        );
      }

      // R1: valor calculado a partir do preço que está no banco
      const valorTotal = Math.round(produto.preco * quantidade * 100) / 100;

      const [id] = await trx('pedidos').insert({
        aluno_nome: aluno_nome.trim(),
        produto_id,
        quantidade,
        valor_total: valorTotal,
      });

      // R3: debita o estoque (as duas operações são atômicas)
      await trx('produtos').where({ id: produto_id }).decrement('estoque', quantidade);

      return trx('pedidos').where({ id }).first();
    });

    return res.status(201).json(pedidoCriado);
  } catch (erro) {
    if (erro instanceof ErroNegocio) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao criar pedido.' });
  }
}

// DELETE /api/pedidos/:id  (R3: devolve o estoque, também em transação)
async function remover(req, res) {
  try {
    await db.transaction(async (trx) => {
      const pedido = await trx('pedidos').where({ id: req.params.id }).first();
      if (!pedido) {
        throw new ErroNegocio(404, 'Pedido não encontrado.');
      }

      await trx('produtos').where({ id: pedido.produto_id }).increment('estoque', pedido.quantidade);
      await trx('pedidos').where({ id: pedido.id }).del();
    });

    return res.status(204).send();
  } catch (erro) {
    if (erro instanceof ErroNegocio) {
      return res.status(erro.status).json({ erro: erro.message });
    }
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao cancelar pedido.' });
  }
}

module.exports = { listar, buscar, criar, remover };

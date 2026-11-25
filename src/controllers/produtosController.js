const db = require('../database/connection');

// Converte "true"/"false" (query string) em booleano
function parseBool(valor) {
  if (valor === 'true' || valor === '1') return true;
  if (valor === 'false' || valor === '0') return false;
  return undefined;
}

// Valida os campos de um produto. Retorna uma mensagem de erro ou null.
function validarProduto(corpo, { parcial = false } = {}) {
  const { nome, categoria, preco, estoque } = corpo;

  if (!parcial || nome !== undefined) {
    if (typeof nome !== 'string' || nome.trim() === '' || nome.length > 80) {
      return 'O campo "nome" é obrigatório (texto de até 80 caracteres).';
    }
  }
  if (!parcial || categoria !== undefined) {
    if (typeof categoria !== 'string' || categoria.trim() === '' || categoria.length > 30) {
      return 'O campo "categoria" é obrigatório (texto de até 30 caracteres).';
    }
  }
  if (!parcial || preco !== undefined) {
    if (typeof preco !== 'number' || Number.isNaN(preco) || preco < 0) {
      return 'O campo "preco" é obrigatório e deve ser um número maior ou igual a 0.';
    }
  }
  if (!parcial || estoque !== undefined) {
    if (!Number.isInteger(estoque) || estoque < 0) {
      return 'O campo "estoque" é obrigatório e deve ser um inteiro maior ou igual a 0.';
    }
  }
  if (corpo.ativo !== undefined && typeof corpo.ativo !== 'boolean') {
    return 'O campo "ativo" deve ser true ou false.';
  }
  return null;
}

// GET /api/produtos?categoria=Bebidas&ativo=true
async function listar(req, res) {
  try {
    const { categoria, ativo } = req.query;
    const query = db('produtos').select('id', 'nome', 'categoria', 'preco', 'estoque', 'ativo');

    if (categoria) query.where('categoria', categoria);

    const ativoBool = parseBool(ativo);
    if (ativo !== undefined) {
      if (ativoBool === undefined) {
        return res.status(400).json({ erro: 'O filtro "ativo" deve ser true ou false.' });
      }
      query.where('ativo', ativoBool);
    }

    const produtos = await query.orderBy('id');
    return res.status(200).json(produtos);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao listar produtos.' });
  }
}

// GET /api/produtos/:id
async function buscar(req, res) {
  try {
    const produto = await db('produtos').where({ id: req.params.id }).first();
    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }
    return res.status(200).json(produto);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao buscar produto.' });
  }
}

// POST /api/produtos
async function criar(req, res) {
  try {
    const erroValidacao = validarProduto(req.body);
    if (erroValidacao) {
      return res.status(400).json({ erro: erroValidacao });
    }

    const { nome, categoria, preco, estoque, ativo } = req.body;

    const duplicado = await db('produtos').where({ nome: nome.trim() }).first();
    if (duplicado) {
      return res.status(409).json({ erro: 'Já existe um produto com esse nome.' });
    }

    const [id] = await db('produtos').insert({
      nome: nome.trim(),
      categoria: categoria.trim(),
      preco,
      estoque,
      ativo: ativo === undefined ? true : ativo,
    });

    const criado = await db('produtos').where({ id }).first();
    return res.status(201).json(criado);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao criar produto.' });
  }
}

// PUT /api/produtos/:id
async function atualizar(req, res) {
  try {
    const { id } = req.params;

    const existente = await db('produtos').where({ id }).first();
    if (!existente) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    const erroValidacao = validarProduto(req.body, { parcial: true });
    if (erroValidacao) {
      return res.status(400).json({ erro: erroValidacao });
    }

    // Só aceita campos conhecidos (ignora qualquer lixo enviado no corpo)
    const dados = {};
    for (const campo of ['nome', 'categoria', 'preco', 'estoque', 'ativo']) {
      if (req.body[campo] !== undefined) {
        dados[campo] = typeof req.body[campo] === 'string' ? req.body[campo].trim() : req.body[campo];
      }
    }

    if (Object.keys(dados).length === 0) {
      return res.status(400).json({ erro: 'Envie ao menos um campo para atualizar.' });
    }

    if (dados.nome) {
      const duplicado = await db('produtos')
        .where({ nome: dados.nome })
        .whereNot({ id })
        .first();
      if (duplicado) {
        return res.status(409).json({ erro: 'Já existe outro produto com esse nome.' });
      }
    }

    await db('produtos').where({ id }).update(dados);
    const atualizado = await db('produtos').where({ id }).first();
    return res.status(200).json(atualizado);
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao atualizar produto.' });
  }
}

// DELETE /api/produtos/:id  (R5)
async function remover(req, res) {
  try {
    const { id } = req.params;

    const existente = await db('produtos').where({ id }).first();
    if (!existente) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    // R5: produto com histórico de pedidos não pode ser apagado
    const resultado = await db('pedidos').where({ produto_id: id }).count({ total: '*' }).first();
    if (Number(resultado.total) > 0) {
      return res.status(409).json({
        erro: 'Não é possível excluir: existem pedidos vinculados a este produto. Desative-o (ativo = false) em vez de excluir.',
      });
    }

    await db('produtos').where({ id }).del();
    return res.status(204).send();
  } catch (erro) {
    console.error(erro);
    return res.status(500).json({ erro: 'Erro interno ao excluir produto.' });
  }
}

module.exports = { listar, buscar, criar, atualizar, remover };

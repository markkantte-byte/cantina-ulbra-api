exports.seed = async function (knex) {
  // Limpa na ordem certa: primeiro a tabela filha (pedidos), depois a pai (produtos)
  await knex('pedidos').del();
  await knex('produtos').del();
  // Reinicia o contador de ids do SQLite
  await knex.raw("DELETE FROM sqlite_sequence WHERE name IN ('pedidos', 'produtos')");

  await knex('produtos').insert([
    { id: 1, nome: 'Coxinha', categoria: 'Salgados', preco: 6.5, estoque: 50, ativo: true },
    { id: 2, nome: 'Pastel de Carne', categoria: 'Salgados', preco: 7.0, estoque: 40, ativo: true },
    { id: 3, nome: 'Pão de Queijo', categoria: 'Salgados', preco: 4.5, estoque: 60, ativo: true },
    { id: 4, nome: 'Suco de Laranja', categoria: 'Bebidas', preco: 5.0, estoque: 30, ativo: true },
    { id: 5, nome: 'Refrigerante Lata', categoria: 'Bebidas', preco: 5.5, estoque: 80, ativo: true },
    { id: 6, nome: 'Café Expresso', categoria: 'Bebidas', preco: 3.5, estoque: 100, ativo: true },
    { id: 7, nome: 'Brownie', categoria: 'Doces', preco: 8.0, estoque: 20, ativo: true },
    { id: 8, nome: 'Empada de Frango', categoria: 'Salgados', preco: 6.0, estoque: 0, ativo: false },
  ]);

  // Pedidos de teste com datas diferentes (valor_total = preco * quantidade)
  await knex('pedidos').insert([
    { aluno_nome: 'Ana Souza', produto_id: 1, quantidade: 2, valor_total: 13.0, created_at: '2026-11-02 10:15:00', updated_at: '2026-11-02 10:15:00' },
    { aluno_nome: 'Bruno Lima', produto_id: 4, quantidade: 1, valor_total: 5.0, created_at: '2026-11-05 12:30:00', updated_at: '2026-11-05 12:30:00' },
    { aluno_nome: 'Carla Dias', produto_id: 7, quantidade: 3, valor_total: 24.0, created_at: '2026-11-10 14:00:00', updated_at: '2026-11-10 14:00:00' },
    { aluno_nome: 'Ana Souza', produto_id: 6, quantidade: 2, valor_total: 7.0, created_at: '2026-11-15 09:45:00', updated_at: '2026-11-15 09:45:00' },
    { aluno_nome: 'Diego Rocha', produto_id: 2, quantidade: 4, valor_total: 28.0, created_at: '2026-11-20 18:20:00', updated_at: '2026-11-20 18:20:00' },
    { aluno_nome: 'Bruno Lima', produto_id: 1, quantidade: 3, valor_total: 19.5, created_at: '2026-11-22 11:10:00', updated_at: '2026-11-22 11:10:00' },
  ]);
};

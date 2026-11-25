exports.up = function (knex) {
  return knex.schema.createTable('pedidos', (table) => {
    table.increments('id').primary();
    table.string('aluno_nome', 100).notNullable();
    table
      .integer('produto_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('produtos'); // sem onDelete: o banco bloqueia apagar produto com pedidos
    table.integer('quantidade').notNullable();
    table.decimal('valor_total', 8, 2).notNullable();
    table.timestamps(true, true); // created_at e updated_at automáticos

    table.check('?? >= 1', ['quantidade']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('pedidos');
};

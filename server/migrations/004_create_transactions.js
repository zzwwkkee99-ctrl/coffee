exports.up = function (knex) {
  return knex.schema.createTable('transactions', (table) => {
    table.increments('id').primary();
    table.integer('card_id').unsigned().notNullable()
      .references('id').inTable('cards').onDelete('RESTRICT');
    table.enum('type', ['issue', 'consume', 'recharge']).notNullable();
    table.decimal('amount', 10, 2).nullable();
    table.integer('count').nullable();
    table.decimal('balance_after', 10, 2).nullable();
    table.integer('count_after').nullable();
    table.integer('operator_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.string('note', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['card_id', 'created_at']);
    table.index('operator_id');
    table.index('created_at');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('transactions');
};

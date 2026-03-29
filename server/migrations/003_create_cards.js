exports.up = function (knex) {
  return knex.schema.createTable('cards', (table) => {
    table.increments('id').primary();
    table.string('card_no', 32).notNullable().unique();
    table.integer('customer_id').unsigned().notNullable()
      .references('id').inTable('customers').onDelete('RESTRICT');
    table.enum('type', ['value', 'count']).notNullable();
    table.decimal('balance', 10, 2).defaultTo(0);
    table.integer('remaining_count').defaultTo(0);
    table.decimal('total_value', 10, 2).defaultTo(0);
    table.integer('total_count').defaultTo(0);
    table.string('memo', 255).nullable();
    table.enum('status', ['active', 'exhausted', 'disabled']).defaultTo('active');
    table.integer('issued_by').unsigned().notNullable()
      .references('id').inTable('users').onDelete('RESTRICT');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['customer_id', 'status']);
    table.index('issued_by');
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('cards');
};

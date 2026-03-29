exports.up = function (knex) {
  return knex.schema
    .createTable('card_templates', (table) => {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.enum('type', ['value', 'count']).notNullable();
      table.decimal('amount', 10, 2).nullable();          // for value cards
      table.integer('count').nullable();                   // for count cards
      table.enum('status', ['active', 'disabled']).defaultTo('active');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .then(() => {
      return knex.schema.alterTable('cards', (table) => {
        table.integer('template_id').unsigned().nullable()
          .references('id').inTable('card_templates').onDelete('SET NULL');
      });
    });
};

exports.down = function (knex) {
  return knex.schema
    .alterTable('cards', (table) => {
      table.dropColumn('template_id');
    })
    .then(() => {
      return knex.schema.dropTable('card_templates');
    });
};

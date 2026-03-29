exports.up = function (knex) {
  return knex.raw('ALTER TABLE transactions MODIFY COLUMN type ENUM("issue", "consume", "recharge", "undo") NOT NULL');
};

exports.down = function (knex) {
  return knex.raw('ALTER TABLE transactions MODIFY COLUMN type ENUM("issue", "consume", "recharge") NOT NULL');
};

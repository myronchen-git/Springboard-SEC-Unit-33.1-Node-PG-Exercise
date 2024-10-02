/** Database setup for BizTime. */

const { Client } = require('pg');

// ==================================================

let DB_URI;

switch (process.env.NODE_ENV) {
  case 'test':
    DB_URI = 'postgresql://postgres@localhost/biztime_test';
    break;

  default:
    DB_URI = 'postgresql://postgres@localhost/biztime';
}

const db = new Client({ connectionString: DB_URI });

db.connect();

// ==================================================

module.exports = db;

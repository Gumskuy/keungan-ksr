const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  });
  // Tangani event error agar serverless function tidak crash/500
  pool.on('error', (err) => {
    console.error('Unexpected error on idle database client', err);
  });
} else {
  // Mode lokal otomatis jika belum ada PostgreSQL yang terinstall di komputer
  const { newDb } = require('pg-mem');
  const db = newDb();
  const pgMem = db.adapters.createPg();
  pool = new pgMem.Pool();
  console.log('⚡ Berjalan dalam mode database lokal (in-memory PostgreSQL). Siap ditest!');
}

module.exports = pool;

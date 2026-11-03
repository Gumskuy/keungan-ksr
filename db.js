const { Pool } = require('pg');

const defaultDbUrl = 'postgresql://postgres.kzbrzsjvausfraysakas:KsrKeuangan2026!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
const connString = process.env.DATABASE_URL || defaultDbUrl;

const pool = new Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Database client error:', err.message);
});

module.exports = pool;

module.exports = pool;

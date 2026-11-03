const { Pool } = require('pg');

const targetDbUrl = 'postgresql://postgres.kzbrzsjvausfraysakas:KsrKeuangan2026!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';

// Pakai targetDbUrl yang baru jika DATABASE_URL di environment Vercel masih mengarah ke database lama (wiwkfhqksbrxqhjnnght atau owkpobalgtjvktfkypao)
let connString = process.env.DATABASE_URL || targetDbUrl;
if (connString.includes('wiwkfhqksbrxqhjnnght') || connString.includes('owkpobalgtjvktfkypao') || connString.includes(':5432/')) {
  connString = targetDbUrl;
}

const pool = new Pool({
  connectionString: connString,
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  console.warn('Database pool warning:', err.message);
});

module.exports = pool;

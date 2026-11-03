const { Pool } = require('pg');

const targetDbUrl = 'postgresql://postgres.kzbrzsjvausfraysakas:KsrKeuangan2026!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

// Pakai targetDbUrl yang baru jika DATABASE_URL di environment Vercel masih mengarah ke database lama (wiwkfhqksbrxqhjnnght atau owkpobalgtjvktfkypao)
let connString = process.env.DATABASE_URL || targetDbUrl;
if (connString.includes('wiwkfhqksbrxqhjnnght') || connString.includes('owkpobalgtjvktfkypao')) {
  connString = targetDbUrl;
}

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

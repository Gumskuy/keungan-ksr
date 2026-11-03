const { Pool } = require('pg');

let pool;

// Jika tidak ada DATABASE_URL atau DATABASE_URL bermasalah, gunakan database internal otomatis
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.warn('DB warning:', err.message);
    });
  } catch (e) {
    console.warn('Gagal konek eksternal, fallback ke database internal');
  }
}

if (!pool) {
  // Database internal bawaan (langsung jalan tanpa database luar sama sekali)
  const { newDb } = require('pg-mem');
  const db = newDb();
  const pgMem = db.adapters.createPg();
  pool = new pgMem.Pool();
  console.log('⚡ Berjalan dengan database internal bawaan aplikasi!');
}

module.exports = pool;

module.exports = pool;

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.kzbrzsjvausfraysakas:KsrKeuangan2026!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('Connecting to Supabase...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS anggota (
      id SERIAL PRIMARY KEY,
      nama TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pembayaran_kas (
      id SERIAL PRIMARY KEY,
      anggota_id INT REFERENCES anggota(id) ON DELETE CASCADE,
      tanggal_periode DATE NOT NULL,
      apakah_bayar BOOLEAN DEFAULT false,
      kena_denda BOOLEAN DEFAULT false,
      UNIQUE(anggota_id, tanggal_periode)
    );
    CREATE TABLE IF NOT EXISTS pengeluaran (
      id SERIAL PRIMARY KEY,
      tanggal_pengeluaran DATE NOT NULL,
      keterangan TEXT,
      nominal INT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR NOT NULL COLLATE "default",
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL,
      PRIMARY KEY (sid)
    );
    CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
  `);
  console.log('✅ Semua tabel berhasil dibuat di Supabase!');

  const h = await bcrypt.hash('ksrkeuangan123', 10);
  await pool.query(`
    INSERT INTO users (username, password_hash) 
    VALUES ('admin', $1) 
    ON CONFLICT (username) DO UPDATE SET password_hash = $1
  `, [h]);
  console.log('✅ Akun admin ksrkeuangan123 aktif!');

  const members = [
    'Adelya Putri Ramadhani', 'Andien Amalia Pratiwi', 'Ardi Awaludin', 'Artika Citra Lestari',
    'Asep', 'Davina Noviandini', 'Farid Febrian', 'Nurul Wahidah', 'Ramdan Dwi Nugroho',
    'Regina Puspita', 'Reva Noviara', 'Reyhan Avisa Rizvan', 'Ririn Cantika', 'Rizki Pratama Putra',
    'Sapira Rizki Fauziyah', 'Sapta Rosadi Permana', 'Seni Cahyani', 'Siti Lesya Alfiyani',
    'Teuku Reyki Septiansyah', 'Yulinda Anggraeni', 'Yusup Muhammad Ramdan'
  ];
  for (const m of members) {
    await pool.query('INSERT INTO anggota (nama) VALUES ($1) ON CONFLICT DO NOTHING', [m]);
  }
  console.log(`✅ ${members.length} anggota resmi tersimpan di database Supabase!`);
  process.exit(0);
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});

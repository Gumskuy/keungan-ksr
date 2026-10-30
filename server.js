const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const crypto = require('crypto');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { startWeeklyBackupSchedule } = require('./backup');

const app = express();

/* ── Constants ─────────────────────────────────────────── */
const TARIF_KAS   = parseInt(process.env.TARIF_KAS, 10)   || 5000;
const TARIF_DENDA = parseInt(process.env.TARIF_DENDA, 10)  || 5000;
const START_DATE  = process.env.START_DATE || '2026-08-24';

/* ── Helmet ────────────────────────────────────────────── */
app.use(helmet({ contentSecurityPolicy: false }));

/* ── Trust proxy (Railway) ─────────────────────────────── */
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

/* ── Body parsers ──────────────────────────────────────── */
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/* ── Static files ──────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── View engine ───────────────────────────────────────── */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ── Session ───────────────────────────────────────────── */
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'ksr-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

if (process.env.DATABASE_URL) {
  sessionConfig.store = new PgSession({ pool, createTableIfMissing: true });
}

app.use(session(sessionConfig));

/* ── CSRF token generation ─────────────────────────────── */
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

/* ── CSRF validation on POST ───────────────────────────── */
app.use((req, res, next) => {
  if (req.method === 'POST') {
    const token = req.body._csrf || req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).send('Token CSRF tidak valid. Silakan muat ulang halaman.');
    }
  }
  next();
});

/* ── View locals ───────────────────────────────────────── */
app.use((req, res, next) => {
  res.locals.user        = req.session.user || null;
  res.locals.isAdmin     = Boolean(req.session && req.session.user);
  res.locals.currentPath = req.path;
  res.locals.TARIF_KAS   = TARIF_KAS;
  res.locals.TARIF_DENDA = TARIF_DENDA;
  res.locals.formatRupiah = (n) => {
    return 'Rp ' + (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };
  next();
});

/* ── Routes ────────────────────────────────────────────── */
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/anggota'));
app.use('/', require('./routes/kas'));
app.use('/', require('./routes/pengeluaran'));
app.use('/', require('./routes/settings'));

/* ── Init DB & start ───────────────────────────────────── */
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS anggota (
      id SERIAL PRIMARY KEY,
      nama TEXT UNIQUE NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pembayaran_kas (
      id SERIAL PRIMARY KEY,
      anggota_id INT REFERENCES anggota(id) ON DELETE CASCADE,
      tanggal_periode DATE NOT NULL,
      apakah_bayar BOOLEAN DEFAULT false,
      kena_denda BOOLEAN DEFAULT false,
      UNIQUE(anggota_id, tanggal_periode)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pengeluaran (
      id SERIAL PRIMARY KEY,
      tanggal_pengeluaran DATE NOT NULL,
      keterangan TEXT,
      nominal INT NOT NULL
    )
  `);

  /* Default admin */
  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
  if (rows[0].cnt === 0) {
    const u = process.env.ADMIN_USER     || 'admin';
    const p = process.env.ADMIN_PASSWORD || 'admin123';
    const h = await bcrypt.hash(p, 10);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [u, h]);
    console.log(`Admin user "${u}" created.`);
  }

  /* Default anggota jika kosong */
  const anggotaCnt = await pool.query('SELECT COUNT(*)::int AS cnt FROM anggota');
  if (anggotaCnt.rows[0].cnt === 0) {
    const defaultMembers = [
      'Adelya Putri Ramadhani', 'Andien Amalia Pratiwi', 'Ardi Awaludin', 'Artika Citra Lestari',
      'Asep', 'Davina Noviandini', 'Farid Febrian', 'Nurul Wahidah', 'Ramdan Dwi Nugroho',
      'Regina Puspita', 'Reva Noviara', 'Reyhan Avisa Rizvan', 'Ririn Cantika', 'Rizki Pratama Putra',
      'Sapira Rizki Fauziyah', 'Sapta Rosadi Permana', 'Seni Cahyani', 'Siti Lesya Alfiyani',
      'Teuku Reyki Septiansyah', 'Yulinda Anggraeni', 'Yusup Muhammad Ramdan'
    ];
    for (const m of defaultMembers) {
      await pool.query('INSERT INTO anggota (nama) VALUES ($1) ON CONFLICT DO NOTHING', [m]);
    }
    console.log(`${defaultMembers.length} data anggota awal berhasil dimuat.`);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    startWeeklyBackupSchedule();
  });
}

init().catch((err) => {
  console.error('Gagal start:', err);
  process.exit(1);
});

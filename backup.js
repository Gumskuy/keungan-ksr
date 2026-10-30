const fs = require('fs');
const path = require('path');
const pool = require('./db');

const BACKUP_DIR = path.join(__dirname, 'backups');

async function ensureTables() {
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
}

async function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  await ensureTables();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filenameJson = `backup-ksr-${timestamp}.json`;
  const filenameSql  = `backup-ksr-${timestamp}.sql`;

  try {
    const usersRes       = await pool.query('SELECT id, username, password_hash FROM users ORDER BY id ASC');
    const anggotaRes     = await pool.query('SELECT id, nama FROM anggota ORDER BY id ASC');
    const pembayaranRes  = await pool.query('SELECT id, anggota_id, tanggal_periode, apakah_bayar, kena_denda FROM pembayaran_kas ORDER BY id ASC');
    const pengeluaranRes = await pool.query('SELECT id, tanggal_pengeluaran, keterangan, nominal FROM pengeluaran ORDER BY id ASC');

    const backupData = {
      createdAt: new Date().toISOString(),
      version: '1.0',
      totalRecords: {
        users: usersRes.rows.length,
        anggota: anggotaRes.rows.length,
        pembayaran_kas: pembayaranRes.rows.length,
        pengeluaran: pengeluaranRes.rows.length,
      },
      data: {
        users: usersRes.rows,
        anggota: anggotaRes.rows,
        pembayaran_kas: pembayaranRes.rows,
        pengeluaran: pengeluaranRes.rows,
      }
    };

    // 1. Simpan versi JSON
    const filePathJson = path.join(BACKUP_DIR, filenameJson);
    fs.writeFileSync(filePathJson, JSON.stringify(backupData, null, 2), 'utf-8');

    // 2. Simpan versi SQL restore
    let sqlContent = `-- Backup Keuangan KSR ASM Ariyanti\n-- Dibuat pada: ${new Date().toISOString()}\n\n`;
    
    // Anggota
    for (const a of anggotaRes.rows) {
      const namaEscaped = a.nama.replace(/'/g, "''");
      sqlContent += `INSERT INTO anggota (id, nama) VALUES (${a.id}, '${namaEscaped}') ON CONFLICT (id) DO NOTHING;\n`;
    }
    sqlContent += '\n';

    // Pembayaran Kas
    for (const p of pembayaranRes.rows) {
      const tgl = p.tanggal_periode instanceof Date ? p.tanggal_periode.toISOString().split('T')[0] : p.tanggal_periode;
      sqlContent += `INSERT INTO pembayaran_kas (anggota_id, tanggal_periode, apakah_bayar, kena_denda) VALUES (${p.anggota_id}, '${tgl}', ${p.apakah_bayar}, ${p.kena_denda}) ON CONFLICT (anggota_id, tanggal_periode) DO UPDATE SET apakah_bayar = EXCLUDED.apakah_bayar, kena_denda = EXCLUDED.kena_denda;\n`;
    }
    sqlContent += '\n';

    // Pengeluaran
    for (const exp of pengeluaranRes.rows) {
      const tgl = exp.tanggal_pengeluaran instanceof Date ? exp.tanggal_pengeluaran.toISOString().split('T')[0] : exp.tanggal_pengeluaran;
      const ketEscaped = (exp.keterangan || '').replace(/'/g, "''");
      sqlContent += `INSERT INTO pengeluaran (id, tanggal_pengeluaran, keterangan, nominal) VALUES (${exp.id}, '${tgl}', '${ketEscaped}', ${exp.nominal}) ON CONFLICT (id) DO NOTHING;\n`;
    }

    const filePathSql = path.join(BACKUP_DIR, filenameSql);
    fs.writeFileSync(filePathSql, sqlContent, 'utf-8');

    console.log(`[BACKUP] Berhasil membuat backup:\n - ${filenameJson}\n - ${filenameSql}`);

    // Hapus backup lama jika lebih dari 8 minggu (56 hari)
    cleanupOldBackups(56);

    return {
      success: true,
      filenameJson,
      filenameSql,
      filePathJson,
      filePathSql,
      counts: backupData.totalRecords
    };
  } catch (err) {
    console.error('[BACKUP ERROR]', err);
    throw err;
  }
}

function cleanupOldBackups(maxAgeDays = 56) {
  try {
    const now = Date.now();
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const files = fs.readdirSync(BACKUP_DIR);
    for (const f of files) {
      const fp = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fp);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(fp);
        console.log(`[BACKUP CLEANUP] Menghapus backup usang: ${f}`);
      }
    }
  } catch (e) {
    console.error('[BACKUP CLEANUP ERROR]', e);
  }
}

// Jadwalkan backup mingguan (setiap 7 hari)
function startWeeklyBackupSchedule() {
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  console.log('⏰ Penjadwal Auto-Backup database mingguan aktif (setiap 7 hari).');

  // Jalankan backup pertama 1 menit setelah server start jika folder backups kosong
  setTimeout(async () => {
    try {
      if (!fs.existsSync(BACKUP_DIR) || fs.readdirSync(BACKUP_DIR).length === 0) {
        console.log('📦 Membuat backup awal...');
        await createBackup();
      }
    } catch (e) {
      console.error('Gagal membuat backup awal:', e.message);
    }
  }, 60 * 1000);

  // Interval mingguan berulang
  setInterval(async () => {
    console.log('⏰ Menjalankan auto-backup database mingguan...');
    try {
      await createBackup();
    } catch (err) {
      console.error('Auto backup mingguan gagal:', err);
    }
  }, ONE_WEEK_MS);
}

// Jika dijalankan manual lewat CLI: node backup.js
if (require.main === module) {
  createBackup()
    .then((res) => {
      console.log('Backup selesai!', res.counts);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backup gagal:', err);
      process.exit(1);
    });
}

module.exports = {
  createBackup,
  startWeeklyBackupSchedule,
  BACKUP_DIR
};

const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { requireLogin } = require('../middleware/auth');
const { createBackup, BACKUP_DIR } = require('../backup');
const { generateExcelReport } = require('../excel');

router.get('/settings', requireLogin, async (req, res) => {
  let backupsList = [];
  try {
    if (fs.existsSync(BACKUP_DIR)) {
      backupsList = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json') || f.endsWith('.sql'))
        .map(f => {
          const stat = fs.statSync(path.join(BACKUP_DIR, f));
          return {
            filename: f,
            sizeKb: (stat.size / 1024).toFixed(1),
            createdAt: stat.mtime.toLocaleString('id-ID'),
          };
        })
        .reverse()
        .slice(0, 5); // Tampilkan 5 file terbaru
    }
  } catch (e) {
    console.error(e);
  }

  let usersList = [];
  try {
    const usersRes = await pool.query('SELECT id, username FROM users ORDER BY id ASC');
    usersList = usersRes.rows;
  } catch (e) {
    console.error('Fetch users error:', e);
  }

  res.render('settings', {
    success: req.query.success || null,
    error: req.query.error || null,
    backups: backupsList,
    usersList,
  });
});

/* Tambah Akun Administrator Baru */
router.post('/settings/users/create', requireLogin, async (req, res) => {
  const newUsername = (req.body.new_username || '').trim();
  const newPassword = (req.body.new_password || '').trim();
  const confirmPassword = (req.body.confirm_password || '').trim();

  if (!newUsername || newUsername.length < 3) {
    return res.redirect('/settings?error=Username baru minimal 3 karakter');
  }
  if (!newPassword || newPassword.length < 6) {
    return res.redirect('/settings?error=Password baru minimal 6 karakter');
  }
  if (newPassword !== confirmPassword) {
    return res.redirect('/settings?error=Konfirmasi password tidak cocok');
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [newUsername]);
    if (existing.rows.length > 0) {
      return res.redirect(`/settings?error=Username "${newUsername}" sudah terdaftar`);
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2)', [newUsername, hash]);

    res.redirect(`/settings?success=Administrator baru "${newUsername}" berhasil ditambahkan`);
  } catch (err) {
    console.error('Create user error:', err);
    res.redirect('/settings?error=Gagal menambahkan administrator baru');
  }
});

/* Hapus Akun Administrator */
router.post('/settings/users/delete/:id', requireLogin, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (targetId === req.session.user.id) {
    return res.redirect('/settings?error=Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif');
  }

  try {
    const countRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
    if (countRes.rows[0].cnt <= 1) {
      return res.redirect('/settings?error=Minimal harus ada 1 akun administrator di sistem');
    }

    const delRes = await pool.query('DELETE FROM users WHERE id = $1 RETURNING username', [targetId]);
    if (delRes.rows.length === 0) {
      return res.redirect('/settings?error=Akun tidak ditemukan');
    }

    res.redirect(`/settings?success=Akun administrator "${delRes.rows[0].username}" berhasil dihapus`);
  } catch (err) {
    console.error('Delete user error:', err);
    res.redirect('/settings?error=Gagal menghapus administrator');
  }
});

router.post('/settings', requireLogin, async (req, res) => {
  const { username, password_lama, password_baru, password_konfirmasi } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
    if (rows.length === 0) {
      return res.redirect('/settings?error=User tidak ditemukan');
    }

    /* Validate old password */
    const valid = await bcrypt.compare(password_lama || '', rows[0].password_hash);
    if (!valid) {
      return res.redirect('/settings?error=Password lama salah');
    }

    /* Validate new password confirmation */
    if (password_baru && password_baru !== password_konfirmasi) {
      return res.redirect('/settings?error=Konfirmasi password baru tidak cocok');
    }

    const newUsername = username && username.trim() ? username.trim() : rows[0].username;
    const newHash    = password_baru ? await bcrypt.hash(password_baru, 10) : rows[0].password_hash;

    await pool.query(
      'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3',
      [newUsername, newHash, req.session.user.id]
    );

    req.session.user.username = newUsername;
    res.redirect('/settings?success=Pengaturan akun berhasil disimpan');
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect('/settings?error=Username sudah digunakan oleh akun lain');
    }
    console.error(err);
    res.redirect('/settings?error=Terjadi kesalahan server');
  }
});

// Trigger backup manual lewat tombol
router.post('/settings/backup/create', requireLogin, async (req, res) => {
  try {
    const backupRes = await createBackup();
    res.redirect(`/settings?success=Backup berhasil dibuat (${backupRes.filenameJson})`);
  } catch (err) {
    res.redirect('/settings?error=Gagal membuat backup');
  }
});

// Download backup file (JSON, SQL, atau EXCEL)
router.get('/settings/backup/download/:type', requireLogin, async (req, res) => {
  try {
    const type = req.params.type; // 'json', 'sql', atau 'excel'
    if (type === 'excel') {
      const { excelBuffer, batchTitle } = await generateExcelReport('all');
      const today = new Date().toISOString().split('T')[0];
      const filename = `Backup_Lengkap_Kas_KSR_Ariyanti_${today}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(excelBuffer);
    }

    if (!['json', 'sql'].includes(type)) {
      return res.status(400).send('Format backup tidak didukung');
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      await createBackup();
    }
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(`.${type}`)).sort().reverse();
    if (files.length === 0) {
      await createBackup();
    }
    const latestFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(`.${type}`)).sort().reverse();
    if (latestFiles.length === 0) {
      return res.status(404).send('File backup belum tersedia');
    }
    const filePath = path.join(BACKUP_DIR, latestFiles[0]);
    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengunduh backup');
  }
});

module.exports = router;

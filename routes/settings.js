const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const { requireLogin } = require('../middleware/auth');

router.get('/settings', requireLogin, (req, res) => {
  res.render('settings', { success: null, error: null });
});

router.post('/settings', requireLogin, async (req, res) => {
  const { username, password_lama, password_baru, password_konfirmasi } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
    if (rows.length === 0) {
      return res.render('settings', { error: 'User tidak ditemukan', success: null });
    }

    /* Validate old password */
    const valid = await bcrypt.compare(password_lama || '', rows[0].password_hash);
    if (!valid) {
      return res.render('settings', { error: 'Password lama salah', success: null });
    }

    /* Validate new password confirmation */
    if (password_baru && password_baru !== password_konfirmasi) {
      return res.render('settings', { error: 'Konfirmasi password baru tidak cocok', success: null });
    }

    const newUsername = username && username.trim() ? username.trim() : rows[0].username;
    const newHash    = password_baru ? await bcrypt.hash(password_baru, 10) : rows[0].password_hash;

    await pool.query(
      'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3',
      [newUsername, newHash, req.session.user.id]
    );

    req.session.user.username = newUsername;
    res.render('settings', { success: 'Pengaturan akun berhasil disimpan', error: null });
  } catch (err) {
    if (err.code === '23505') {
      return res.render('settings', { error: 'Username sudah digunakan oleh akun lain', success: null });
    }
    console.error(err);
    res.render('settings', { error: 'Terjadi kesalahan server', success: null });
  }
});

module.exports = router;

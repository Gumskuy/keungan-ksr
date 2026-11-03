const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const pool = require('../db');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', loginLimiter, async (req, res) => {
  const username = (req.body.username || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [username]);
    if (rows.length === 0) {
      return res.render('login', { error: 'Username atau password salah' });
    }
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      return res.render('login', { error: 'Username atau password salah' });
    }
    req.session.user = { id: rows[0].id, username: rows[0].username };
    req.session.save((err) => {
      if (err) console.error('Session save error:', err);
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Terjadi kesalahan server' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');   // sebelumnya '/login'
  });
});

module.exports = router;

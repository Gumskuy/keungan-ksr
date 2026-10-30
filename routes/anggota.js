const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');

router.get('/anggota', requireLogin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM anggota ORDER BY nama ASC');
    res.render('anggota', {
      anggota: result.rows,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan');
  }
});

router.post('/anggota', requireLogin, async (req, res) => {
  const nama = (req.body.nama || '').trim();
  if (!nama) return res.redirect('/anggota?error=Nama tidak boleh kosong');
  try {
    await pool.query('INSERT INTO anggota (nama) VALUES ($1)', [nama]);
    res.redirect('/anggota?success=Anggota berhasil ditambahkan');
  } catch (err) {
    if (err.code === '23505') {
      return res.redirect('/anggota?error=Nama anggota sudah ada');
    }
    console.error(err);
    res.redirect('/anggota?error=Terjadi kesalahan');
  }
});

router.post('/anggota/hapus/:id', requireLogin, async (req, res) => {
  try {
    await pool.query('DELETE FROM anggota WHERE id = $1', [req.params.id]);
    res.redirect('/anggota?success=Anggota berhasil dihapus');
  } catch (err) {
    console.error(err);
    res.redirect('/anggota?error=Gagal menghapus anggota');
  }
});

module.exports = router;

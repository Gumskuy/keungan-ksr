const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');

router.get('/pengeluaran', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pengeluaran ORDER BY tanggal_pengeluaran DESC, id DESC');
    res.render('pengeluaran', {
      pengeluaran: result.rows,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan');
  }
});

router.post('/pengeluaran', requireLogin, async (req, res) => {
  const { tanggal_pengeluaran, keterangan, nominal } = req.body;
  if (!tanggal_pengeluaran || !nominal) {
    return res.redirect('/pengeluaran?error=Tanggal dan nominal wajib diisi');
  }
  try {
    await pool.query(
      'INSERT INTO pengeluaran (tanggal_pengeluaran, keterangan, nominal) VALUES ($1, $2, $3)',
      [tanggal_pengeluaran, keterangan || '', parseInt(nominal, 10)]
    );
    res.redirect('/pengeluaran?success=Pengeluaran berhasil dicatat');
  } catch (err) {
    console.error(err);
    res.redirect('/pengeluaran?error=Gagal menyimpan pengeluaran');
  }
});

router.post('/pengeluaran/hapus/:id', requireLogin, async (req, res) => {
  try {
    await pool.query('DELETE FROM pengeluaran WHERE id = $1', [req.params.id]);
    res.redirect('/pengeluaran?success=Pengeluaran berhasil dihapus');
  } catch (err) {
    console.error(err);
    res.redirect('/pengeluaran?error=Gagal menghapus');
  }
});

module.exports = router;

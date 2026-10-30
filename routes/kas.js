const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireLogin } = require('../middleware/auth');

const TARIF_KAS   = parseInt(process.env.TARIF_KAS, 10)   || 5000;
const TARIF_DENDA = parseInt(process.env.TARIF_DENDA, 10)  || 5000;
const START_DATE  = process.env.START_DATE || '2026-08-24';

function generateWeeks() {
  const weeks = [];
  const start = new Date(START_DATE + 'T00:00:00');
  for (let i = 0; i < 52; i++) {
    const from = new Date(start);
    from.setDate(from.getDate() + i * 7);
    const to = new Date(from);
    to.setDate(to.getDate() + 6);
    weeks.push({ number: i + 1, from, to, dateStr: from.toISOString().split('T')[0] });
  }
  return weeks;
}

function formatTgl(d) {
  return d.getDate() + '/' + (d.getMonth() + 1);
}

router.get('/kas-masuk', requireLogin, async (req, res) => {
  try {
    const anggota = await pool.query('SELECT * FROM anggota ORDER BY nama ASC');
    const weeks = generateWeeks();
    res.render('input_kas', {
      anggota: anggota.rows,
      weeks,
      formatTgl,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan');
  }
});

router.post('/kas-masuk', requireLogin, async (req, res) => {
  const { anggota_id, tanggal_periode, apakah_bayar, kena_denda } = req.body;
  const bayar = apakah_bayar === 'on';
  const denda = kena_denda === 'on';
  try {
    await pool.query(`
      INSERT INTO pembayaran_kas (anggota_id, tanggal_periode, apakah_bayar, kena_denda)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (anggota_id, tanggal_periode)
      DO UPDATE SET apakah_bayar = $3, kena_denda = $4
    `, [anggota_id, tanggal_periode, bayar, denda]);
    res.redirect('/kas-masuk?success=1');
  } catch (err) {
    console.error(err);
    res.redirect('/kas-masuk?error=Gagal menyimpan');
  }
});

/* Toggle checkbox via AJAX from dashboard */
router.post('/kas/toggle', requireLogin, async (req, res) => {
  const { anggota_id, tanggal_periode, field, value } = req.body;
  if (!['apakah_bayar', 'kena_denda'].includes(field)) {
    return res.status(400).json({ error: 'Field tidak valid' });
  }
  try {
    await pool.query(`
      INSERT INTO pembayaran_kas (anggota_id, tanggal_periode, ${field})
      VALUES ($1, $2, $3)
      ON CONFLICT (anggota_id, tanggal_periode)
      DO UPDATE SET ${field} = $3
    `, [anggota_id, tanggal_periode, value]);
    /* Return updated summaries */
    const kasRes   = await pool.query('SELECT COUNT(*)::int AS cnt FROM pembayaran_kas WHERE apakah_bayar = true');
    const dendaRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM pembayaran_kas WHERE kena_denda = true');
    const pengRes  = await pool.query('SELECT COALESCE(SUM(nominal),0)::int AS total FROM pengeluaran');

    const totalKas         = kasRes.rows[0].cnt * TARIF_KAS;
    const totalDenda       = dendaRes.rows[0].cnt * TARIF_DENDA;
    const totalPengeluaran = pengRes.rows[0].total;
    const sisaSaldo        = totalKas + totalDenda - totalPengeluaran;

    res.json({ ok: true, totalKas, totalDenda, totalPengeluaran, sisaSaldo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan' });
  }
});

/* Cetak LPJ */
router.get('/kas/cetak-lpj', requireLogin, async (req, res) => {
  try {
    const kasRes   = await pool.query('SELECT COUNT(*)::int AS cnt FROM pembayaran_kas WHERE apakah_bayar = true');
    const dendaRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM pembayaran_kas WHERE kena_denda = true');
    const pengRes  = await pool.query('SELECT COALESCE(SUM(nominal),0)::int AS total FROM pengeluaran');
    const pengList = await pool.query('SELECT * FROM pengeluaran ORDER BY tanggal_pengeluaran ASC');

    const rekapResult = await pool.query(`
      SELECT a.nama, COUNT(pk.id)::int AS minggu_lunas
      FROM anggota a
      LEFT JOIN pembayaran_kas pk ON pk.anggota_id = a.id AND pk.apakah_bayar = true
      GROUP BY a.id, a.nama
      ORDER BY a.nama ASC
    `);

    const totalKas         = kasRes.rows[0].cnt * TARIF_KAS;
    const totalDenda       = dendaRes.rows[0].cnt * TARIF_DENDA;
    const totalPengeluaran = pengRes.rows[0].total;
    const sisaSaldo        = totalKas + totalDenda - totalPengeluaran;

    res.render('cetak', {
      totalKas, totalDenda, totalPengeluaran, sisaSaldo,
      pengeluaran: pengList.rows,
      rekap: rekapResult.rows,
      totalMinggu: 52,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan');
  }
});

module.exports = router;

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

router.get('/', async (req, res) => {
  try {
    const weeks = generateWeeks();
    const anggotaResult  = await pool.query('SELECT * FROM anggota ORDER BY nama ASC');
    const paymentsResult = await pool.query('SELECT * FROM pembayaran_kas');

    const payments = {};
    paymentsResult.rows.forEach((p) => {
      const key = p.anggota_id + '_' + p.tanggal_periode.toISOString().split('T')[0];
      payments[key] = p;
    });

    const kasRes   = await pool.query('SELECT COUNT(*)::int AS cnt FROM pembayaran_kas WHERE apakah_bayar = true');
    const dendaRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM pembayaran_kas WHERE kena_denda = true');
    const pengRes  = await pool.query('SELECT COALESCE(SUM(nominal),0)::int AS total FROM pengeluaran');

    const totalKas         = kasRes.rows[0].cnt * TARIF_KAS;
    const totalDenda       = dendaRes.rows[0].cnt * TARIF_DENDA;
    const totalPengeluaran = pengRes.rows[0].total;
    const sisaSaldo        = totalKas + totalDenda - totalPengeluaran;

    res.render('dashboard', {
      weeks, anggota: anggotaResult.rows, payments,
      totalKas, totalDenda, totalPengeluaran, sisaSaldo,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan server');
  }
});

module.exports = router;

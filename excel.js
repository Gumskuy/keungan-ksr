const XLSX = require('xlsx');
const pool = require('./db');

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
    weeks.push({
      number: i + 1,
      from,
      to,
      dateStr: from.toISOString().split('T')[0],
      label: `M${i + 1} (${from.getDate()}/${from.getMonth() + 1})`
    });
  }
  return weeks;
}

async function generateExcelReport(batchIndex = null) {
  const allWeeks = generateWeeks();
  let selectedWeeks = allWeeks;
  let batchTitle = '52 Minggu (Penuh)';

  if (batchIndex !== null && batchIndex !== undefined && batchIndex !== 'all') {
    const b = parseInt(batchIndex, 10);
    if (!isNaN(b) && b >= 0 && b < 6) {
      const startW = b * 10;
      const endW = Math.min(startW + 10, 52);
      selectedWeeks = allWeeks.slice(startW, endW);
      batchTitle = `Minggu ${startW + 1} - ${endW}`;
    }
  }

  // 1. Ambil data database
  const anggotaRes = await pool.query('SELECT * FROM anggota ORDER BY nama ASC');
  const kasRes = await pool.query('SELECT * FROM pembayaran_kas');
  const pengeluaranRes = await pool.query('SELECT * FROM pengeluaran ORDER BY tanggal_pengeluaran ASC');

  const payments = {};
  kasRes.rows.forEach(p => {
    const tgl = p.tanggal_periode instanceof Date ? p.tanggal_periode.toISOString().split('T')[0] : p.tanggal_periode;
    payments[`${p.anggota_id}_${tgl}`] = p;
  });

  // 2. Buat Sheet 1: Rekap Kas Anggota
  const kasSheetData = [];
  
  // Header baris tabel
  const headerRow = ['No', 'Nama Anggota'];
  selectedWeeks.forEach(w => headerRow.push(w.label));
  headerRow.push('Total Lunas (Mg)', 'Total Denda (Mg)', 'Nominal Kas (Rp)', 'Nominal Denda (Rp)', 'Total Setor (Rp)');
  kasSheetData.push(headerRow);

  let grandTotalKas = 0;
  let grandTotalDenda = 0;
  let grandTotalSetor = 0;

  anggotaRes.rows.forEach((a, idx) => {
    const row = [idx + 1, a.nama];
    let lunasCount = 0;
    let dendaCount = 0;

    selectedWeeks.forEach(w => {
      const key = `${a.id}_${w.dateStr}`;
      const p = payments[key];
      if (p && p.apakah_bayar) {
        row.push('LUNAS');
        lunasCount++;
      } else if (p && p.kena_denda) {
        row.push('DENDA');
        dendaCount++;
      } else {
        row.push('-');
      }
    });

    const nominalKas = lunasCount * TARIF_KAS;
    const nominalDenda = dendaCount * TARIF_DENDA;
    const totalSetor = nominalKas + nominalDenda;

    grandTotalKas += nominalKas;
    grandTotalDenda += nominalDenda;
    grandTotalSetor += totalSetor;

    row.push(lunasCount, dendaCount, nominalKas, nominalDenda, totalSetor);
    kasSheetData.push(row);
  });

  // Baris Total Bawah
  const totalRow = ['TOTAL', ''];
  selectedWeeks.forEach(() => totalRow.push(''));
  totalRow.push('', '', grandTotalKas, grandTotalDenda, grandTotalSetor);
  kasSheetData.push(totalRow);

  // 3. Buat Sheet 2: Catatan Pengeluaran
  const pengeluaranSheetData = [
    ['No', 'Tanggal Pengeluaran', 'Keterangan Operasional', 'Nominal (Rp)']
  ];

  let totalPengeluaran = 0;
  pengeluaranRes.rows.forEach((exp, idx) => {
    const tgl = exp.tanggal_pengeluaran instanceof Date 
      ? exp.tanggal_pengeluaran.toISOString().split('T')[0] 
      : exp.tanggal_pengeluaran;
    totalPengeluaran += (exp.nominal || 0);
    pengeluaranSheetData.push([idx + 1, tgl, exp.keterangan || '-', exp.nominal || 0]);
  });
  pengeluaranSheetData.push(['TOTAL PENGELUARAN', '', '', totalPengeluaran]);

  // 4. Buat Sheet 3: Ringkasan Saldo
  const sisaSaldo = (grandTotalKas + grandTotalDenda) - totalPengeluaran;
  const ringkasanSheetData = [
    ['LAPORAN REKAPITULASI KEUANGAN KSR ASM ARIYANTI', ''],
    ['Periode', batchTitle],
    ['Tanggal Unduh', new Date().toLocaleDateString('id-ID')],
    ['', ''],
    ['Komponen Keuangan', 'Jumlah (Rp)'],
    ['Total Uang Kas Masuk', grandTotalKas],
    ['Total Denda Disiplin Masuk', grandTotalDenda],
    ['Total Penerimaan Keseluruhan', grandTotalKas + grandTotalDenda],
    ['Total Pengeluaran Operasional', totalPengeluaran],
    ['SISA SALDO KAS BERSIH', sisaSaldo]
  ];

  // 5. Susun ke Workbook XLSX
  const wb = XLSX.utils.book_new();

  const wsRingkasan = XLSX.utils.aoa_to_sheet(ringkasanSheetData);
  const wsKas = XLSX.utils.aoa_to_sheet(kasSheetData);
  const wsPengeluaran = XLSX.utils.aoa_to_sheet(pengeluaranSheetData);

  // Atur lebar kolom agar rapi
  wsRingkasan['!cols'] = [{ wch: 35 }, { wch: 25 }];
  wsKas['!cols'] = [{ wch: 5 }, { wch: 28 }, ...selectedWeeks.map(() => ({ wch: 12 })), { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  wsPengeluaran['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 40 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan Saldo');
  XLSX.utils.book_append_sheet(wb, wsKas, 'Rekap Pembayaran Kas');
  XLSX.utils.book_append_sheet(wb, wsPengeluaran, 'Arus Pengeluaran');

  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return { excelBuffer, batchTitle };
}

module.exports = {
  generateExcelReport,
};

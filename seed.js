const pool = require('./db');

const ANGGOTA = [
  'Adelya Putri Ramadhani',
  'Andien Amalia Pratiwi',
  'Ardi Awaludin',
  'Artika Citra Lestari',
  'Asep',
  'Davina Noviandini',
  'Farid Febrian',
  'Nurul Wahidah',
  'Ramdan Dwi Nugroho',
  'Regina Puspita',
  'Reva Noviara',
  'Reyhan Avisa Rizvan',
  'Ririn Cantika',
  'Rizki Pratama Putra',
  'Sapira Rizki Fauziyah',
  'Sapta Rosadi Permana',
  'Seni Cahyani',
  'Siti Lesya Alfiyani',
  'Teuku Reyki Septiansyah',
  'Yulinda Anggraeni',
  'Yusup Muhammad Ramdan',
];

async function seed() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM anggota');
  if (rows[0].cnt > 0) {
    console.log('Tabel anggota sudah berisi data. Seed dibatalkan.');
    process.exit(0);
  }

  for (const nama of ANGGOTA) {
    await pool.query('INSERT INTO anggota (nama) VALUES ($1) ON CONFLICT DO NOTHING', [nama]);
  }

  console.log(`${ANGGOTA.length} anggota berhasil di-seed.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed gagal:', err);
  process.exit(1);
});

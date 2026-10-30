-- ============================================================
-- Supabase Setup SQL — KSR Keuangan ASM Ariyanti
-- Jalankan di SQL Editor Supabase
-- ============================================================

-- 1. BUAT TABEL
-- ============================================================

-- Tabel anggota KSR
CREATE TABLE IF NOT EXISTS anggota (
  id SERIAL PRIMARY KEY,
  nama TEXT UNIQUE NOT NULL
);

-- Tabel pembayaran kas mingguan
CREATE TABLE IF NOT EXISTS pembayaran_kas (
  id SERIAL PRIMARY KEY,
  anggota_id INT REFERENCES anggota(id) ON DELETE CASCADE,
  tanggal_periode DATE NOT NULL,
  apakah_bayar BOOLEAN DEFAULT false,
  kena_denda BOOLEAN DEFAULT false,
  UNIQUE(anggota_id, tanggal_periode)
);

-- Tabel pengeluaran
CREATE TABLE IF NOT EXISTS pengeluaran (
  id SERIAL PRIMARY KEY,
  tanggal_pengeluaran DATE NOT NULL,
  keterangan TEXT,
  nominal INT NOT NULL
);

-- 2. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_kas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pengeluaran ENABLE ROW LEVEL SECURITY;

-- Semua orang bisa LIHAT (read-only untuk publik)
CREATE POLICY "Publik bisa lihat anggota" ON anggota
  FOR SELECT USING (true);

CREATE POLICY "Publik bisa lihat pembayaran" ON pembayaran_kas
  FOR SELECT USING (true);

CREATE POLICY "Publik bisa lihat pengeluaran" ON pengeluaran
  FOR SELECT USING (true);

-- Hanya admin (yang sudah login) bisa TAMBAH/UBAH/HAPUS
CREATE POLICY "Admin kelola anggota" ON anggota
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin kelola pembayaran" ON pembayaran_kas
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin kelola pengeluaran" ON pengeluaran
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- 3. SEED DATA ANGGOTA
-- ============================================================

INSERT INTO anggota (nama) VALUES
  ('Adelya Putri Ramadhani'),
  ('Andien Amalia Pratiwi'),
  ('Ardi Awaludin'),
  ('Artika Citra Lestari'),
  ('Asep'),
  ('Davina Noviandini'),
  ('Farid Febrian'),
  ('Nurul Wahidah'),
  ('Ramdan Dwi Nugroho'),
  ('Regina Puspita'),
  ('Reva Noviara'),
  ('Reyhan Avisa Rizvan'),
  ('Ririn Cantika'),
  ('Rizki Pratama Putra'),
  ('Sapira Rizki Fauziyah'),
  ('Sapta Rosadi Permana'),
  ('Seni Cahyani'),
  ('Siti Lesya Alfiyani'),
  ('Teuku Reyki Septiansyah'),
  ('Yulinda Anggraeni'),
  ('Yusup Muhammad Ramdan')
ON CONFLICT (nama) DO NOTHING;

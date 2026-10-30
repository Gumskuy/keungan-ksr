# Keuangan KSR — Korps Sukarela ASM Ariyanti

Aplikasi pencatatan keuangan kas untuk Korps Sukarela ASM Ariyanti. Dibangun dengan Node.js, Express, EJS, dan PostgreSQL.

## Stack

- **Runtime**: Node.js 20+
- **Framework**: Express
- **Template**: EJS (server-side rendering)
- **Database**: PostgreSQL (paket `pg`, SQL langsung tanpa ORM)
- **Auth**: express-session + connect-pg-simple + bcryptjs
- **Keamanan**: helmet, express-rate-limit, CSRF token

## Fitur

- Dashboard ringkasan keuangan dengan tabel pembayaran interaktif
- Manajemen anggota KSR (tambah, hapus, cari)
- Input pembayaran kas mingguan (upsert)
- Pencatatan pengeluaran
- Cetak Laporan LPJ (print-ready)
- Pengaturan akun (ubah username & password)
- Responsif (mobile-friendly)

## Environment Variables

| Variable | Deskripsi | Default |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | — |
| `SESSION_SECRET` | Secret untuk session | `ksr-secret-change-me` |
| `ADMIN_USER` | Username admin awal | `admin` |
| `ADMIN_PASSWORD` | Password admin awal | `admin123` |
| `START_DATE` | Tanggal mulai periode kas | `2026-08-24` |
| `TARIF_KAS` | Tarif kas per minggu (Rp) | `5000` |
| `TARIF_DENDA` | Tarif denda per minggu (Rp) | `5000` |
| `NODE_ENV` | Environment | `development` |
| `PORT` | Port server | `3000` |

## Setup Lokal

```bash
# Clone repo
git clone <repo-url>
cd keuangan-ksr

# Install dependencies
npm install

# Copy dan edit .env
cp .env.example .env
# Edit .env sesuai database lokal

# Jalankan server
npm start

# Seed data anggota (opsional)
node seed.js
```

## Deploy ke Supabase + Render

### 1. Buat Database di Supabase

1. Buka [supabase.com](https://supabase.com) → **Sign In** / **Sign Up**
2. Klik **New Project**
3. Isi:
   - **Project name**: `Ksrkeuangan`
   - **Database Password**: `KSrkeungan123`
   - **Region**: Southeast Asia (Singapore)
4. Tunggu project selesai dibuat
5. Buka **Project Settings** → **Database** → salin **Connection string (URI)**
6. Ganti `[YOUR-PASSWORD]` dengan `KSrkeungan123`

### 2. Deploy Aplikasi ke Render.com

1. Buka [render.com](https://render.com) → Sign Up pakai GitHub
2. Klik **New** → **Web Service**
3. Hubungkan repo GitHub `keunaganv2`
4. Isi pengaturan:
   - **Name**: `ksr-keuangan`
   - **Runtime**: Docker
   - **Plan**: Free
5. Tambahkan **Environment Variables**:

| Variable | Nilai |
|----------|-------|
| `DATABASE_URL` | *(Connection string dari Supabase)* |
| `SESSION_SECRET` | `ksr-ariyanti-secret-2026` |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASSWORD` | `KSrkeungan123` |
| `START_DATE` | `2026-08-24` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

6. Klik **Create Web Service**, tunggu build selesai
7. Buka URL yang diberikan Render (misal: `https://ksr-keuangan.onrender.com`)

> **Catatan**: Tabel database dan data anggota akan otomatis dibuat saat pertama kali server berjalan.

## Palet Warna

| Peran | Hex |
|---|---|
| Primary (KSR Red) | `#8B1A1A` |
| Accent (Crimson) | `#DC143C` |
| Background | `#FFF5F5` |
| Card / Surface | `#FFFFFF` |
| Border | `#E2E8F0` |
| Teks Utama | `#1A1A2E` |
| Teks Sekunder | `#64748B` |

## Lisensi

Internal — Korps Sukarela ASM Ariyanti

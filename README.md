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

## Deploy ke Railway

1. Push repo ke GitHub
2. Buat project baru di [Railway](https://railway.app)
3. **New** → **GitHub Repo** → pilih repo ini
4. **New** → **Database** → **Add PostgreSQL**
5. Buka **Variables** di service app, tambahkan:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `SESSION_SECRET` = *(string acak panjang)*
   - `ADMIN_USER` = `admin`
   - `ADMIN_PASSWORD` = *(password aman)*
   - `START_DATE` = `2026-08-24`
   - `NODE_ENV` = `production`
6. **Settings** → **Networking** → **Generate Domain**
7. Tunggu deploy selesai
8. Jalankan seed (opsional): di Railway shell, `node seed.js`

## Palet Warna

| Peran | Hex |
|---|---|
| Primary (Slate Dark) | `#1E293B` |
| Accent (Sky Blue) | `#0284C7` |
| Background | `#F8FAFC` |
| Card / Surface | `#FFFFFF` |
| Border | `#E2E8F0` |
| Teks Utama | `#0F172A` |
| Teks Sekunder | `#64748B` |

## Lisensi

Internal — Korps Sukarela ASM Ariyanti
"# keunaganv2" 

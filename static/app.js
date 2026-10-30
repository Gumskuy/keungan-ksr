/* ══════════════════════════════════════════════
   KSR Keuangan — App Logic (Supabase Client)
   ══════════════════════════════════════════════ */

// ┌──────────────────────────────────────────────┐
// │  GANTI 2 NILAI INI DENGAN PUNYA KAMU         │
// │  (dari Supabase → Settings → API)            │
// └──────────────────────────────────────────────┘
const SUPABASE_URL = 'https://wiwkfhqksbrxqhjnnght.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpd2tmaHFrc2JyeHFoam5uZ2h0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNzU1OTAsImV4cCI6MjEwODk1MTU5MH0.CYZ_BeJUdn8_dOArqazn4k6rLfHpBwBfbDKES0g2c2o';

const TARIF_KAS = 5000;
const TARIF_DENDA = 5000;
const START_DATE = '2026-08-24';
const WEEKS_PER_PAGE = 10;

// Init Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State
let isAdmin = false;
let currentPage = 'dashboard';
let weekPage = 0;
let allAnggota = [];
let allPembayaran = [];
let allPengeluaran = [];

// ══════════════════════════════════════════════
// FORMAT HELPERS
// ══════════════════════════════════════════════
function formatRupiah(n) {
  return 'Rp ' + (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatTanggal(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getWeekDates() {
  const weeks = [];
  const start = new Date(START_DATE);
  const now = new Date();
  let d = new Date(start);
  let i = 1;
  while (d <= now || i <= 10) {
    weeks.push({ minggu: i, tanggal: new Date(d).toISOString().slice(0, 10) });
    d.setDate(d.getDate() + 7);
    i++;
    if (i > 100) break; // safety
  }
  return weeks;
}

// ══════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════
function showLogin() {
  document.getElementById('login-modal').style.display = 'flex';
}

function hideLogin() {
  document.getElementById('login-modal').style.display = 'none';
  document.getElementById('login-error').style.display = 'none';
}

async function doLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const errEl = document.getElementById('login-error');
    errEl.textContent = 'Login gagal: ' + error.message;
    errEl.style.display = 'block';
    return;
  }

  isAdmin = true;
  document.body.classList.add('is-admin');
  document.getElementById('btn-login').style.display = 'none';
  document.getElementById('logged-in-info').style.display = 'block';
  document.getElementById('logged-user').textContent = '👤 ' + data.user.email;
  hideLogin();
  refreshCurrentPage();
}

async function doLogout() {
  await supabase.auth.signOut();
  isAdmin = false;
  document.body.classList.remove('is-admin');
  document.getElementById('btn-login').style.display = 'block';
  document.getElementById('logged-in-info').style.display = 'none';
  navigateTo('dashboard');
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    isAdmin = true;
    document.body.classList.add('is-admin');
    document.getElementById('btn-login').style.display = 'none';
    document.getElementById('logged-in-info').style.display = 'block';
    document.getElementById('logged-user').textContent = '👤 ' + session.user.email;
  }
}

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════
function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const targetPage = document.getElementById('page-' + page);
  if (targetPage) targetPage.classList.add('active');

  const targetLink = document.querySelector(`[data-page="${page}"]`);
  if (targetLink) targetLink.classList.add('active');

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  refreshCurrentPage();
}

function refreshCurrentPage() {
  switch (currentPage) {
    case 'dashboard': loadDashboard(); break;
    case 'anggota': loadAnggota(); break;
    case 'input-kas': loadInputKas(); break;
    case 'pengeluaran': loadPengeluaran(); break;
    case 'cetak': loadCetak(); break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════
async function loadDashboard() {
  // Fetch data
  const [angRes, payRes, expRes] = await Promise.all([
    supabase.from('anggota').select('*').order('nama'),
    supabase.from('pembayaran_kas').select('*'),
    supabase.from('pengeluaran').select('*').order('tanggal_pengeluaran', { ascending: false }),
  ]);

  allAnggota = angRes.data || [];
  allPembayaran = payRes.data || [];
  allPengeluaran = expRes.data || [];

  // Hitung totals
  const totalBayar = allPembayaran.filter(p => p.apakah_bayar).length * TARIF_KAS;
  const totalDenda = allPembayaran.filter(p => p.kena_denda).length * TARIF_DENDA;
  const totalPemasukan = totalBayar + totalDenda;
  const totalPengeluaran = allPengeluaran.reduce((s, p) => s + (p.nominal || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  document.getElementById('total-pemasukan').textContent = formatRupiah(totalPemasukan);
  document.getElementById('total-pengeluaran').textContent = formatRupiah(totalPengeluaran);
  document.getElementById('saldo-kas').textContent = formatRupiah(saldo);
  document.getElementById('total-denda').textContent = formatRupiah(totalDenda);

  renderPaymentTable();
}

function renderPaymentTable() {
  const weeks = getWeekDates();
  const start = weekPage * WEEKS_PER_PAGE;
  const end = Math.min(start + WEEKS_PER_PAGE, weeks.length);
  const visibleWeeks = weeks.slice(start, end);

  // Page info
  document.getElementById('page-info').textContent =
    `Minggu ${start + 1} - ${end} dari ${weeks.length}`;
  document.getElementById('btn-prev-page').disabled = weekPage === 0;
  document.getElementById('btn-next-page').disabled = end >= weeks.length;

  // Header
  const thead = document.getElementById('thead-pembayaran');
  let headerHTML = '<tr><th>No</th><th>Nama</th>';
  visibleWeeks.forEach(w => {
    headerHTML += `<th>M${w.minggu}</th>`;
  });
  headerHTML += '<th>Total Bayar</th><th>Total Denda</th></tr>';
  thead.innerHTML = headerHTML;

  // Body
  const tbody = document.getElementById('tbody-pembayaran');
  let bodyHTML = '';

  allAnggota.forEach((ang, idx) => {
    bodyHTML += `<tr><td>${idx + 1}</td><td class="nama-cell">${ang.nama}</td>`;

    let totalBayarAng = 0;
    let totalDendaAng = 0;

    visibleWeeks.forEach(w => {
      const pay = allPembayaran.find(
        p => p.anggota_id === ang.id && p.tanggal_periode === w.tanggal
      );

      if (pay && pay.apakah_bayar) {
        bodyHTML += '<td class="status-bayar">✔</td>';
        totalBayarAng++;
      } else if (pay && pay.kena_denda) {
        bodyHTML += '<td class="status-denda">⚠</td>';
        totalDendaAng++;
      } else {
        // Check if this week has passed
        const weekDate = new Date(w.tanggal);
        const now = new Date();
        if (weekDate < now) {
          bodyHTML += '<td class="status-belum">✘</td>';
          totalDendaAng++;
        } else {
          bodyHTML += '<td>-</td>';
        }
      }
    });

    // Count full totals (not just visible page)
    const allBayar = allPembayaran.filter(p => p.anggota_id === ang.id && p.apakah_bayar).length;
    const allDenda = allPembayaran.filter(p => p.anggota_id === ang.id && p.kena_denda).length;

    bodyHTML += `<td>${formatRupiah(allBayar * TARIF_KAS)}</td>`;
    bodyHTML += `<td>${formatRupiah(allDenda * TARIF_DENDA)}</td>`;
    bodyHTML += '</tr>';
  });

  tbody.innerHTML = bodyHTML || '<tr><td colspan="100%">Belum ada data</td></tr>';
}

function prevPage() {
  if (weekPage > 0) { weekPage--; renderPaymentTable(); }
}

function nextPage() {
  const weeks = getWeekDates();
  if ((weekPage + 1) * WEEKS_PER_PAGE < weeks.length) { weekPage++; renderPaymentTable(); }
}

// ══════════════════════════════════════════════
// ANGGOTA
// ══════════════════════════════════════════════
async function loadAnggota() {
  const { data } = await supabase.from('anggota').select('*').order('nama');
  allAnggota = data || [];
  renderAnggota(allAnggota);
}

function renderAnggota(list) {
  const tbody = document.getElementById('tbody-anggota');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="3">Belum ada anggota</td></tr>';
    return;
  }
  tbody.innerHTML = list.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="nama-cell">${a.nama}</td>
      <td class="admin-only">
        <button class="btn btn-danger" onclick="hapusAnggota(${a.id}, '${a.nama.replace(/'/g, "\\'")}')">Hapus</button>
      </td>
    </tr>
  `).join('');
}

function filterAnggota() {
  const q = document.getElementById('search-anggota').value.toLowerCase();
  const filtered = allAnggota.filter(a => a.nama.toLowerCase().includes(q));
  renderAnggota(filtered);
}

async function tambahAnggota(e) {
  e.preventDefault();
  const nama = document.getElementById('input-nama-anggota').value.trim();
  if (!nama) return;

  const { error } = await supabase.from('anggota').insert({ nama });
  if (error) {
    alert('Gagal tambah anggota: ' + error.message);
    return;
  }
  document.getElementById('input-nama-anggota').value = '';
  loadAnggota();
}

async function hapusAnggota(id, nama) {
  if (!confirm(`Yakin hapus anggota "${nama}"? Data pembayarannya juga akan terhapus.`)) return;
  const { error } = await supabase.from('anggota').delete().eq('id', id);
  if (error) {
    alert('Gagal hapus: ' + error.message);
    return;
  }
  loadAnggota();
}

// ══════════════════════════════════════════════
// INPUT KAS
// ══════════════════════════════════════════════
async function loadInputKas() {
  // Load anggota for select
  const { data: anggota } = await supabase.from('anggota').select('*').order('nama');
  allAnggota = anggota || [];

  const select = document.getElementById('select-anggota-kas');
  select.innerHTML = '<option value="">-- Pilih Anggota --</option>' +
    allAnggota.map(a => `<option value="${a.id}">${a.nama}</option>`).join('');

  select.onchange = () => loadMingguCheckboxes(select.value);
}

async function loadMingguCheckboxes(anggotaId) {
  const container = document.getElementById('minggu-checkboxes');
  if (!anggotaId) {
    container.innerHTML = '<p class="hint">Pilih anggota terlebih dahulu</p>';
    return;
  }

  const weeks = getWeekDates();

  // Fetch existing payments for this member
  const { data: payments } = await supabase
    .from('pembayaran_kas')
    .select('*')
    .eq('anggota_id', anggotaId);

  const payMap = {};
  (payments || []).forEach(p => { payMap[p.tanggal_periode] = p; });

  container.innerHTML = weeks.map(w => {
    const paid = payMap[w.tanggal] && payMap[w.tanggal].apakah_bayar;
    return `
      <label class="minggu-checkbox-item ${paid ? 'checked' : ''}">
        <input type="checkbox" value="${w.tanggal}" data-minggu="${w.minggu}"
          ${paid ? 'checked' : ''}
          onchange="this.parentElement.classList.toggle('checked', this.checked)">
        Minggu ${w.minggu} <small>(${formatTanggal(w.tanggal)})</small>
      </label>
    `;
  }).join('');
}

async function simpanKas() {
  const anggotaId = document.getElementById('select-anggota-kas').value;
  if (!anggotaId) {
    alert('Pilih anggota dulu!');
    return;
  }

  const statusEl = document.getElementById('kas-status');
  statusEl.textContent = 'Menyimpan...';
  statusEl.className = 'status-msg';

  const checkboxes = document.querySelectorAll('#minggu-checkboxes input[type="checkbox"]');
  const upserts = [];

  checkboxes.forEach(cb => {
    upserts.push({
      anggota_id: parseInt(anggotaId),
      tanggal_periode: cb.value,
      apakah_bayar: cb.checked,
      kena_denda: !cb.checked && new Date(cb.value) < new Date(),
    });
  });

  const { error } = await supabase
    .from('pembayaran_kas')
    .upsert(upserts, { onConflict: 'anggota_id,tanggal_periode' });

  if (error) {
    statusEl.textContent = 'Gagal simpan: ' + error.message;
    statusEl.className = 'status-msg error';
    return;
  }

  statusEl.textContent = '✅ Pembayaran berhasil disimpan!';
  statusEl.className = 'status-msg success';
}

// ══════════════════════════════════════════════
// PENGELUARAN
// ══════════════════════════════════════════════
async function loadPengeluaran() {
  const { data } = await supabase
    .from('pengeluaran')
    .select('*')
    .order('tanggal_pengeluaran', { ascending: false });

  allPengeluaran = data || [];
  const tbody = document.getElementById('tbody-pengeluaran');

  if (!allPengeluaran.length) {
    tbody.innerHTML = '<tr><td colspan="5">Belum ada pengeluaran</td></tr>';
    return;
  }

  tbody.innerHTML = allPengeluaran.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${formatTanggal(p.tanggal_pengeluaran)}</td>
      <td class="nama-cell">${p.keterangan || '-'}</td>
      <td>${formatRupiah(p.nominal)}</td>
      <td class="admin-only">
        <button class="btn btn-danger" onclick="hapusPengeluaran(${p.id})">Hapus</button>
      </td>
    </tr>
  `).join('');
}

async function tambahPengeluaran(e) {
  e.preventDefault();
  const tanggal = document.getElementById('input-tgl-pengeluaran').value;
  const keterangan = document.getElementById('input-ket-pengeluaran').value.trim();
  const nominal = parseInt(document.getElementById('input-nominal-pengeluaran').value);

  if (!tanggal || !keterangan || !nominal) return;

  const { error } = await supabase.from('pengeluaran').insert({
    tanggal_pengeluaran: tanggal,
    keterangan,
    nominal,
  });

  if (error) {
    alert('Gagal tambah pengeluaran: ' + error.message);
    return;
  }

  document.getElementById('input-tgl-pengeluaran').value = '';
  document.getElementById('input-ket-pengeluaran').value = '';
  document.getElementById('input-nominal-pengeluaran').value = '';
  loadPengeluaran();
}

async function hapusPengeluaran(id) {
  if (!confirm('Yakin hapus pengeluaran ini?')) return;
  const { error } = await supabase.from('pengeluaran').delete().eq('id', id);
  if (error) {
    alert('Gagal hapus: ' + error.message);
    return;
  }
  loadPengeluaran();
}

// ══════════════════════════════════════════════
// CETAK LPJ
// ══════════════════════════════════════════════
async function loadCetak() {
  // Fetch fresh data
  const [angRes, payRes, expRes] = await Promise.all([
    supabase.from('anggota').select('*').order('nama'),
    supabase.from('pembayaran_kas').select('*'),
    supabase.from('pengeluaran').select('*').order('tanggal_pengeluaran'),
  ]);

  const anggota = angRes.data || [];
  const pembayaran = payRes.data || [];
  const pengeluaran = expRes.data || [];

  const totalBayar = pembayaran.filter(p => p.apakah_bayar).length * TARIF_KAS;
  const totalDenda = pembayaran.filter(p => p.kena_denda).length * TARIF_DENDA;
  const totalPemasukan = totalBayar + totalDenda;
  const totalPengeluaran = pengeluaran.reduce((s, p) => s + (p.nominal || 0), 0);
  const saldo = totalPemasukan - totalPengeluaran;

  document.getElementById('lpj-periode').textContent =
    `Periode: ${formatTanggal(START_DATE)} - ${formatTanggal(new Date().toISOString().slice(0, 10))}`;

  let html = `
    <h3>A. Ringkasan Keuangan</h3>
    <table class="lpj-table">
      <tr><td>Total Pemasukan Kas</td><td>${formatRupiah(totalBayar)}</td></tr>
      <tr><td>Total Pemasukan Denda</td><td>${formatRupiah(totalDenda)}</td></tr>
      <tr><td><strong>Total Pemasukan</strong></td><td><strong>${formatRupiah(totalPemasukan)}</strong></td></tr>
      <tr><td>Total Pengeluaran</td><td>${formatRupiah(totalPengeluaran)}</td></tr>
      <tr><td><strong>Saldo Akhir</strong></td><td><strong>${formatRupiah(saldo)}</strong></td></tr>
    </table>

    <h3>B. Rincian Pembayaran Anggota</h3>
    <table class="lpj-table">
      <tr><th>No</th><th>Nama</th><th>Minggu Bayar</th><th>Total Bayar</th><th>Total Denda</th></tr>
  `;

  anggota.forEach((a, i) => {
    const bayar = pembayaran.filter(p => p.anggota_id === a.id && p.apakah_bayar).length;
    const denda = pembayaran.filter(p => p.anggota_id === a.id && p.kena_denda).length;
    html += `<tr>
      <td>${i + 1}</td>
      <td>${a.nama}</td>
      <td>${bayar} minggu</td>
      <td>${formatRupiah(bayar * TARIF_KAS)}</td>
      <td>${formatRupiah(denda * TARIF_DENDA)}</td>
    </tr>`;
  });

  html += '</table>';

  if (pengeluaran.length) {
    html += `
      <h3>C. Rincian Pengeluaran</h3>
      <table class="lpj-table">
        <tr><th>No</th><th>Tanggal</th><th>Keterangan</th><th>Nominal</th></tr>
    `;
    pengeluaran.forEach((p, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td>${formatTanggal(p.tanggal_pengeluaran)}</td>
        <td>${p.keterangan || '-'}</td>
        <td>${formatRupiah(p.nominal)}</td>
      </tr>`;
    });
    html += '</table>';
  }

  document.getElementById('lpj-body').innerHTML = html;
}

function cetakLPJ() {
  window.print();
}

// ══════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════
async function ubahPassword(e) {
  e.preventDefault();
  const pw = document.getElementById('input-new-password').value;
  const pw2 = document.getElementById('input-confirm-password').value;
  const statusEl = document.getElementById('settings-status');

  if (pw !== pw2) {
    statusEl.textContent = '❌ Password tidak sama!';
    statusEl.className = 'status-msg error';
    return;
  }

  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) {
    statusEl.textContent = '❌ Gagal ubah password: ' + error.message;
    statusEl.className = 'status-msg error';
    return;
  }

  statusEl.textContent = '✅ Password berhasil diubah!';
  statusEl.className = 'status-msg success';
  document.getElementById('input-new-password').value = '';
  document.getElementById('input-confirm-password').value = '';
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Setup navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Check existing session
  await checkSession();

  // Load dashboard
  loadDashboard();
});

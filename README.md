# SEKAR

Sistem Event, Keuangan, dan Administrasi Terintegrasi.

- **Pengguna aplikasi:** baca [TUTORIAL-PENGGUNAAN.md](TUTORIAL-PENGGUNAAN.md).
- **Developer dan admin server:** lanjutkan membaca dokumen ini.

## Isi repo

Repo ini memakai monorepo npm workspaces.

| Folder / berkas | Isi |
| --- | --- |
| `client/` | React 19 + React Router + TanStack Query + Tailwind v4 (Vite). Client tidak menyimpan data sendiri; semua data diambil dari API. |
| `server/` | Express 5 + Prisma 7 (MySQL 8). Berisi REST API di `/api`, autentikasi, dan penyimpanan unggahan. |
| `docker/`, `Dockerfile`, `docker-compose*.yml` | Deployment dalam satu image. Express juga menyajikan hasil build React, jadi aplikasi berjalan di satu origin. |
| `branding/` | Berkas master resolusi penuh (logo, ilustrasi halaman masuk). Tidak ikut ter-deploy. |
| `.env.example`, `server/.env.example` | Contoh konfigurasi. Berkas `.env` asli berisi rahasia dan tidak boleh di-commit (sudah ada di `.gitignore`). |

## Arsitektur singkat

- **Data:** seluruh data ada di MySQL dan tidak ada data contoh (seed dummy).
  - Bootstrap pertama (`server/prisma/seed.ts`) hanya membuat tiga hal: profil organisasi, akun admin pertama (dari env), dan daftar awal kategori keuangan, metode pembayaran, serta jenis dokumen.
  - Daftar awal itu bisa diubah lewat **Pengaturan**.
- **Autentikasi:**
  - Masuk dengan **username** + kata sandi. Email pengguna hanya kontak opsional.
  - JWT disimpan di cookie httpOnly (access + refresh) dengan proteksi CSRF double-submit dan kata sandi argon2id.
  - Kotak "Ingat saya" menentukan apakah cookie refresh tetap ada setelah browser ditutup.
  - Logout, ganti kata sandi, perubahan peran/username, atau menonaktifkan akun langsung mencabut semua sesi akun tersebut.
- **Verifikasi dua langkah (MFA):** TOTP (RFC 6238) yang kompatibel dengan Google Authenticator, Microsoft Authenticator, dan Authy.
  - Setiap pengguna bisa mengaktifkannya sendiri di **Pengaturan › Akun Saya**. Admin bisa mewajibkannya untuk semua pengguna di **Pengaturan › Keamanan**.
  - Setelah kata sandi benar, server hanya memberi tiket 10 menit (`sk_mfa`). Sesi baru dibuat setelah kode benar.
  - Rahasia TOTP disimpan terenkripsi AES-256-GCM dengan `MFA_ENCRYPTION_KEY`. Kode yang sama tidak bisa dipakai dua kali, dan kode salah dibatasi 10 kali per akun per 15 menit.
  - Saat pemasangan, pengguna mendapat 10 kode pemulihan sekali pakai (disimpan sebagai HMAC). Admin bisa mereset MFA pengguna lain bila ponselnya hilang.
  - Bila MFA diwajibkan, sesi lama yang belum ber-MFA hanya bisa dipakai untuk memasang MFA (API lain menjawab `403 MFA_WAJIB`).
- **Hak akses:**
  - Matriks per peran ada di `server/src/services/izin.ts` dan menjadi satu-satunya sumber kebenaran.
  - Server mengirim daftar izin di `/api/auth/me`, dan client memakainya untuk menyembunyikan tombol.

  | Peran | Akses |
  | --- | --- |
  | Admin | Semua, termasuk pengguna, pengaturan, dan hapus event |
  | Bendahara | Keuangan + event |
  | Anggota Tim | Event, dokumen, peserta, vendor, kebutuhan |
  | Peninjau | Hanya baca |

- **Unggahan:**
  - Bukti transaksi, dokumen, dan tanda tangan disimpan di `server/uploads/privat`. Berkasnya hanya bisa diambil lewat API yang memeriksa sesi.
  - Logo organisasi disimpan di `server/uploads/publik`.
  - Jenis berkas divalidasi dari isinya (magic bytes), bukan dari nama berkas.
- **Tampilan memuat:** setiap halaman dimuat terpisah saat pertama dibuka (code splitting). Selama data atau halaman dimuat, tampil kerangka (skeleton) sesuai bentuk kontennya. Saat periode laporan diganti, data lama tetap tampil sampai data baru siap.
- **Unggah berkas:** bukti transaksi, dokumen, logo, dan tanda tangan dikirim lewat XHR sehingga persentase progres tampil. Berkas di atas `MAX_UPLOAD_MB` ditolak sebelum dikirim.
- **Tanpa hardcode:**
  - Tanggal "hari ini" mengikuti `APP_TIMEZONE`.
  - Nama organisasi, logo, pengguna, kategori, metode bayar, jenis dokumen, dan template kebutuhan semuanya dikelola di Pengaturan.
  - Penyusun laporan diambil dari pengguna yang sedang login.

## Deployment (Docker)

Satu container `app` (API + web) dan satu container `db` (MySQL 8.4). MySQL tidak dibuka ke luar server. Setiap kali container `app` start, `docker/start.sh` menjalankan tiga langkah berurutan:

1. `prisma migrate deploy`
2. Bootstrap yang idempoten
3. Server

### Kebutuhan server

- Linux dengan Docker Engine 24+ dan Docker Compose v2 (`docker compose version`).
- Git.
- RAM bebas sekitar 1 GB, serta ruang disk untuk database dan unggahan.
- Satu port host yang belum terpakai untuk aplikasi. Default-nya `8030`.

  Di server deploy saat ini, port 80, 443, 8021, dan 9001 sudah dipakai layanan lain. Jangan pakai port itu.

### 1. Ambil kode

```bash
git clone <url-repo> sekar
cd sekar
```

### 2. Isi konfigurasi `.env`

```bash
cp .env.example .env
chmod 600 .env
# Isi lima rahasia acak sekaligus (setiap nilai berbeda):
for k in DB_PASSWORD DB_ROOT_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET MFA_ENCRYPTION_KEY; do
  sed -i "s|^$k=.*|$k=$(openssl rand -hex 32)|" .env
done
```

| Variabel | Isi |
| --- | --- |
| `APP_PORT` | Port host aplikasi (default `8030`). |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | Kata sandi MySQL. Gunakan hex dari `openssl rand -hex 32` agar aman dipakai di URL koneksi. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Dua rahasia acak yang **berbeda**, minimal 32 karakter. |
| `MFA_ENCRYPTION_KEY` | Kunci enkripsi rahasia MFA di database: tepat 64 karakter hex (`openssl rand -hex 32`). |
| `COOKIE_SECURE` | `true` bila diakses lewat HTTPS (wajib untuk produksi). `false` hanya untuk uji coba lewat `http://IP:port`. |
| `TRUST_PROXY` | `1` bila aplikasi berada di belakang reverse proxy (Caddy/nginx). `false` bila diakses langsung. |
| `MAX_UPLOAD_MB` | Batas ukuran unggahan (default 10). |
| `APP_TIMEZONE` | Zona waktu acuan "hari ini", mis. `Asia/Jakarta`. |
| `SEED_ORG_NAME`, `SEED_ADMIN_NAME`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD` | Nama organisasi dan akun admin pertama. Username 3–32 karakter (huruf kecil, angka, `.`, `_`, `-`); kata sandi minimal 8 karakter. |

Perhatikan perilaku beberapa variabel setelah instalasi pertama:

- **`SEED_*`** hanya dipakai saat database masih kosong. Mengubahnya nanti **tidak** mengganti nama organisasi atau kata sandi admin yang sudah ada. Ubah data itu lewat aplikasi.
- **`DB_PASSWORD` dan `DB_ROOT_PASSWORD`** hanya dipakai MySQL saat volume database pertama kali dibuat. Kalau diganti di `.env` setelah itu, aplikasi tidak bisa terhubung lagi. Untuk menggantinya, ubah dulu kata sandi di MySQL, baru ubah `.env`.
- **`JWT_*`**: mengganti nilainya membuat semua pengguna harus masuk ulang.
- **`MFA_ENCRYPTION_KEY`**: jangan diganti setelah ada pengguna yang memakai MFA. Rahasia lama tidak bisa dibaca lagi, sehingga semua MFA harus direset dan dipasang ulang. Simpan salinan `.env` di tempat aman bersama backup.

### 3. Jalankan

```bash
docker compose up -d --build
docker compose ps                         # tunggu sampai app berstatus "healthy"
docker compose logs -f app                # lihat migrasi & bootstrap, Ctrl+C untuk keluar
curl http://127.0.0.1:8030/api/health     # {"status":"ok"}
```

Buka aplikasi, lalu masuk dengan `SEED_ADMIN_USERNAME` dan `SEED_ADMIN_PASSWORD`. Setelah itu:

1. Ganti kata sandi dan aktifkan verifikasi dua langkah di **Pengaturan › Akun Saya**.
2. Lengkapi **Profil Organisasi**: logo dan kota. Kota dipakai di Bukti Penerimaan Dana.
3. Undang pengguna lain.

Buat minimal dua akun admin. Aplikasi tidak punya fitur reset lewat email, jadi admin yang lupa kata sandi atau kehilangan ponsel MFA (dan kode pemulihannya) hanya bisa di-reset oleh admin lain.

### 4. HTTPS lewat reverse proxy (disarankan)

Pasang domain di reverse proxy yang sudah ada di server, lalu ubah dua nilai di `.env`:

```env
COOKIE_SECURE=true
TRUST_PROXY=1
```

Terapkan perubahannya dengan `docker compose up -d`.

**Caddy terpasang langsung di host:**

```caddy
sekar.domain-anda.id {
    reverse_proxy 127.0.0.1:8030
}
```

**Caddy berjalan di container Docker.** Di dalam container Caddy, `127.0.0.1` menunjuk ke container itu sendiri, bukan ke host. Sambungkan container Caddy ke network SEKAR, lalu arahkan ke container app:

```bash
docker network connect sekar_default <nama-container-caddy>
```

```caddy
sekar.domain-anda.id {
    reverse_proxy sekar-app-1:4000
}
```

Network `sekar_default` dibuat ulang setiap kali menjalankan `docker compose down`. Setelah itu, jalankan ulang `docker network connect`.

### Memperbarui aplikasi

```bash
git pull
docker compose up -d --build     # migrasi database berjalan otomatis saat app start
docker image prune -f            # opsional: hapus image lama
```

Data di volume `sekar-db` dan `sekar-uploads` tetap aman saat container dibuat ulang. **Jangan** menjalankan `docker compose down -v`, karena flag `-v` menghapus volume beserta seluruh data.

### Backup & restore

Data ada di dua volume: `sekar_sekar-db` (MySQL) dan `sekar_sekar-uploads` (berkas unggahan). Cadangkan keduanya secara rutin, misalnya lewat cron setiap malam, dan simpan salinannya di luar server. Folder `backups/` sudah ada di `.gitignore`.

```bash
mkdir -p backups
# Database
docker compose exec -T db sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction sekar' \
  | gzip > backups/sekar-db-$(date +%F).sql.gz
# Unggahan
docker run --rm -v sekar_sekar-uploads:/data -v "$PWD/backups":/backup alpine \
  tar czf /backup/sekar-uploads-$(date +%F).tar.gz -C /data .
```

Restore (ganti tanggal sesuai berkas):

```bash
gunzip -c backups/sekar-db-2026-10-07.sql.gz \
  | docker compose exec -T db sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" sekar'
docker run --rm -v sekar_sekar-uploads:/data -v "$PWD/backups":/backup alpine \
  sh -c 'cd /data && tar xzf /backup/sekar-uploads-2026-10-07.tar.gz'
docker compose restart app
```

### Masalah umum

| Gejala | Penyebab & solusi |
| --- | --- |
| `port is already allocated` | `APP_PORT` sudah dipakai layanan lain. Ganti port di `.env`. |
| `Isi ... di file .env` saat `docker compose up` | Variabel wajib masih kosong. Lengkapi `.env`. |
| Setelah masuk, langsung kembali ke halaman login | `COOKIE_SECURE=true` tetapi aplikasi dibuka lewat `http://`. Pakai HTTPS, atau set `false` khusus untuk uji coba. |
| Semua pengguna kena "terlalu banyak percobaan" | Aplikasi di belakang proxy tetapi `TRUST_PROXY` belum `1`, sehingga semua pengguna terbaca dari satu IP. |
| App tidak pernah `healthy` | Cek `docker compose logs app`. Biasanya koneksi database gagal (lihat catatan `DB_PASSWORD` di atas), migrasi gagal, atau ada variabel `.env` yang tidak valid (pesannya tampil di log). |
| Kode Google Authenticator selalu ditolak | Jam server atau ponsel tidak tepat. TOTP hanya menoleransi selisih ±30 detik; aktifkan sinkronisasi waktu otomatis (NTP) di server dan ponsel. |
| Satu-satunya admin kehilangan ponsel dan kode pemulihan | Masuk ke MySQL dengan `docker compose exec db mysql -uroot -p sekar` (kata sandi: `DB_ROOT_PASSWORD`), lalu jalankan `UPDATE Pengguna SET mfaRahasia = NULL, mfaRahasiaBaru = NULL, mfaAktifSejak = NULL, mfaLangkahTerakhir = NULL, tokenVersion = tokenVersion + 1 WHERE username = 'admin';` (ganti `admin` dengan username-nya). Bila MFA diwajibkan, admin memasang ulang saat masuk berikutnya. |
| Memperbarui dari versi lama yang masih login dengan email | `.env` lama memakai `SEED_ADMIN_EMAIL`. Ganti menjadi `SEED_ADMIN_USERNAME` dan tambahkan `MFA_ENCRYPTION_KEY`. Migrasi otomatis mengisi username dari bagian depan email (mis. `fajar@contoh.id` → `fajar`). |

## Pengembangan lokal

Butuh Node ≥ 22 dan MySQL 8. MySQL bisa dari Laragon/XAMPP, atau `npm run db:up` bila memakai Docker.

```bash
npm install
cp server/.env.example server/.env    # isi DATABASE_URL, TEST_DATABASE_URL, JWT_*, SEED_*
npm run setup                          # prisma generate + migrasi + bootstrap
npm run dev                            # API :4000 + Vite :5173 (proxy /api & /uploads)
```

Buka http://localhost:5173, lalu masuk dengan `SEED_ADMIN_USERNAME` dan `SEED_ADMIN_PASSWORD`.

| Perintah | Fungsi |
| --- | --- |
| `npm test` | Tes API server (supertest ke `TEST_DATABASE_URL`; isi database ini dikosongkan tiap tes) + tes client |
| `npm run typecheck` | Typecheck kedua workspace |
| `npm run build` | Build server (`server/dist`) + client (`client/dist`) |
| `npm run db:migrate` | Membuat migrasi baru setelah mengubah `schema.prisma` |

`TEST_DATABASE_URL` wajib menunjuk ke database terpisah yang namanya mengandung "test", karena isinya dihapus setiap kali tes berjalan.

## API

Semua endpoint ada di `/api` dan memerlukan sesi, kecuali `health`, `info`, `organisasi/publik`, serta `auth/csrf|login|login/mfa*|refresh|me`.

| Sumber daya | Endpoint |
| --- | --- |
| Sesi | `POST auth/login`, `auth/refresh`, `auth/logout`, `PUT auth/kata-sandi`, `GET auth/me`, `PUT/DELETE auth/tanda-tangan` |
| MFA | Login: `POST auth/login/mfa`, `auth/login/mfa/pasang`, `auth/login/mfa/aktifkan`. Akun sendiri: `GET auth/mfa`, `POST auth/mfa/pasang|aktifkan|nonaktifkan|kode-pemulihan` |
| Organisasi | `GET/PUT organisasi`, `PATCH organisasi/notifikasi`, `PATCH organisasi/keamanan`, `POST/DELETE organisasi/logo` |
| Master data | `GET master`; `POST/DELETE master/kategori|metode|jenis-dokumen`; `POST/PUT/DELETE master/template` |
| Pengguna | `GET/POST pengguna`, `PUT pengguna/:id`, `DELETE pengguna/:id/mfa`, `GET pengguna/:id/tanda-tangan` |
| Event | `GET/POST event`, `GET/PUT/DELETE event/:id`, `PUT event/:id/anggaran` |
| Per event | `GET/POST event/:id/{transaksi,tugas,dokumen,peserta,vendor}`, `POST event/:id/peserta/impor` |
| Item | `GET transaksi/:id/bukti`, `DELETE transaksi/:id`; `PATCH/DELETE tugas/:id`; `GET dokumen/:id/unduh`, `PATCH/DELETE dokumen/:id`; `PATCH/DELETE peserta/:id`; `PUT/DELETE vendor/:id` |
| Laporan | `GET laporan/rekap?dari&sampai&status`, `GET notifikasi` |

## Bukti Penerimaan Dana

Setiap transaksi **pemasukan** mendapat nomor bukti otomatis `BPD-YYYYMMDD-XXX`. Nomornya berurutan per tanggal transaksi dan dijamin unik oleh indeks database. Bukti bisa dibuka dari dua tempat: toast setelah transaksi disimpan ("Lihat Bukti Penerimaan"), atau panel Detail Transaksi.

- **Template:** `client/public/templates/sekar/bukti-penerimaan-background.png` hanya dipakai sebagai latar statis.
  - Semua teks (nomor, tanggal, pemberi dana, nominal, terbilang, detail, tanda tangan) dirender dari data transaksi.
  - Template tidak memuat logo. Logo SEKAR di kiri atas juga dirender sebagai elemen.
  - Format kertas A4 landscape, mengikuti orientasi template.
- **Satu mesin tata letak:** `client/src/features/bukti/tataLetak.ts` menghasilkan operasi gambar dalam milimeter. Hasil itu dipakai oleh:
  - SVG untuk pratinjau dan **Cetak Bukti** (hanya halaman bukti, A4 landscape tanpa margin).
  - Canvas untuk **Unduh PNG** (300 DPI, 3508×2480).
  - `pdf-lib` untuk **Unduh PDF**: PDF vektor dengan teks yang bisa diseleksi dan font tertanam. Library ini baru dimuat saat tombol diklik.

  Karena ketiganya memakai operasi dan berkas font yang sama, hasil unduhan identik dengan pratinjau.
- **Data:**
  - Wajib untuk pemasukan: pemberi dana ("Diterima dari"), kategori, metode, nominal > 0.
  - Opsional: keterangan pemberi, bank, nomor rekening, nomor referensi, catatan.
  - Nomor rekening disamarkan di bukti (`****-****-7890`).
- **Terbilang:** `client/src/lib/terbilang.ts`, tanpa layanan eksternal.
- **Tanda tangan:** setiap pengguna mengunggah sendiri gambar tanda tangannya di **Pengaturan › Akun Saya**.
  - Format PNG transparan, JPG, atau WEBP, maksimal 2 MB.
  - Kolom "Dibuat oleh" otomatis memakai tanda tangan pencatat transaksi. Kolom "Mengetahui" memakai tanda tangan PIC event.
  - Gambar disimpan privat (`uploads/privat/tanda-tangan`) dan hanya bisa diambil pengguna yang login.
  - Hanya pemilik akun yang bisa mengganti atau menghapus tanda tangannya.
  - Gambar ditempel dengan mode *multiply* di pratinjau, PNG, dan PDF, sehingga latar putih hasil foto atau scan menyatu dengan template.
  - Bila pengguna belum mengunggah, bukti menampilkan garis tanda tangan kosong.

## Catatan

- **Logo & favicon:**
  - Logo aplikasi dipakai di sidebar, halaman masuk, kepala laporan, dan Bukti Penerimaan Dana. Berkasnya `client/public/logo/sekar-logo.png`, yaitu versi web 512 px dari `branding/SEKAR_logo.png`. Bila logo master diganti, buat ulang versi web ini.
  - Di latar navy, logo diletakkan di atas kotak putih karena warna birunya hampir sama dengan latar.
  - Ilustrasi halaman masuk memakai `client/public/ilustrasi/login-800.webp` dan `login-1400.webp`, versi web dari `branding/SEKAR_Front.png` (dipilih browser sesuai lebar layar). Bila master diganti, buat ulang kedua berkas ini.
  - Favicon, ikon Apple, dan manifest PWA ada di `client/public/favicon/`.
  - Judul tab browser mengikuti nama organisasi.
- **Export Excel** mengunduh CSV (pemisah `;`, UTF-8 BOM). **Export PDF** memakai dialog cetak browser dengan gaya cetak khusus laporan.
- **Impor peserta** dari CSV butuh kolom `nama`. Kolom `email`, `telepon`, `tipe`, `registrasi`, dan `kehadiran` opsional.
- **Notifikasi** dihitung saat panel dibuka. Isinya kebutuhan yang sudah lewat atau mendekati tenggat, dan event dengan pengeluaran ≥ 90% budget. Notifikasi lewat email belum ada karena belum ada SMTP.
- **Progres event** dihitung dari porsi kebutuhan yang sudah selesai. Event berstatus Selesai selalu 100%.

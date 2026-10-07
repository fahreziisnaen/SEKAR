# Panduan Penggunaan SEKAR

SEKAR (Sistem Event, Keuangan, dan Administrasi Terintegrasi) membantu tim mengelola event dari perencanaan sampai laporan. Data event, pemasukan dan pengeluaran, dokumen, peserta, vendor, dan laporan semuanya ada di satu tempat.

Panduan ini untuk semua pengguna SEKAR. Bagian yang hanya bisa dilakukan peran tertentu diberi tanda, misalnya **(Admin)**.

## Daftar isi

1. [Masuk dan keluar](#1-masuk-dan-keluar)
2. [Mengenal tampilan](#2-mengenal-tampilan)
3. [Peran dan hak akses](#3-peran-dan-hak-akses)
4. [Persiapan awal (Admin)](#4-persiapan-awal-admin)
5. [Akun Saya: tanda tangan dan kata sandi](#5-akun-saya-tanda-tangan-dan-kata-sandi)
6. [Event](#6-event)
7. [Keuangan](#7-keuangan)
8. [Bukti Penerimaan Dana](#8-bukti-penerimaan-dana)
9. [Administrasi](#9-administrasi)
10. [Laporan](#10-laporan)
11. [Notifikasi](#11-notifikasi)
12. [Pertanyaan umum](#12-pertanyaan-umum)

---

## 1. Masuk dan keluar

### Masuk

1. Buka alamat SEKAR yang diberikan admin.
2. Isi **Email** dan **Kata sandi**, lalu klik **Masuk**.
3. Centang **Ingat saya** hanya di perangkat pribadi. Dengan opsi ini, Anda tetap masuk walaupun browser ditutup.

Setelah beberapa kali salah memasukkan kata sandi, akun dikunci sementara. Tunggu 15 menit sebelum mencoba lagi.

### Lupa kata sandi

SEKAR tidak mengirim email reset kata sandi. Hubungi admin organisasi Anda. Admin akan membuatkan kata sandi baru lewat **Pengaturan › Pengguna**.

### Keluar

Klik **Keluar** di bagian bawah menu samping kiri.

Anda otomatis diminta masuk lagi kalau kata sandi Anda baru diganti, peran Anda diubah admin, atau akun Anda dinonaktifkan.

---

## 2. Mengenal tampilan

### Menu utama

Di komputer, menu ada di samping kiri. Di HP, menu ada di bar bawah layar.

| Menu | Isi |
| --- | --- |
| **Beranda** | Ringkasan semua event: jumlah event, total pemasukan, pengeluaran, saldo, grafik per event, event terbaru, dan pekerjaan yang masih harus dikerjakan. |
| **Event** | Daftar event, pembuatan event baru, dan detail setiap event. |
| **Keuangan** | Transaksi dan ringkasan keuangan event aktif. |
| **Administrasi** | Dokumen, peserta, vendor, tim, dan kebutuhan event aktif. |
| **Laporan** | Laporan resmi yang bisa diekspor ke Excel atau PDF. |
| **Pengaturan** | Profil organisasi, pengguna, kategori, dan akun Anda. |

### Event aktif

Di bagian atas layar ada kotak **Event aktif**. Menu **Keuangan**, **Administrasi**, dan **Laporan** selalu menampilkan data event yang sedang aktif.

- Untuk berganti event, klik kotak tersebut lalu pilih event lain.
- Membuka halaman detail sebuah event juga otomatis menjadikannya event aktif.

Kalau data di Keuangan atau Administrasi terlihat kosong, pastikan dulu event aktifnya sudah benar.

### Notifikasi

Ikon lonceng di kanan atas menampilkan pengingat penting. Penjelasannya ada di [bagian 11](#11-notifikasi).

---

## 3. Peran dan hak akses

Setiap pengguna punya satu peran. Tombol untuk tindakan yang tidak diizinkan tidak akan muncul.

| Tindakan | Admin | Bendahara | Anggota Tim | Peninjau |
| --- | :---: | :---: | :---: | :---: |
| Melihat semua data dan laporan | ✓ | ✓ | ✓ | ✓ |
| Mengatur tanda tangan dan kata sandi sendiri | ✓ | ✓ | ✓ | ✓ |
| Membuat dan mengubah event, kebutuhan, dokumen, peserta, vendor | ✓ | ✓ | ✓ | |
| Mencatat dan menghapus transaksi, mengatur budget per kategori | ✓ | ✓ | | |
| Menghapus event | ✓ | | | |
| Mengelola pengguna dan pengaturan organisasi | ✓ | | | |

---

## 4. Persiapan awal (Admin)

Lakukan langkah berikut sekali setelah SEKAR dipasang. Semuanya ada di menu **Pengaturan**.

### 4.1 Profil Organisasi

1. Buka **Pengaturan › Profil Organisasi**.
2. Isi **Nama organisasi**, **Email**, **Telepon**, dan **Kota**, lalu klik **Simpan Perubahan**.
   - **Kota** dipakai sebagai tempat tanda tangan di Bukti Penerimaan Dana, misalnya "Surabaya, 12 April 2025".
3. Klik **Ganti Logo** untuk mengunggah logo organisasi (PNG, JPG, atau WEBP, sebaiknya persegi). Logo ini tampil di kepala laporan dan Bukti Penerimaan Dana.

### 4.2 Pengguna

1. Buka **Pengaturan › Pengguna**, lalu klik **+ Undang Pengguna**.
2. Isi data berikut, lalu klik **Simpan**:
   - **Nama** dan **Email** (wajib).
   - **Peran** (lihat [bagian 3](#3-peran-dan-hak-akses)).
   - **Jabatan di tim**, **Telepon**, dan **Tanggung jawab**.
   - **Kata sandi awal** (minimal 8 karakter, wajib).
3. **Sampaikan email dan kata sandi awal kepada orang tersebut secara langsung.** SEKAR tidak mengirim email undangan. Minta mereka segera mengganti kata sandinya.

Untuk mengubah pengguna, klik namanya di daftar. Dari sana Anda bisa:

- Mengganti peran.
- Mengatur ulang kata sandi lewat kolom **Reset kata sandi**. Kosongkan kolom ini bila kata sandi tidak diubah.
- Menonaktifkan akun dengan menghilangkan centang **Akun aktif**. Pengguna nonaktif tidak bisa masuk, tetapi riwayat datanya tetap tersimpan.

Kolom tanda tangan di daftar pengguna menunjukkan siapa saja yang sudah mengunggah tanda tangan.

Buat minimal **dua akun Admin**. Admin yang lupa kata sandi hanya bisa di-reset oleh admin lain.

### 4.3 Kategori Keuangan

Buka **Pengaturan › Kategori Keuangan**. Di halaman ini ada tiga daftar:

- **Kategori pemasukan**, misalnya Sponsorship, Penjualan Tiket, atau Donasi.
- **Kategori pengeluaran**.
- **Metode pembayaran**, misalnya Transfer Bank, Tunai, atau QRIS.

Klik **+ Tambah** untuk menambah item, atau **×** untuk menghapusnya. Kategori atau metode yang sudah dipakai di transaksi tidak bisa dihapus.

### 4.4 Pengaturan Event

Buka **Pengaturan › Pengaturan Event**.

- **Template event** berisi daftar kebutuhan standar, misalnya "Konfirmasi venue" dan "Kontrak vendor utama". Saat membuat event, Anda bisa memilih template agar daftar kebutuhannya langsung terisi.
  - Klik **+ Template**, isi nama, deskripsi, dan kebutuhan (satu per baris), lalu klik **Simpan**.
- **Jenis dokumen** adalah pilihan jenis saat mengunggah dokumen, misalnya Proposal, Rundown, Kontrak, atau Invoice.

### 4.5 Notifikasi

Di **Pengaturan › Notifikasi**, aktifkan atau matikan dua jenis pengingat:

- **Pengingat tenggat**
- **Peringatan keuangan**

---

## 5. Akun Saya: tanda tangan dan kata sandi

Semua peran bisa membuka **Pengaturan › Akun Saya**.

### Mengunggah tanda tangan

Tanda tangan Anda otomatis tampil di Bukti Penerimaan Dana:

- Di kolom **Dibuat oleh**, untuk pemasukan yang Anda catat.
- Di kolom **Mengetahui**, untuk event yang Anda pimpin sebagai PIC.

Cara mengunggah:

1. Tanda tangani kertas putih polos dengan pulpen hitam atau biru.
2. Foto atau scan dengan cahaya terang dan posisi lurus, lalu potong (crop) rapat di sekitar tanda tangan.
3. Klik **Unggah Tanda Tangan** dan pilih gambarnya. Format PNG, JPG, atau WEBP, maksimal 2 MB.
   - PNG berlatar transparan memberi hasil terbaik.
   - Latar putih pada foto otomatis menyatu dengan bukti.

Gunakan **Ganti Tanda Tangan** untuk memperbarui, atau **Hapus** untuk menghapusnya. Hanya Anda sendiri yang bisa mengubah tanda tangan Anda.

### Mengganti kata sandi

1. Isi **Kata sandi saat ini**, **Kata sandi baru** (minimal 8 karakter), dan **Ulangi kata sandi baru**.
2. Klik **Ganti Kata Sandi**.

Setelah kata sandi diganti, sesi Anda di perangkat lain otomatis berakhir.

---

## 6. Event

### 6.1 Daftar event

Buka menu **Event** untuk melihat semua event beserta tanggal, lokasi, PIC, status, pemasukan, pengeluaran, dan untung/rugi. Di halaman ini Anda bisa:

- Memakai tab status di atas tabel untuk menyaring event.
- Mengetik di kotak **Cari** untuk mencari berdasarkan nama event, lokasi, atau PIC.
- Mengklik sebuah event untuk membuka detailnya.

### 6.2 Membuat event baru (Admin, Bendahara, Anggota Tim)

Klik **+ Event Baru**, lalu ikuti lima langkah berikut.

1. **Informasi Event:**
   - Wajib: **Nama Event**, **Tanggal**, dan **Lokasi** (kota).
   - Opsional: **Jam**, **Venue**, dan **Deskripsi**.
   - Pilih **Template kebutuhan** bila ingin daftar kebutuhan terisi otomatis.
2. **Tim:**
   - Pilih **PIC**, yaitu orang yang bertanggung jawab atas event. Tanda tangan PIC muncul di kolom "Mengetahui" pada Bukti Penerimaan Dana.
   - Centang anggota tim event.
3. **Keuangan:**
   - Isi **Budget** (wajib), **Target pemasukan**, dan **Estimasi pengeluaran**.
   - SEKAR langsung menghitung estimasi keuntungan atau kerugian.
4. **Administrasi:** unggah proposal dan dokumen awal seperti rundown atau surat, lalu pilih jenisnya. Langkah ini opsional.
5. **Review:** periksa ringkasannya, lalu klik **Buat Event**.

Untuk kembali ke langkah sebelumnya, klik **Kembali** atau klik nomor langkahnya. Semua data masih bisa diubah setelah event dibuat.

### 6.3 Halaman detail event

Bagian atas halaman detail menampilkan:

- Status event, tanggal, lokasi, dan PIC.
- **Progres event**, yaitu persentase kebutuhan yang sudah selesai.

Di bawahnya ada beberapa tab:

| Tab | Isi |
| --- | --- |
| **Overview** | Informasi event, timeline, transaksi terbaru, grafik keuangan, serta ringkasan kebutuhan, peserta, vendor, tim, dan dokumen. |
| **Keuangan** | Kartu ringkasan, ringkasan per kategori, dan daftar transaksi event ini. |
| **Administrasi** | Kebutuhan event dan tim. |
| **Peserta**, **Vendor**, **Dokumen** | Sama dengan menu Administrasi (lihat [bagian 9](#9-administrasi)). |
| **Laporan** | Laporan keuangan event ini. |

### 6.4 Mengubah event

Klik **Ubah Event** di halaman detail. Anda bisa mengubah semua informasi, termasuk PIC, tim, dan budget. Di form ini juga ada dua pilihan penting:

- **Status:**

  | Status | Arti |
  | --- | --- |
  | Draft | Event masih dalam perencanaan awal |
  | Akan Datang | Jadwal sudah pasti, persiapan berjalan |
  | Berlangsung | Hari pelaksanaan event |
  | Selesai | Event selesai, laporan dapat dibuat (progres otomatis 100%) |
  | Dibatalkan | Event tidak dilanjutkan |

- **Tahap timeline**, yang tampil di tab Overview: Perencanaan → Persiapan → Pelaksanaan → Evaluasi → Selesai.

Klik **Simpan Perubahan** setelah selesai.

### 6.5 Menghapus event (Admin)

Buka **Ubah Event**, klik **Hapus Event**, lalu konfirmasi.

**Penghapusan ini permanen.** Semua transaksi, dokumen, peserta, vendor, dan kebutuhan event tersebut ikut terhapus. Bila event hanya batal, sebaiknya ubah statusnya menjadi **Dibatalkan** agar datanya tetap tersimpan.

---

## 7. Keuangan

Menu **Keuangan** menampilkan data event aktif. Bagian atasnya berisi empat kartu:

- Total Pemasukan
- Total Pengeluaran
- Saldo
- Keuntungan (beserta marginnya)

### 7.1 Mencatat transaksi (Admin, Bendahara)

1. Klik **+ Tambah Transaksi**. Tombol ini ada di menu Keuangan dan di halaman detail event.
2. Pilih **Pemasukan** atau **Pengeluaran**.
3. Isi form:

   | Kolom | Keterangan |
   | --- | --- |
   | **Nominal** | Wajib. |
   | **Diterima dari** / **Dibayarkan kepada** | Wajib untuk pemasukan, misalnya "PT. Maju Bersama Sejahtera". |
   | **Keterangan pemberi** / **penerima** | Misalnya "Sponsor Event" atau "Vendor dekorasi". |
   | **Event**, **Tanggal** | Sudah terisi dengan event aktif dan tanggal hari ini; bisa diganti. |
   | **Kategori**, **Metode Pembayaran** | Pilihan diatur Admin di Pengaturan. |
   | **Bank**, **Nomor rekening**, **Nomor referensi** | Opsional. |
   | **Deskripsi** | Wajib, misalnya "Pelunasan dekorasi panggung". |
   | **Bukti Transaksi** | Foto nota atau bukti transfer (JPG, PNG, WEBP, atau PDF). |
   | **Catatan** | Opsional. Untuk pemasukan, catatan ikut tampil di Bukti Penerimaan Dana. |

4. Klik **Simpan Pemasukan** atau **Simpan Pengeluaran**.

Setelah pemasukan tersimpan, muncul tombol **Lihat Bukti Penerimaan** untuk langsung membuka buktinya.

### 7.2 Melihat dan menghapus transaksi

Di tab **Transaksi**, pakai filter **Semua**, **Pemasukan**, atau **Pengeluaran** untuk menyaring daftar. Klik sebuah transaksi untuk membuka **Detail transaksi**. Di panel detail ini ada:

- Seluruh data transaksi, termasuk nomor bukti, pencatat, dan waktu dicatat.
- Bukti transaksi yang diunggah. Klik **Unduh** untuk menyimpannya.
- Tombol **Lihat Bukti Penerimaan** (khusus pemasukan).
- Tombol **Hapus transaksi** (Admin, Bendahara). Penghapusan ini permanen.

Transaksi yang sudah tersimpan **tidak bisa diubah**. Bila ada yang salah, hapus transaksinya lalu catat ulang. Pemasukan yang dicatat ulang mendapat nomor bukti baru.

### 7.3 Ringkasan keuangan dan budget

Buka tab **Ringkasan Keuangan**. Di sana ada:

- Grafik **Pemasukan per Kategori** dan **Pengeluaran per Kategori**.
- **Budget vs Realisasi**, yang membandingkan budget dengan pengeluaran nyata per kategori. Kategori yang melebihi budget ditandai merah.

Untuk mengatur budget per kategori (Admin, Bendahara):

1. Klik **Atur Budget**.
2. Isi nominal untuk setiap kategori pengeluaran. Kosongkan kategori yang tidak dianggarkan.
3. Klik **Simpan Budget**.

---

## 8. Bukti Penerimaan Dana

Setiap **pemasukan** otomatis mendapat Bukti Penerimaan Dana, yaitu tanda terima resmi yang bisa dicetak atau dikirim ke pemberi dana.

### Nomor bukti

Formatnya **BPD-YYYYMMDD-XXX**. Contoh: `BPD-20250412-001` adalah bukti pertama untuk transaksi bertanggal 12 April 2025. Nomor dibuat otomatis, berurutan, dan tidak pernah ganda.

### Membuka bukti

Ada dua cara:

- Klik **Lihat Bukti Penerimaan** pada notifikasi yang muncul setelah menyimpan pemasukan.
- Buka **Detail transaksi** pemasukan, lalu klik **Lihat Bukti Penerimaan**.

### Isi bukti

Semua isi bukti diambil otomatis dari data transaksi:

- Pemberi dana, nominal, dan nominal dalam huruf (terbilang).
- Kategori, metode, bank, nomor referensi, dan catatan.
- Kota dan tanggal.
- Tanda tangan pencatat (**Dibuat oleh**) dan PIC event (**Mengetahui**).

Demi keamanan, nomor rekening ditampilkan tersamar, misalnya `****-****-7890`.

### Mencetak dan mengunduh

| Tombol | Kegunaan |
| --- | --- |
| **Cetak Bukti** | Mencetak bukti saja (kertas A4 landscape). Untuk membuat PDF lewat browser, pilih tujuan "Simpan sebagai PDF". |
| **Unduh PNG** | Gambar resolusi tinggi, cocok untuk dikirim lewat WhatsApp. |
| **Unduh PDF** | Dokumen PDF untuk email atau arsip. |

### Bila ada yang kurang

- **Kolom tanda tangan kosong:** pencatat atau PIC event belum mengunggah tanda tangan. Minta yang bersangkutan mengunggahnya di **Pengaturan › Akun Saya** (lihat [bagian 5](#5-akun-saya-tanda-tangan-dan-kata-sandi)), lalu buka bukti lagi.
- **Muncul pesan "Bukti penerimaan belum dapat dibuat. Lengkapi: …":** data wajib transaksi belum lengkap, biasanya pada transaksi lama yang belum punya isian "Diterima dari". Hapus transaksi tersebut, lalu catat ulang dengan data lengkap.

---

## 9. Administrasi

Menu **Administrasi** menampilkan data event aktif dalam lima tab: **Dokumen**, **Peserta**, **Vendor**, **PIC / Tim**, dan **Kebutuhan Event**. Isi yang sama juga ada di tab halaman detail event.

Admin, Bendahara, dan Anggota Tim bisa menambah dan mengubah data di sini. Peninjau hanya bisa melihat.

### 9.1 Dokumen

Untuk mengunggah dokumen:

1. Klik **Upload Dokumen**.
2. Pilih berkas (PDF, DOCX, XLSX, JPG, PNG, atau WEBP), isi **Nama dokumen**, dan pilih **Jenis**.
3. Klik **Unggah**.

Untuk dokumen yang sudah ada:

- Klik label status untuk mengubahnya: **Draft**, **Menunggu**, **Disetujui**, atau **Final**.
- Klik ikon unduh untuk menyimpan dokumen.
- Klik **×** untuk menghapus. Berkas ikut terhapus permanen.

### 9.2 Peserta

Bagian atas menampilkan statistik: Total Peserta, Sudah Registrasi, Hadir, dan Tidak Hadir.

Untuk menambah peserta satu per satu:

1. Klik **+ Tambah Peserta**.
2. Isi **Nama** (wajib), **Email**, **Nomor telepon**, **Tipe** (Anggota, Mitra, atau Umum), dan status **Registrasi**.
3. Klik **Simpan**.

Untuk mengubah status registrasi (Menunggu atau Terverifikasi) dan kehadiran (Belum, Hadir, atau Tidak hadir), klik labelnya langsung di tabel. Fitur ini praktis untuk absensi di hari event.

**Impor banyak peserta dari Excel:**

1. Siapkan tabel di Excel. Baris pertama berisi judul kolom:

   | nama | email | telepon | tipe | registrasi | kehadiran |
   | --- | --- | --- | --- | --- | --- |
   | Budi Santoso | budi@contoh.id | 08123456789 | umum | menunggu | belum |
   | Sari Dewi | sari@contoh.id | 08129876543 | mitra | terverifikasi | hadir |

   - Hanya kolom **nama** yang wajib.
   - Nilai yang diterima untuk **tipe**: `anggota`, `mitra`, `umum`.
   - Nilai yang diterima untuk **registrasi**: `menunggu`, `terverifikasi`.
   - Nilai yang diterima untuk **kehadiran**: `belum`, `hadir`, `tidak hadir`.
2. Simpan dengan **File › Save As › CSV**.
3. Klik **Impor CSV**, lalu pilih berkasnya. Baris tanpa nama akan dilewati.

### 9.3 Vendor

Untuk menambah vendor:

1. Klik **+ Tambah Vendor**.
2. Isi **Nama vendor** dan **Kategori** (misalnya Catering atau Venue), **PIC vendor**, **Kontak**, **Nilai kontrak**, **Sudah dibayar**, dan **Catatan**.
3. Klik **Simpan**.

Status pembayaran dihitung otomatis: **Belum Bayar**, **DP xx%**, atau **Lunas**. Ringkasan di atas tabel menampilkan total nilai kontrak, yang sudah terbayar, dan sisanya. Klik **✎** untuk mengubah vendor, atau **×** untuk menghapusnya.

Data vendor tidak otomatis tercatat di Keuangan. Saat membayar vendor, catat juga transaksinya sebagai **Pengeluaran** di menu Keuangan.

### 9.4 PIC / Tim

Tab ini menampilkan kartu PIC dan anggota tim event, berisi jabatan, tanggung jawab, dan telepon.

- Untuk mengubah susunan tim, gunakan **Ubah Event**.
- Jabatan, tanggung jawab, dan telepon diambil dari data pengguna. Admin mengubahnya di **Pengaturan › Pengguna**.

### 9.5 Kebutuhan Event

Kebutuhan adalah daftar pekerjaan persiapan event.

- **Menambah:** isi nama kebutuhan, pilih PIC dan tenggat, lalu klik **+ Tambah**.
- **Menandai selesai:** klik kebutuhannya. Klik lagi untuk membatalkan.
- **Menghapus:** arahkan kursor ke kebutuhan, lalu klik **×**.

Progres event dihitung dari jumlah kebutuhan yang sudah selesai. Kebutuhan yang mendekati atau melewati tenggat muncul di notifikasi.

---

## 10. Laporan

1. Buka menu **Laporan**.
2. Atur filter:
   - **Event:** event yang dilaporkan.
   - **Periode:** sepanjang event, bulan ini, kuartal berjalan, tahun berjalan, atau tahun lalu.
   - **Status:** hanya untuk laporan antar-event.
3. Pilih jenis laporan:

   | Jenis | Isi |
   | --- | --- |
   | Ringkasan Event | Informasi dan status satu event |
   | Laporan Keuangan | Semua transaksi beserta saldo berjalan |
   | Laporan Pemasukan | Rincian dana masuk |
   | Laporan Pengeluaran | Rincian dana keluar |
   | Keuntungan / Kerugian | Perbandingan untung/rugi antar event |
   | Rekap Event | Semua event dalam satu tabel |
   | Administrasi | Ringkasan dokumen, peserta, vendor, dan kebutuhan |

4. Ekspor laporannya:
   - **Export Excel** mengunduh berkas yang bisa dibuka di Excel.
   - **Export PDF** membuka dialog cetak. Pilih printer, atau pilih "Simpan sebagai PDF".

Nama penyusun laporan otomatis diambil dari akun yang sedang masuk.

---

## 11. Notifikasi

Klik ikon lonceng di kanan atas. Notifikasi berisi:

- **Kebutuhan event** yang belum selesai dan tenggatnya sudah lewat atau tinggal 2 hari lagi.
- **Peringatan keuangan** untuk event yang pengeluarannya sudah mencapai 90% budget atau lebih.

Hanya event berstatus Draft, Akan Datang, dan Berlangsung yang dipantau. Klik sebuah notifikasi untuk langsung membuka bagian event terkait: kebutuhan untuk pengingat tenggat, keuangan untuk peringatan budget.

Notifikasi hanya tampil di aplikasi dan tidak dikirim lewat email. Admin bisa mematikan setiap jenis notifikasi di **Pengaturan › Notifikasi**.

---

## 12. Pertanyaan umum

**Tombol seperti "+ Tambah Transaksi" atau "Upload Dokumen" tidak muncul.**
Peran Anda tidak memiliki izin untuk tindakan itu (lihat [bagian 3](#3-peran-dan-hak-akses)). Hubungi Admin bila perlu akses tambahan.

**Halaman Keuangan atau Administrasi kosong.**
Periksa kotak **Event aktif** di bagian atas layar. Mungkin event yang terpilih bukan event yang Anda maksud. Bila muncul tulisan "Belum ada event", buat event terlebih dahulu.

**Saya salah memasukkan nominal transaksi.**
Transaksi tidak bisa diubah. Hapus transaksi tersebut, lalu catat ulang (lihat [bagian 7.2](#72-melihat-dan-menghapus-transaksi)).

**Kategori atau metode pembayaran tidak bisa dihapus.**
Kategori atau metode itu sudah dipakai oleh transaksi. Ini mencegah data lama kehilangan kategorinya.

**Tiba-tiba diminta masuk lagi.**
Sesi Anda berakhir. Penyebabnya bisa karena kata sandi diganti, peran diubah, akun dinonaktifkan, atau sudah lama tidak aktif. Masuk kembali seperti biasa.

**Unggahan berkas ditolak.**
Periksa format dan ukuran berkas. SEKAR memeriksa isi berkas, bukan hanya namanya, jadi berkas yang ekstensinya diganti secara manual akan ditolak. Batas ukuran default 10 MB per berkas, dan 2 MB untuk tanda tangan.

**Tanda tangan saya tidak muncul di bukti.**
Pastikan sudah mengunggah tanda tangan di **Pengaturan › Akun Saya**. Tanda tangan muncul di kolom "Dibuat oleh" bila Anda yang mencatat pemasukannya, dan di kolom "Mengetahui" bila Anda PIC event-nya.

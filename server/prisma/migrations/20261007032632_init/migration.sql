-- CreateTable
CREATE TABLE `Organisasi` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `nama` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NULL,
    `telepon` VARCHAR(40) NULL,
    `kota` VARCHAR(120) NULL,
    `logoUrl` VARCHAR(255) NULL,
    `notifPengingatTenggat` BOOLEAN NOT NULL DEFAULT true,
    `notifPeringatanKeuangan` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pengguna` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `peran` ENUM('admin', 'bendahara', 'anggota', 'peninjau') NOT NULL DEFAULT 'anggota',
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `jabatan` VARCHAR(80) NULL,
    `telepon` VARCHAR(40) NULL,
    `tanggungJawab` VARCHAR(255) NULL,
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pengguna_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Event` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(160) NOT NULL,
    `tanggal` DATE NOT NULL,
    `waktu` VARCHAR(60) NULL,
    `lokasi` VARCHAR(120) NOT NULL,
    `venue` VARCHAR(200) NULL,
    `deskripsi` TEXT NULL,
    `status` ENUM('draft', 'akan_datang', 'berlangsung', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'akan_datang',
    `tahap` INTEGER NOT NULL DEFAULT 0,
    `budget` BIGINT NOT NULL DEFAULT 0,
    `targetPemasukan` BIGINT NOT NULL DEFAULT 0,
    `estimasiPengeluaran` BIGINT NOT NULL DEFAULT 0,
    `picId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Event_tanggal_idx`(`tanggal`),
    INDEX `Event_picId_idx`(`picId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnggotaEvent` (
    `eventId` INTEGER NOT NULL,
    `penggunaId` INTEGER NOT NULL,

    INDEX `AnggotaEvent_penggunaId_idx`(`penggunaId`),
    PRIMARY KEY (`eventId`, `penggunaId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KategoriKeuangan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(60) NOT NULL,
    `jenis` ENUM('masuk', 'keluar') NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `KategoriKeuangan_jenis_nama_key`(`jenis`, `nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MetodePembayaran` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(60) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `MetodePembayaran_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JenisDokumen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(60) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `JenisDokumen_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplateEvent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(80) NOT NULL,
    `deskripsi` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TemplateEvent_nama_key`(`nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TemplateTugas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `templateId` INTEGER NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `urutan` INTEGER NOT NULL DEFAULT 0,

    INDEX `TemplateTugas_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaksi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `tanggal` DATE NOT NULL,
    `keterangan` VARCHAR(200) NOT NULL,
    `jenis` ENUM('masuk', 'keluar') NOT NULL,
    `kategoriId` INTEGER NOT NULL,
    `nominal` BIGINT NOT NULL,
    `metodeId` INTEGER NOT NULL,
    `catatan` VARCHAR(500) NULL,
    `buktiPath` VARCHAR(255) NULL,
    `buktiNama` VARCHAR(200) NULL,
    `dibuatOlehId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Transaksi_eventId_tanggal_idx`(`eventId`, `tanggal`),
    INDEX `Transaksi_kategoriId_idx`(`kategoriId`),
    INDEX `Transaksi_metodeId_idx`(`metodeId`),
    INDEX `Transaksi_dibuatOlehId_idx`(`dibuatOlehId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Anggaran` (
    `eventId` INTEGER NOT NULL,
    `kategoriId` INTEGER NOT NULL,
    `nominal` BIGINT NOT NULL,

    INDEX `Anggaran_kategoriId_idx`(`kategoriId`),
    PRIMARY KEY (`eventId`, `kategoriId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tugas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `label` VARCHAR(160) NOT NULL,
    `picId` INTEGER NULL,
    `tenggat` DATE NULL,
    `selesai` BOOLEAN NOT NULL DEFAULT false,
    `urutan` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Tugas_eventId_idx`(`eventId`),
    INDEX `Tugas_picId_idx`(`picId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dokumen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `jenisId` INTEGER NOT NULL,
    `status` ENUM('draft', 'menunggu', 'disetujui', 'final') NOT NULL DEFAULT 'draft',
    `filePath` VARCHAR(255) NOT NULL,
    `fileNama` VARCHAR(200) NOT NULL,
    `mime` VARCHAR(120) NOT NULL,
    `ukuran` INTEGER NOT NULL,
    `diunggahOlehId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Dokumen_eventId_idx`(`eventId`),
    INDEX `Dokumen_jenisId_idx`(`jenisId`),
    INDEX `Dokumen_diunggahOlehId_idx`(`diunggahOlehId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Peserta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `nama` VARCHAR(120) NOT NULL,
    `email` VARCHAR(160) NULL,
    `telepon` VARCHAR(40) NULL,
    `tipe` ENUM('anggota', 'mitra', 'umum') NOT NULL DEFAULT 'umum',
    `registrasi` ENUM('menunggu', 'terverifikasi') NOT NULL DEFAULT 'menunggu',
    `kehadiran` ENUM('belum', 'hadir', 'tidak_hadir') NOT NULL DEFAULT 'belum',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Peserta_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vendor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `eventId` INTEGER NOT NULL,
    `nama` VARCHAR(160) NOT NULL,
    `kategori` VARCHAR(60) NOT NULL,
    `picNama` VARCHAR(120) NULL,
    `kontak` VARCHAR(60) NULL,
    `nilaiKontrak` BIGINT NOT NULL,
    `terbayar` BIGINT NOT NULL DEFAULT 0,
    `catatan` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Vendor_eventId_idx`(`eventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_picId_fkey` FOREIGN KEY (`picId`) REFERENCES `Pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnggotaEvent` ADD CONSTRAINT `AnggotaEvent_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnggotaEvent` ADD CONSTRAINT `AnggotaEvent_penggunaId_fkey` FOREIGN KEY (`penggunaId`) REFERENCES `Pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TemplateTugas` ADD CONSTRAINT `TemplateTugas_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `TemplateEvent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `KategoriKeuangan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_metodeId_fkey` FOREIGN KEY (`metodeId`) REFERENCES `MetodePembayaran`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaksi` ADD CONSTRAINT `Transaksi_dibuatOlehId_fkey` FOREIGN KEY (`dibuatOlehId`) REFERENCES `Pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Anggaran` ADD CONSTRAINT `Anggaran_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Anggaran` ADD CONSTRAINT `Anggaran_kategoriId_fkey` FOREIGN KEY (`kategoriId`) REFERENCES `KategoriKeuangan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tugas` ADD CONSTRAINT `Tugas_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tugas` ADD CONSTRAINT `Tugas_picId_fkey` FOREIGN KEY (`picId`) REFERENCES `Pengguna`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dokumen` ADD CONSTRAINT `Dokumen_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dokumen` ADD CONSTRAINT `Dokumen_jenisId_fkey` FOREIGN KEY (`jenisId`) REFERENCES `JenisDokumen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dokumen` ADD CONSTRAINT `Dokumen_diunggahOlehId_fkey` FOREIGN KEY (`diunggahOlehId`) REFERENCES `Pengguna`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Peserta` ADD CONSTRAINT `Peserta_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vendor` ADD CONSTRAINT `Vendor_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

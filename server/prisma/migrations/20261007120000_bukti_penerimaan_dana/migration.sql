-- Data Bukti Penerimaan Dana. Semua kolom nullable sehingga transaksi lama tetap valid.
-- Nama tabel ditulis persis `Transaksi`: MySQL di Linux membedakan huruf besar/kecil.

-- AlterTable
ALTER TABLE `Transaksi` ADD COLUMN `bank` VARCHAR(80) NULL,
    ADD COLUMN `nomorBukti` VARCHAR(30) NULL,
    ADD COLUMN `nomorReferensi` VARCHAR(80) NULL,
    ADD COLUMN `nomorRekening` VARCHAR(40) NULL,
    ADD COLUMN `pihak` VARCHAR(160) NULL,
    ADD COLUMN `pihakKeterangan` VARCHAR(120) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Transaksi_nomorBukti_key` ON `Transaksi`(`nomorBukti`);

-- Backfill: pemasukan yang sudah ada mendapat nomor BPD-YYYYMMDD-XXX berurutan per tanggal transaksi.
UPDATE `Transaksi` AS t
JOIN (
  SELECT `id`,
         CONCAT('BPD-', DATE_FORMAT(`tanggal`, '%Y%m%d'), '-',
                LPAD(ROW_NUMBER() OVER (PARTITION BY `tanggal` ORDER BY `createdAt`, `id`), 3, '0')) AS nomor
  FROM `Transaksi`
  WHERE `jenis` = 'masuk'
) AS n ON n.`id` = t.`id`
SET t.`nomorBukti` = n.nomor;

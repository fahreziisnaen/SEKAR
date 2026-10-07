-- Tanda tangan pengguna untuk Bukti Penerimaan Dana. Kolom nullable: pengguna lama tetap valid.
-- Nama tabel ditulis persis `Pengguna`: MySQL di Linux membedakan huruf besar/kecil.

-- AlterTable
ALTER TABLE `Pengguna` ADD COLUMN `tandaTanganDiperbarui` DATETIME(3) NULL,
    ADD COLUMN `tandaTanganPath` VARCHAR(255) NULL;

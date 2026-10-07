-- Login memakai username (bukan email) + MFA TOTP (Google Authenticator).

-- AlterTable
ALTER TABLE `Organisasi` ADD COLUMN `wajibMfa` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: username diisi dulu dari bagian lokal email, baru dijadikan wajib & unik.
ALTER TABLE `Pengguna` ADD COLUMN `mfaAktifSejak` DATETIME(3) NULL,
    ADD COLUMN `mfaLangkahTerakhir` INTEGER NULL,
    ADD COLUMN `mfaRahasia` VARCHAR(255) NULL,
    ADD COLUMN `mfaRahasiaBaru` VARCHAR(255) NULL,
    ADD COLUMN `username` VARCHAR(32) NULL,
    MODIFY `email` VARCHAR(160) NULL;

UPDATE `Pengguna`
SET `username` = LEFT(REGEXP_REPLACE(REGEXP_REPLACE(LOWER(SUBSTRING_INDEX(`email`, '@', 1)), '[^a-z0-9._-]', ''), '^[._-]+', ''), 32);

UPDATE `Pengguna` SET `username` = CONCAT('pengguna', `id`) WHERE `username` IS NULL OR CHAR_LENGTH(`username`) < 3;

-- Bagian lokal email yang sama (mis. admin@a.id & admin@b.id) diberi akhiran id.
UPDATE `Pengguna` AS p
JOIN (SELECT `username` FROM `Pengguna` GROUP BY `username` HAVING COUNT(*) > 1) AS d ON d.`username` = p.`username`
SET p.`username` = CONCAT(LEFT(p.`username`, 20), '-', p.`id`);

ALTER TABLE `Pengguna` MODIFY `username` VARCHAR(32) NOT NULL;

-- CreateTable
CREATE TABLE `KodePemulihan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `penggunaId` INTEGER NOT NULL,
    `hash` CHAR(64) NOT NULL,
    `dipakaiPada` DATETIME(3) NULL,

    INDEX `KodePemulihan_penggunaId_idx`(`penggunaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Pengguna_username_key` ON `Pengguna`(`username`);

-- AddForeignKey
ALTER TABLE `KodePemulihan` ADD CONSTRAINT `KodePemulihan_penggunaId_fkey` FOREIGN KEY (`penggunaId`) REFERENCES `Pengguna`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

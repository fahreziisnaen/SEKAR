-- Dijalankan sekali saat volume MySQL pertama kali dibuat (docker-compose.dev.yml).
-- `prisma migrate dev` membutuhkan shadow database, dan `npm test` memakai sekar_test.
CREATE DATABASE IF NOT EXISTS sekar_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON *.* TO 'sekar'@'%';
FLUSH PRIVILEGES;

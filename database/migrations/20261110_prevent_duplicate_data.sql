-- Migrasi keamanan data ganda untuk database family_teknik yang sudah ada.
-- Jalankan query audit terlebih dahulu.
-- Jika salah satu query audit menampilkan hasil, rapikan data terkait secara manual.
-- Setelah seluruh query audit kosong, jalankan bagian ALTER TABLE di bawah.
-- Jalankan file ini satu kali. Instalasi baru cukup menggunakan schema.sql.

USE family_teknik;

-- 1. Nomor telepon pelanggan, abaikan spasi, tanda plus, dan tanda baca.
SELECT REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '') AS normalized_phone,
       GROUP_CONCAT(id ORDER BY id) AS customer_ids, COUNT(*) AS total
FROM customers
WHERE REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '') <> ''
GROUP BY normalized_phone
HAVING COUNT(*) > 1;

-- 2. Nomor polisi, abaikan spasi dan tanda baca serta samakan huruf besar/kecil.
SELECT UPPER(REGEXP_REPLACE(plat_nomer, '[^A-Z0-9]', '')) AS normalized_plate,
       GROUP_CONCAT(id ORDER BY id) AS vehicle_ids, COUNT(*) AS total
FROM kendaraan
GROUP BY normalized_plate
HAVING COUNT(*) > 1;

-- 3. Servis dengan pelanggan, kendaraan, tanggal, deskripsi, dan biaya yang sama.
SELECT customers_id, kendaraan_id, service_date, LOWER(TRIM(description)) AS normalized_description,
       service_cost, GROUP_CONCAT(id ORDER BY id) AS service_ids, COUNT(*) AS total
FROM service
GROUP BY customers_id, kendaraan_id, service_date, normalized_description, service_cost
HAVING COUNT(*) > 1;

-- 4. Satu servis yang ditautkan ke beberapa transaksi.
SELECT service_id, GROUP_CONCAT(id ORDER BY id) AS transaction_ids, COUNT(*) AS total
FROM transactions
WHERE service_id IS NOT NULL
GROUP BY service_id
HAVING COUNT(*) > 1;

-- Jalankan bagian berikut setelah empat query audit di atas tidak menghasilkan baris.

ALTER TABLE customers
  ADD COLUMN phone_normalized VARCHAR(30) NULL;
UPDATE customers SET phone_normalized = NULLIF(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', ''), '');
ALTER TABLE customers ADD UNIQUE KEY uq_customers_phone_normalized (phone_normalized);

ALTER TABLE kendaraan
  ADD COLUMN plat_normalized VARCHAR(20) NULL;
UPDATE kendaraan SET plat_normalized = UPPER(REGEXP_REPLACE(plat_nomer, '[^A-Z0-9]', ''));
ALTER TABLE kendaraan
  MODIFY COLUMN plat_normalized VARCHAR(20) NOT NULL,
  DROP INDEX uq_kendaraan_plat,
  ADD UNIQUE KEY uq_kendaraan_plat_normalized (plat_normalized);

ALTER TABLE service
  ADD COLUMN description_hash CHAR(64) NULL;
UPDATE service SET description_hash = SHA2(LOWER(TRIM(description)), 256);
ALTER TABLE service
  MODIFY COLUMN description_hash CHAR(64) NOT NULL,
  ADD UNIQUE KEY uq_service_duplicate (customers_id, kendaraan_id, service_date, description_hash, service_cost);

ALTER TABLE transactions
  ADD UNIQUE KEY uq_transaction_service (service_id);

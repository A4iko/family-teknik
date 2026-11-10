USE family_teknik;

-- Data DEMO untuk pengujian. Jalankan sekali setelah schema.sql.
-- Gunakan database kosong agar nomor ID sesuai dengan relasi di bawah.

INSERT INTO customers (id, name, phone, phone_normalized, address) VALUES
(1, 'Budi Santoso', '081234567890', '081234567890', 'Depok'),
(2, 'Siti Aminah', '081298765432', '081298765432', 'Cibinong'),
(3, 'Andi Pratama', '082112223333', '082112223333', 'Bogor');

INSERT INTO kendaraan (id, customers_id, plat_nomer, plat_normalized, brand, tipe, year) VALUES
(1, 1, 'B 1234 ABC', 'B1234ABC', 'Honda', 'Vario 150', 2021),
(2, 2, 'F 5678 XYZ', 'F5678XYZ', 'Yamaha', 'NMAX', 2022),
(3, 3, 'F 9012 QWE', 'F9012QWE', 'Toyota', 'Avanza', 2020);

INSERT INTO service (id, customers_id, kendaraan_id, service_date, description, description_hash, service_cost) VALUES
(1, 1, 1, '2026-10-10', 'Ganti oli dan pemeriksaan rem', SHA2(LOWER(TRIM('Ganti oli dan pemeriksaan rem')), 256), 180000),
(2, 1, 1, '2026-10-25', 'Servis CVT', SHA2(LOWER(TRIM('Servis CVT')), 256), 250000),
(3, 2, 2, '2026-11-02', 'Ganti oli mesin', SHA2(LOWER(TRIM('Ganti oli mesin')), 256), 150000),
(4, 3, 3, '2026-11-05', 'Servis berkala', SHA2(LOWER(TRIM('Servis berkala')), 256), 450000);

INSERT INTO transactions (id, customers_id, kendaraan_id, service_id, total_amount, transactions_date) VALUES
(1, 1, 1, 1, 180000, '2026-10-10 10:30:00'),
(2, 1, 1, 2, 250000, '2026-10-25 13:15:00'),
(3, 2, 2, 3, 150000, '2026-11-02 09:00:00'),
(4, 3, 3, 4, 450000, '2026-11-05 15:45:00');

CREATE DATABASE IF NOT EXISTS family_teknik
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE family_teknik;

CREATE TABLE IF NOT EXISTS customers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  address TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS kendaraan (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customers_id INT UNSIGNED NOT NULL,
  plat_nomer VARCHAR(20) NOT NULL,
  brand VARCHAR(80) NOT NULL,
  tipe VARCHAR(80) NOT NULL,
  year SMALLINT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_kendaraan_customer FOREIGN KEY (customers_id)
    REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  UNIQUE KEY uq_kendaraan_plat (plat_nomer)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS service (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customers_id INT UNSIGNED NOT NULL,
  kendaraan_id INT UNSIGNED NOT NULL,
  service_date DATE NOT NULL,
  description TEXT NOT NULL,
  service_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_service_customer FOREIGN KEY (customers_id)
    REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_service_kendaraan FOREIGN KEY (kendaraan_id)
    REFERENCES kendaraan(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  INDEX idx_service_date (service_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customers_id INT UNSIGNED NOT NULL,
  kendaraan_id INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NULL,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  transactions_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_transaction_customer FOREIGN KEY (customers_id)
    REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transaction_kendaraan FOREIGN KEY (kendaraan_id)
    REFERENCES kendaraan(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_transaction_service FOREIGN KEY (service_id)
    REFERENCES service(id) ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_transaction_customer_date (customers_id, transactions_date),
  INDEX idx_transaction_date (transactions_date)
) ENGINE=InnoDB;

-- Data contoh opsional. Hapus komentar untuk mengisi data demo.
-- INSERT INTO customers (name, phone, address) VALUES
-- ('Budi Santoso', '081234567890', 'Depok'),
-- ('Siti Aminah', '081298765432', 'Bogor');

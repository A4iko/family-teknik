# Family Teknik

Sistem manajemen bengkel dengan pencatatan pelanggan, kendaraan, servis, transaksi, dan segmentasi pelanggan RFM.

## Kebutuhan
- Node.js 20.19+ atau 22.12+
- Python 3.10+
- MySQL 8.0
- XAMPP atau MySQL Server

## 1. Siapkan database
1. Jalankan MySQL dari XAMPP.
2. Buka phpMyAdmin di http://localhost/phpmyadmin.
3. Import file database/schema.sql.
4. Pastikan database family_teknik dan tabel customers, kendaraan, service, transactions terbentuk.

Port MySQL bawaan pada konfigurasi proyek adalah 3306. Jika MySQL Anda berjalan pada port lain, ubah DB_PORT pada backend/.env.

## 2. Jalankan backend
Buka terminal pada folder backend:
```powershell
Copy-Item .env.example .env
npm install
npm start
```
Buka http://localhost:5000/api/health. Jika sukses, status database akan connected.

## 3. Jalankan layanan AI
Buka terminal baru pada folder AI:
```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
Layanan AI berjalan di http://127.0.0.1:5001.

## 4. Jalankan frontend
Buka terminal baru pada folder frontend:
```powershell
npm install
npm run dev
```
Buka alamat lokal yang muncul, biasanya http://localhost:5173.

## Fitur
- Dashboard jumlah pelanggan, kendaraan, servis, transaksi, dan pendapatan.
- CRUD pelanggan, kendaraan, servis, dan transaksi.
- Riwayat transaksi per pelanggan melalui API.
- Perhitungan RFM dan rekomendasi promo dari layanan AI.

## Endpoint utama
- GET /api/health
- GET /api/dashboard
- GET, POST, PUT, DELETE /api/customers
- GET, POST, PUT, DELETE /api/kendaraan
- GET, POST, PUT, DELETE /api/service
- GET, POST, PUT, DELETE /api/transactions
- GET /api/customer-history/:id
- POST /api/rfm/:customers_id

## Catatan
Gunakan data uji terlebih dahulu. Jangan menghapus pelanggan atau kendaraan yang sudah memiliki transaksi terkait karena relasi database melindungi riwayat transaksi.

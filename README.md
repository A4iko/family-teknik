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
4. Pastikan database family_teknik beserta tabel customers, kendaraan, service, transactions, users, dan login_logs terbentuk. Jika database lama sudah ada, jalankan database/migrations/20261110_prevent_duplicate_data.sql satu kali setelah meninjau hasil query audit dan menyelesaikan data ganda yang sudah ada. Jangan jalankan migrasi sebelum hasil audit kosong. Untuk instalasi baru, schema.sql sudah berisi batasan unik tersebut.

Port MySQL bawaan pada konfigurasi proyek adalah 3306. Jika MySQL Anda berjalan pada port lain, ubah DB_PORT pada backend/.env. Isi SESSION_SECRET pada backend/.env dengan string acak minimal 32 karakter agar sesi tetap berlaku setelah backend dimulai ulang.

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
- Login administrator dengan pembuatan akun admin pertama kali.\n- Password disimpan sebagai hash scrypt, bukan teks biasa.\n- Riwayat login berhasil dan gagal tersimpan pada tabel login_logs.\n- Endpoint data bengkel memerlukan token login.\n- Dashboard jumlah pelanggan, kendaraan, servis, transaksi, dan pendapatan.
- CRUD pelanggan, kendaraan, servis, dan transaksi.
- Riwayat transaksi per pelanggan melalui API.
- Perhitungan RFM dan rekomendasi promo dari layanan AI.
- Pencegahan data ganda pada nomor telepon, nomor polisi, catatan servis, dan transaksi.
- Menu Keamanan Data untuk memindai kelompok data ganda yang sudah tersimpan.
- Endpoint GET /api/data-integrity untuk laporan integritas data.

## Endpoint utama
- GET /api/health
- GET /api/dashboard
- GET, POST, PUT, DELETE /api/customers
- GET, POST, PUT, DELETE /api/kendaraan
- GET, POST, PUT, DELETE /api/service
- GET, POST, PUT, DELETE /api/transactions
- GET /api/customer-history/:id
- POST /api/rfm/:customers_id
- GET /api/data-integrity

## Catatan
Gunakan data uji terlebih dahulu. Jangan menghapus pelanggan atau kendaraan yang sudah memiliki transaksi terkait karena relasi database melindungi riwayat transaksi.


## Deployment cloud gratis

Panduan deployment tersedia pada [DEPLOYMENT.md](DEPLOYMENT.md). Konfigurasi awal Render tersedia pada [render.yaml](render.yaml). Deployment memakai Render untuk frontend, backend, dan AI, serta TiDB Cloud Starter untuk database MySQL-compatible. Perhatikan batas tidur layanan gratis dan kuota database.

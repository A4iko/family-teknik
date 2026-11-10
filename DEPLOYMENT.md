# Deployment Gratis Family Teknik

Deployment ini memakai Render untuk frontend, backend, dan layanan AI, serta TiDB Cloud Starter untuk database MySQL-compatible.

## Gambaran layanan

- Frontend React/Vite: Render Static Site.
- Backend Express: Render Web Service.
- AI Flask: Render Web Service dengan Gunicorn.
- Database: TiDB Cloud Starter, mode MySQL-compatible.

## 1. Siapkan database TiDB Cloud

1. Buat akun di https://tidbcloud.com/.
2. Buat cluster TiDB Cloud Starter dengan mode MySQL-compatible.
3. Simpan host, port, username, dan password koneksi.
4. Pastikan koneksi TLS aktif. Port koneksi cluster bisa berbeda dari port MySQL lokal.
5. Buka SQL Editor atau koneksi database, lalu jalankan `database/schema.sql`.
6. Untuk database lama, ekspor data dari MySQL lokal dan impor ke database cloud setelah memeriksa duplikasi. Jalankan migrasi `database/migrations/20261110_prevent_duplicate_data.sql` hanya setelah seluruh query audit menunjukkan tidak ada data ganda.
7. Simpan salinan cadangan database lokal sebelum migrasi atau impor.

Jangan mengunggah file `.env`, password, atau SESSION_SECRET ke GitHub.

## 2. Hubungkan repository ke Render

1. Buka https://render.com/ dan masuk menggunakan GitHub.
2. Pilih New -> Blueprint.
3. Pilih repository `A4iko/family-teknik`.
4. Pilih branch `mvp-family-teknik`.
5. Render membaca `render.yaml` dan menyiapkan tiga layanan.
6. Isi environment variable yang diminta pada layanan backend dan frontend.

Nilai backend:
- `DB_HOST`: host TiDB.
- `DB_PORT`: port dari detail koneksi TiDB, jangan menganggap selalu 4000.
- `DB_USER`: username TiDB.
- `DB_PASSWORD`: password TiDB.
- `DB_NAME`: `family_teknik`.
- `DB_SSL`: `true`.
- `AI_URL`: URL publik layanan AI, misalnya `https://nama-ai.onrender.com`.
- `FRONTEND_URL`: URL publik frontend, misalnya `https://nama-frontend.onrender.com`.
- `SESSION_SECRET`: nilai acak panjang. Blueprint menghasilkan nilai ini otomatis.

Nilai frontend:
- `VITE_API_URL`: URL publik backend, misalnya `https://nama-backend.onrender.com`.

Nama URL di atas hanya contoh. Gunakan URL yang Render berikan setelah layanan dibuat.

## 3. Periksa deployment

Buka endpoint berikut menggunakan URL aktual:
- Backend: `/api/health`. Pastikan database berstatus connected.
- AI: `/health`. Pastikan status ok.
- Frontend: buka URL static site dan uji login.

Lakukan uji login admin, tambah pelanggan, kendaraan, servis, transaksi, riwayat pelanggan, pemindaian keamanan data, dan rekomendasi RFM.

## 4. Catatan paket gratis

- Render Free Web Service tidur setelah 15 menit tanpa permintaan. Permintaan pertama setelah tidur bisa membutuhkan sekitar satu menit untuk aktif kembali.
- File lokal pada layanan Render bersifat sementara. Data bisnis harus disimpan di database cloud, bukan file lokal layanan.
- TiDB Starter memiliki batas kuota penyimpanan dan Request Units. Pantau pemakaian pada dashboard TiDB.
- Simpan backup database secara berkala.
- Jangan memakai paket gratis sebagai satu-satunya penyimpanan data operasional penting tanpa backup.

## 5. Deployment berikutnya

Setelah konfigurasi awal selesai, perubahan pada branch yang terhubung akan memicu build dan deployment otomatis sesuai pengaturan Render.

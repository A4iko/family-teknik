require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const db = require("./db");
const dbRfm = require("./db_rfm");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const AI_URL = process.env.AI_URL || "http://127.0.0.1:5001";

app.use(cors());
app.use(express.json());

const runQuery = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, results) => error ? reject(error) : resolve(results));
});

const sendError = (res, error, message = "Terjadi kesalahan pada server") => {
  console.error(message, error.message);
  res.status(500).json({ message, error: error.message });
};

app.get("/", (req, res) => res.json({ message: "Backend Family Teknik berjalan" }));
app.get("/api/health", async (req, res) => {
  try {
    await runQuery("SELECT 1");
    res.json({ status: "ok", database: "connected", ai_url: AI_URL });
  } catch (error) {
    sendError(res, error, "Backend aktif, tetapi database belum terhubung");
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const [customers, vehicles, services, transactions, revenue] = await Promise.all([
      runQuery("SELECT COUNT(*) AS total FROM customers"),
      runQuery("SELECT COUNT(*) AS total FROM kendaraan"),
      runQuery("SELECT COUNT(*) AS total FROM service"),
      runQuery("SELECT COUNT(*) AS total FROM transactions"),
      runQuery("SELECT COALESCE(SUM(total_amount), 0) AS total FROM transactions"),
    ]);
    res.json({
      customers: customers[0].total,
      vehicles: vehicles[0].total,
      services: services[0].total,
      transactions: transactions[0].total,
      revenue: Number(revenue[0].total),
    });
  } catch (error) {
    sendError(res, error, "Gagal mengambil ringkasan dashboard");
  }
});

const resources = {
  customers: {
    table: "customers",
    columns: ["name", "phone", "address"],
    required: ["name"],
    order: "id DESC",
  },
  kendaraan: {
    table: "kendaraan",
    columns: ["customers_id", "plat_nomer", "brand", "tipe", "year"],
    required: ["customers_id", "plat_nomer", "brand", "tipe"],
    order: "id DESC",
  },
  service: {
    table: "service",
    columns: ["customers_id", "kendaraan_id", "service_date", "description", "service_cost"],
    required: ["customers_id", "kendaraan_id", "service_date", "description"],
    order: "service_date DESC, id DESC",
  },
  transactions: {
    table: "transactions",
    columns: ["customers_id", "kendaraan_id", "service_id", "total_amount", "transactions_date"],
    required: ["customers_id", "kendaraan_id", "total_amount"],
    order: "transactions_date DESC, id DESC",
  },
};

async function validateRelations(resource, body) {
  if (resource === "kendaraan") {
    const [customers] = await dbRfm.query("SELECT id FROM customers WHERE id = ?", [body.customers_id]);
    if (!customers.length) return "Pelanggan tidak ditemukan.";
  }

  if (resource === "service" || resource === "transactions") {
    const [vehicles] = await dbRfm.query("SELECT customers_id FROM kendaraan WHERE id = ?", [body.kendaraan_id]);
    if (!vehicles.length) return "Kendaraan tidak ditemukan.";
    if (body.customers_id && Number(vehicles[0].customers_id) !== Number(body.customers_id)) {
      return "Kendaraan tersebut bukan milik pelanggan yang dipilih.";
    }
  }

  if (resource === "transactions" && body.service_id) {
    const [services] = await dbRfm.query("SELECT customers_id, kendaraan_id FROM service WHERE id = ?", [body.service_id]);
    if (!services.length) return "Data servis tidak ditemukan.";
    if (Number(services[0].customers_id) !== Number(body.customers_id) ||
        Number(services[0].kendaraan_id) !== Number(body.kendaraan_id)) {
      return "Servis yang dipilih tidak cocok dengan pelanggan atau kendaraan.";
    }
  }
  return null;
}

for (const [resource, config] of Object.entries(resources)) {
  app.get(`/api/${resource}`, async (req, res) => {
    try {
      const rows = await runQuery(`SELECT * FROM ${config.table} ORDER BY ${config.order}`);
      res.json(rows);
    } catch (error) {
      sendError(res, error, `Gagal mengambil data ${resource}`);
    }
  });

  app.get(`/api/${resource}/:id`, async (req, res) => {
    try {
      const rows = await runQuery(`SELECT * FROM ${config.table} WHERE id = ?`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ message: "Data tidak ditemukan" });
      res.json(rows[0]);
    } catch (error) {
      sendError(res, error, `Gagal mengambil detail ${resource}`);
    }
  });

  app.post(`/api/${resource}`, async (req, res) => {
    try {
      const body = req.body || {};
      const missing = config.required.filter((field) => body[field] === undefined || body[field] === null || body[field] === "");
      if (missing.length) return res.status(400).json({ message: `Kolom wajib diisi: ${missing.join(", ")}` });
      const relationError = await validateRelations(resource, body);
      if (relationError) return res.status(400).json({ message: relationError });
      const columns = config.columns.filter((field) => body[field] !== undefined);
      const values = columns.map((field) => body[field] === "" ? null : body[field]);
      const placeholders = columns.map(() => "?").join(", ");
      const result = await runQuery(
        `INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );
      res.status(201).json({ message: "Data berhasil ditambahkan", id: result.insertId });
    } catch (error) {
      sendError(res, error, `Gagal menambahkan data ${resource}`);
    }
  });

  app.put(`/api/${resource}/:id`, async (req, res) => {
    try {
      const body = req.body || {};
      const columns = config.columns.filter((field) => body[field] !== undefined);
      if (!columns.length) return res.status(400).json({ message: "Tidak ada data yang diperbarui" });
      const [existingRows] = await dbRfm.query(`SELECT * FROM ${config.table} WHERE id = ?`, [req.params.id]);
      if (!existingRows.length) return res.status(404).json({ message: "Data tidak ditemukan" });
      const mergedBody = { ...existingRows[0], ...body };
      const relationError = await validateRelations(resource, mergedBody);
      if (relationError) return res.status(400).json({ message: relationError });
      const values = columns.map((field) => body[field] === "" ? null : body[field]);
      const result = await runQuery(
        `UPDATE ${config.table} SET ${columns.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
        [...values, req.params.id]
      );
      if (!result.affectedRows) return res.status(404).json({ message: "Data tidak ditemukan" });
      res.json({ message: "Data berhasil diperbarui" });
    } catch (error) {
      sendError(res, error, `Gagal memperbarui data ${resource}`);
    }
  });

  app.delete(`/api/${resource}/:id`, async (req, res) => {
    try {
      const result = await runQuery(`DELETE FROM ${config.table} WHERE id = ?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ message: "Data tidak ditemukan" });
      res.json({ message: "Data berhasil dihapus" });
    } catch (error) {
      sendError(res, error, "Data tidak dapat dihapus. Periksa relasi data terlebih dahulu.");
    }
  });
}

app.get("/api/customer-history/:id", async (req, res) => {
  try {
    const rows = await runQuery(
      `SELECT t.*, c.name AS customer_name, k.plat_nomer, k.brand, k.tipe,
              s.description AS service_description
       FROM transactions t
       JOIN customers c ON c.id = t.customers_id
       JOIN kendaraan k ON k.id = t.kendaraan_id
       LEFT JOIN service s ON s.id = t.service_id
       WHERE t.customers_id = ?
       ORDER BY t.transactions_date DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    sendError(res, error, "Gagal mengambil riwayat pelanggan");
  }
});

app.post("/api/rfm/:customers_id", async (req, res) => {
  try {
    const customersId = req.params.customers_id;
    const [transactions] = await dbRfm.query(
      `SELECT transactions_date, total_amount
       FROM transactions
       WHERE customers_id = ?
       ORDER BY transactions_date ASC`,
      [customersId]
    );
    const response = await axios.post(`${AI_URL}/rfm`, { transactions }, { timeout: 15000 });
    res.json({ customers_id: Number(customersId), transaction_count: transactions.length, result: response.data });
  } catch (error) {
    const detail = error.response?.data?.message || error.message;
    res.status(502).json({ message: "Gagal menghitung RFM. Pastikan layanan AI aktif.", error: detail });
  }
});

app.use((req, res) => res.status(404).json({ message: "Endpoint tidak ditemukan" }));

app.listen(PORT, () => console.log(`Backend Family Teknik berjalan di http://localhost:${PORT}`));

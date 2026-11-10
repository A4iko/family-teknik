require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const { promisify } = require("util");
const db = require("./db");
const dbRfm = require("./db_rfm");

const app = express();
const PORT = Number(process.env.PORT || 5000);
const AI_URL = process.env.AI_URL || "http://127.0.0.1:5001";
const scrypt = promisify(crypto.scrypt);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_DURATION = 8 * 60 * 60;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const runQuery = (sql, values = []) => new Promise((resolve, reject) => {
  db.query(sql, values, (error, results) => error ? reject(error) : resolve(results));
});

const sendError = (res, error, message = "Terjadi kesalahan pada server") => {
  console.error(message, error.message);
  res.status(500).json({ message, error: error.message });
};

function normalizeFieldValue(resource, field, value) {
  if (value === "") return null;
  if (resource === "transactions" && field === "transactions_date" && typeof value === "string") {
    return value.replace("T", " ");
  }
  return value;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, salt, storedKey] = String(storedHash || "").split(":");
  if (algorithm !== "scrypt" || !salt || !storedKey) return false;
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(storedKey, "hex");
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function signToken(user) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    username: user.username,
    full_name: user.full_name,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION,
  })).toString("base64url");
  const input = header + "." + payload;
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(input).digest("base64url");
  return input + "." + signature;
}

function verifyToken(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const input = parts[0] + "." + parts[1];
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(input).digest();
  const received = Buffer.from(parts[2], "base64url");
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function writeLoginLog(req, userId, username, status) {
  await runQuery(
    "INSERT INTO login_logs (user_id, username, login_status, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)",
    [userId || null, username, status, req.ip || null, String(req.get("user-agent") || "").slice(0, 255)]
  );
}

function requireAuth(req, res, next) {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ message: "Sesi berakhir. Silakan login kembali." });
  req.user = user;
  next();
}

app.get("/", (req, res) => res.json({ message: "Backend Family Teknik berjalan" }));
app.get("/api/health", async (req, res) => {
  try {
    await runQuery("SELECT 1");
    res.json({ status: "ok", database: "connected", ai_url: AI_URL });
  } catch (error) {
    sendError(res, error, "Backend aktif, tetapi database belum terhubung");
  }
});

app.get("/api/auth/status", async (req, res) => {
  try {
    const [rows] = await dbRfm.query("SELECT COUNT(*) AS total FROM users");
    res.json({ setup_required: Number(rows[0].total) === 0 });
  } catch (error) {
    sendError(res, error, "Gagal memeriksa status akun");
  }
});

app.post("/api/auth/setup", async (req, res) => {
  const fullName = String(req.body?.full_name || "").trim();
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (fullName.length < 2 || fullName.length > 120) {
    return res.status(400).json({ message: "Nama lengkap harus berisi 2 sampai 120 karakter." });
  }
  if (!/^[a-z0-9._-]{4,60}$/.test(username)) {
    return res.status(400).json({ message: "Username harus 4 sampai 60 karakter, gunakan huruf kecil, angka, titik, garis bawah, atau tanda hubung." });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password minimal 8 karakter." });
  }

  let connection;
  try {
    connection = await dbRfm.getConnection();
    await connection.beginTransaction();
    const [existing] = await connection.query("SELECT id FROM users LIMIT 1 FOR UPDATE");
    if (existing.length) {
      await connection.rollback();
      return res.status(409).json({ message: "Akun admin sudah dibuat. Silakan login." });
    }
    const passwordHash = await hashPassword(password);
    const [result] = await connection.query(
      "INSERT INTO users (full_name, username, password_hash) VALUES (?, ?, ?)",
      [fullName, username, passwordHash]
    );
    await connection.commit();
    const user = { id: result.insertId, full_name: fullName, username };
    await writeLoginLog(req, user.id, username, "success");
    res.status(201).json({ message: "Akun admin berhasil dibuat.", token: signToken(user), user });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Username sudah digunakan." });
    sendError(res, error, "Gagal membuat akun admin");
  } finally {
    if (connection) connection.release();
  }
});

app.post("/api/auth/login", async (req, res) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!username || !password) return res.status(400).json({ message: "Username dan password wajib diisi." });
  try {
    const [rows] = await dbRfm.query(
      "SELECT id, full_name, username, password_hash FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    const user = rows[0];
    const valid = user ? await verifyPassword(password, user.password_hash) : false;
    await writeLoginLog(req, user?.id, username, valid ? "success" : "failed");
    if (!valid) return res.status(401).json({ message: "Username atau password salah." });
    await dbRfm.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);
    const publicUser = { id: user.id, full_name: user.full_name, username: user.username };
    res.json({ message: "Login berhasil.", token: signToken(publicUser), user: publicUser });
  } catch (error) {
    sendError(res, error, "Gagal memproses login");
  }
});

app.use("/api", requireAuth);

app.get("/api/data-integrity", async (req, res) => {
  try {
    const [customers, vehicles, services, transactions] = await Promise.all([
      runQuery("SELECT phone_normalized AS duplicate_value, GROUP_CONCAT(id ORDER BY id) AS record_ids, COUNT(*) AS total FROM customers WHERE phone_normalized IS NOT NULL GROUP BY phone_normalized HAVING COUNT(*) > 1"),
      runQuery("SELECT plat_normalized AS duplicate_value, GROUP_CONCAT(id ORDER BY id) AS record_ids, COUNT(*) AS total FROM kendaraan GROUP BY plat_normalized HAVING COUNT(*) > 1"),
      runQuery("SELECT duplicate_key AS duplicate_value, GROUP_CONCAT(id ORDER BY id) AS record_ids, COUNT(*) AS total FROM service GROUP BY duplicate_key HAVING COUNT(*) > 1"),
      runQuery("SELECT service_id AS duplicate_value, GROUP_CONCAT(id ORDER BY id) AS record_ids, COUNT(*) AS total FROM transactions WHERE service_id IS NOT NULL GROUP BY service_id HAVING COUNT(*) > 1"),
    ]);
    const groups = [
      ...customers.map(row => ({ type: "Pelanggan", field: "Nomor telepon", ...row })),
      ...vehicles.map(row => ({ type: "Kendaraan", field: "Nomor polisi", ...row })),
      ...services.map(row => ({ type: "Servis", field: "Kombinasi data servis", ...row })),
      ...transactions.map(row => ({ type: "Transaksi", field: "Servis terkait", ...row })),
    ];
    res.json({ checked_at: new Date().toISOString(), duplicate_groups: groups.length, duplicate_records: groups.reduce((sum, group) => sum + Number(group.total), 0), groups });
  } catch (error) {
    sendError(res, error, "Gagal memeriksa data ganda. Pastikan migrasi keamanan data sudah dijalankan.");
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

function duplicateMessage(resource) {
  const messages = {
    customers: "Nomor telepon sudah terdaftar pada pelanggan lain.",
    kendaraan: "Nomor polisi sudah terdaftar. Periksa kembali kendaraan tersebut.",
    service: "Data servis dengan pelanggan, kendaraan, tanggal, deskripsi, dan biaya yang sama sudah tercatat.",
    transactions: "Servis tersebut sudah memiliki transaksi. Pilih servis lain atau kosongkan pilihan servis jika transaksi tidak terkait servis."
  };
  return messages[resource] || "Data yang sama sudah terdaftar.";
}

async function findDuplicate(resource, body, excludeId = null) {
  const skip = excludeId ? " AND id <> ?" : "";
  const valuesFor = (values) => excludeId ? [...values, excludeId] : values;

  if (resource === "customers" && body.phone) {
    const phone = String(body.phone).replace(/\\D/g, "");
    if (phone) {
      const rows = await runQuery(
        "SELECT id FROM customers WHERE phone_normalized = ?"+skip+" LIMIT 1",
        valuesFor([phone])
      );
      if (rows.length) return duplicateMessage(resource);
    }
  }

  if (resource === "kendaraan" && body.plat_nomer) {
    const plate = String(body.plat_nomer).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const rows = await runQuery(
      "SELECT id FROM kendaraan WHERE plat_normalized = ?"+skip+" LIMIT 1",
      valuesFor([plate])
    );
    if (rows.length) return duplicateMessage(resource);
  }

  if (resource === "service") {
    const rows = await runQuery(
      "SELECT id FROM service WHERE customers_id = ? AND kendaraan_id = ? AND service_date = ? AND LOWER(TRIM(description)) = LOWER(TRIM(?)) AND service_cost = ?"+skip+" LIMIT 1",
      valuesFor([body.customers_id, body.kendaraan_id, body.service_date, body.description, body.service_cost ?? 0])
    );
    if (rows.length) return duplicateMessage(resource);
  }

  if (resource === "transactions" && body.service_id) {
    const rows = await runQuery(
      "SELECT id FROM transactions WHERE service_id = ?"+skip+" LIMIT 1",
      valuesFor([body.service_id])
    );
    if (rows.length) return duplicateMessage(resource);
  }
  return null;
}

function handleDuplicateError(res, error, resource) {
  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({ message: duplicateMessage(resource), code: "DUPLICATE_DATA" });
  }
  return null;
}

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
      const duplicateError = await findDuplicate(resource, body);
      if (duplicateError) return res.status(409).json({ message: duplicateError, code: "DUPLICATE_DATA" });
      const columns = config.columns.filter((field) =>
        body[field] !== undefined &&
        !(resource === "transactions" && field === "transactions_date" && body[field] === "")
      );
      const values = columns.map((field) => normalizeFieldValue(resource, field, body[field]));
      const placeholders = columns.map(() => "?").join(", ");
      const result = await runQuery(
        `INSERT INTO ${config.table} (${columns.join(", ")}) VALUES (${placeholders})`,
        values
      );
      res.status(201).json({ message: "Data berhasil ditambahkan", id: result.insertId });
    } catch (error) {
      if (handleDuplicateError(res, error, resource)) return;
      sendError(res, error, `Gagal menambahkan data ${resource}`);
    }
  });

  app.put(`/api/${resource}/:id`, async (req, res) => {
    try {
      const body = req.body || {};
      const columns = config.columns.filter((field) =>
        body[field] !== undefined &&
        !(resource === "transactions" && field === "transactions_date" && body[field] === "")
      );
      if (!columns.length) return res.status(400).json({ message: "Tidak ada data yang diperbarui" });
      const [existingRows] = await dbRfm.query(`SELECT * FROM ${config.table} WHERE id = ?`, [req.params.id]);
      if (!existingRows.length) return res.status(404).json({ message: "Data tidak ditemukan" });
      const mergedBody = { ...existingRows[0], ...body };
      const relationError = await validateRelations(resource, mergedBody);
      if (relationError) return res.status(400).json({ message: relationError });
      const duplicateError = await findDuplicate(resource, mergedBody, Number(req.params.id));
      if (duplicateError) return res.status(409).json({ message: duplicateError, code: "DUPLICATE_DATA" });
      const values = columns.map((field) => normalizeFieldValue(resource, field, body[field]));
      await runQuery(
        `UPDATE ${config.table} SET ${columns.map((field) => `${field} = ?`).join(", ")} WHERE id = ?`,
        [...values, req.params.id]
      );
      res.json({ message: "Data berhasil diperbarui" });
    } catch (error) {
      if (handleDuplicateError(res, error, resource)) return;
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

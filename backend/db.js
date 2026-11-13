require("dotenv").config();
const mysql = require("mysql2");

// Gunakan connection pool agar koneksi MySQL tetap stabil pada deployment
// serverless dan beberapa request CRUD yang berjalan berdekatan.
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "family_teknik",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  maxIdle: Number(process.env.DB_MAX_IDLE || 5),
  idleTimeout: Number(process.env.DB_IDLE_TIMEOUT || 60000),
  queueLimit: 0,
  enableKeepAlive: true,
  ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2" } : undefined,
});

db.on("connection", () => {
  console.log("Koneksi MySQL pool berhasil dibuat.");
});

db.on("error", (error) => {
  console.error("Kesalahan koneksi MySQL:", error.message);
});

module.exports = db;

require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "family_teknik",
  charset: "utf8mb4",
});

db.connect((error) => {
  if (error) {
    console.error("Koneksi MySQL gagal:", error.message);
    return;
  }
  console.log("MySQL terhubung ke database family_teknik");
});

module.exports = db;

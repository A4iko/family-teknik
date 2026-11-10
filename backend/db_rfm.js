require("dotenv").config();
const mysql = require("mysql2/promise");

const dbRfm = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "family_teknik",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  dateStrings: true,
  ssl: process.env.DB_SSL === "true" ? {} : undefined,
});

module.exports = dbRfm;

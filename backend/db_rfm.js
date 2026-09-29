const mysql = require("mysql2/promise");

const dbRfm = mysql.createPool({
    host: "localhost",
    port: 3307,
    user: "root",
    password: "",
    database: "family_teknik"
});

async function testConnection() {
    try {
        const connection = await dbRfm.getConnection();

        console.log("Database RFM berhasil terhubung");

        connection.release();
    } catch (error) {
        console.error("Database RFM gagal terhubung:");
        console.error(error.message);
    }
}

testConnection();

module.exports = dbRfm;
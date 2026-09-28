const mysql = require("mysql2");

const db = mysql.createConnection({
    host : "localhost",
    user : "root",
    password :"",
    database : "family_teknik",
    port : 3307
})

db.connect((err) => {
    if(err) {
        console.error("Database gagal terhubung: ", err);
        return;
    }
    console.log("MYSQL berhasil terhubung")
})

module.exports = db;
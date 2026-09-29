const express = require("express");
const axios = require("axios");
const db = require("./db");
const dbRfm = require("./db_rfm");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());


app.get("/", (req, res)=> {
    res.json({
        message: "Backend family teknik berjalan"
    });
});

// GET ALL CUSTOMERS
app.get("/api/customers", (req, res)=> {
    const sql = "SELECT * FROM customers";

    db.query (sql, (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengambil data customers",
                error: err.message
            });
        }
        res.json(results);
    });
});

// GET CUSTOMER BY ID
app.get("/api/customers/:id", (req, res)=> {
    const customersid = req.params.id;
    const sql = "SELECT * FROM customers WHERE id = ?";

    db.query(sql, [customersid], (err, results)=> {
     if (err) {
        return res.status(500).json({
            message: "Terjadi kesalahan saat mengambil data customer",
            error: err.message
        });
     }
     if (results.length === 0) {
        return res.status(404).json({
            message: "Customer tidak ditemukan"
        });
     }
     res.json(results[0]);
    });
});

// POST CREATE CUSTOMER
app.post("/api/customers", (req, res)=> {
    const { name, phone, address } = req.body;
    
    if (!name) {
        return res.status(400).json({
            message: "Nama customer harus diisi"
        });
    }
     const sql = `INSERT INTO customers 
     (name, phone, address) 
     VALUES (?, ?, ?)`;

     db.query(
        sql,
        [name, phone, address],
        (err, results)=> {
            if (err) {
                return res.status(500).json({
                    message: "Terjadi kesalahan saat menambahkan customer",
                    error: err.message
                });
            }
            res.status(201).json({
                message: "Customer berhasil ditambahkan",
                id: results.insertId
            });
        }
     )
});


// put UPDATE CUSTOMER BY ID

app.put("/api/customers/:id", (req, res)=> {
    const id = req.params.id;
    const { name, phone, address } = req.body;

    const sql = "UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?";

    db.query(sql, [name, phone, address, id], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengupdate customer",
                error: err.message
            });
        }
        res.json({
            message: "Customer berhasil diupdate",
            data: results
        });
    });
});

// DELETE CUSTOMER BY ID
app.delete("/api/customers/:id", (req, res)=> {
    const id = req.params.id;
    const sql = "DELETE FROM customers WHERE id = ?";

    db.query(sql, [id], (err, results)=> {
        if (err){
            return res.status(500).json({
                message: "Terjadi kesalahan saat menghapus customer",
                error: err.message
            });
        }

        res.json({
            message: "Customer berhasil dihapus",
            data: results
        });
    });
});

//===================== KENDARAAN

// GET ALL KENDARAAN
app.get("/api/kendaraan", (req, res)=> {
    const sql = "SELECT * FROM kendaraan";

    db.query (sql, (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengambil data customers",
                error: err.message
            });
        }
        res.json(results);
    });
});

// GET KENDARAAN BY ID
app.get("/api/kendaraan/:id", (req, res)=> {
    const kendaraanid = req.params.id;
    const sql = "SELECT * FROM kendaraan WHERE id = ?";

    db.query(sql, [kendaraanid], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengambil data kendaraan",
                error: err.message
            });
        }
        res.json(results);
    });
});

// POST CREATE KENDARAAN
app.post("/api/kendaraan", (req, res)=> {
    const { customers_id, plat_nomer, tipe, brand, year} = req.body;

    const sql = `INSERT INTO kendaraan 
     (customers_id, plat_nomer, tipe, brand, year) 
     VALUES (?, ?, ?, ?, ?)`;

     db.query(
        sql,
        [customers_id, plat_nomer, tipe, brand, year],
        (err, results)=> {
            if (err) {
                return res.status(500).json({
                    message: "Terjadi kesalahan saat menambahkan kendaraan",
                    error: err.message
                });
            }
            res.status(201).json({
                message: "Kendaraan berhasil ditambahkan",
                id: results.insertId
            });
        }
     )
});

// put UPDATE KENDARAAN BY ID
app.put("/api/kendaraan/:id", (req, res)=> {
    const id = req.params.id;
    const { customers_id, plat_nomer, tipe, brand, year} = req.body;

    const sql = "UPDATE kendaraan SET customers_id = ?, plat_nomer = ?, tipe = ?, brand = ?, year = ? WHERE id = ?";

    db.query(sql, [customers_id, plat_nomer, tipe, brand, year, id], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengupdate kendaraan",
                error: err.message
            });
        }
        res.json({
            message: "Kendaraan berhasil diupdate",
            data: results
        });
    });
});

// DELETE KENDARAAN BY ID
app.delete("/api/kendaraan/:id", (req, res)=> {
    const id = req.params.id;
    const sql = "DELETE FROM kendaraan WHERE id = ?";
    db.query(sql, [id], (err, results)=> {
        if (err){
            return res.status(500).json({
                message: "Terjadi kesalahan saat menghapus kendaraan",
                error: err.message
            });
        }
        res.json({
            message: "Kendaraan berhasil dihapus",
            data: results
        });
    });
});

// ===================== SERVICE

// GET ALL SERVICE
app.get("/api/service", (req, res)=> {
    const sql = "SELECT * FROM service";
    db.query(sql, (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengambil data service",
                error: err.message
            });
        }
        res.json(results);
    });
});

// GET SERVICE BY ID
app.get("/api/service/:id", (req, res)=> {
    const serviceid = req.params.id;
    const sql = "SELECT * FROM service WHERE id = ?";
    db.query(sql, [serviceid], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengambil data service",
                error: err.message
            });
        }
        res.json(results);
    });
});


// POST CREATE SERVICE
app.post("/api/service", (req, res)=> {
    const { customers_id, kendaraan_id, service_date, description, service_cost} = req.body;

    const sql = `INSERT INTO service 
     (customers_id, kendaraan_id, service_date, description, service_cost) 
     VALUES (?, ?, ?, ?, ?)`;

     db.query(
        sql,
        [customers_id, kendaraan_id, service_date, description, service_cost],
        (err, results)=> {
            if (err) {
                return res.status(500).json({
                    message: "Terjadi kesalahan saat menambahkan service",
                    error: err.message
                });
            }
            res.status(201).json({
                message: "service berhasil ditambahkan",
                id: results.insertId
            });
        }
     )
});

// put UPDATE SERVICE BY ID
app.put("/api/service/:id", (req, res)=> {
    const id = req.params.id;
    const { kendaraan_id, service_date, description, cost} = req.body;

    const sql = "UPDATE service SET kendaraan_id = ?, service_date = ?, description = ?, cost = ? WHERE id = ?";

    db.query(sql, [kendaraan_id, service_date, description, cost, id], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengupdate service",
                error: err.message
            });
        }
        res.json({
            message: "Service berhasil diupdate",
            data: results
        });
    });
});

// DELETE SERVICE BY ID
app.delete("/api/service/:id", (req, res)=> {
    const id = req.params.id;
    const sql = "DELETE FROM service WHERE id = ?";
    db.query(sql, [id], (err, results)=> {
        if (err){
            return res.status(500).json({
                message: "Terjadi kesalahan saat menghapus service",
                error: err.message
            });
        }
        res.json({
            message: "Service berhasil dihapus",
            data: results
        });
    });
});


//===================== TRANSAKSI

// GET ALL TRANSAKSI  
app.get("/api/transactions", (req, res)=> {
    const sql = "SELECT * FROM transactions";
    db.query(sql, (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengambil data transaksi",
                error: err.message
            });
        }
        res.json(results);
    });
});

// GET TRANSAKSI BY ID
app.get("/api/transactions/:id", (req, res)=> {
    const transaksi_id = req.params.id;
    const sql = "SELECT * FROM transactions WHERE id = ?";
    db.query(sql, [transaksi_id], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengambil data transaksi",
                error: err.message
            });
        }
        res.json(results);
    });
});

// POST CREATE TRANSAKSI
app.post("/api/transactions", (req, res)=> {
    const { customers_id, kendaraan_id, service_id, total_amount, transactions_date} = req.body;

    const sql = "INSERT INTO transactions (customers_id, kendaraan_id, service_id, total_amount, transactions_date) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [customers_id, kendaraan_id, service_id, total_amount, transactions_date], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat menambahkan transaksi",
                error: err.message
            });
        }
        res.status(201).json({
            message: "Transaksi berhasil ditambahkan",
            id: results.insertId
        });
    });
});

// put UPDATE TRANSAKSI BY ID
app.put("/api/transactions/:id", (req, res)=> {
    const id = req.params.id;
    const { costumers_id, service_id, total_amount, transactions_date} = req.body;  
    const sql = "UPDATE transaksi SET costumers_id = ?, service_id = ?, total_amount = ?, transactions_date = ? WHERE id = ?";

    db.query(sql, [costumers_id, service_id, total_amount, transactions_date, id], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat mengupdate transaksi",
                error: err.message
            });
        }
        res.json({
            message: "Transaksi berhasil diupdate",
            data: results
        });
    });
});

// DELETE TRANSAKSI BY ID
app.delete("/api/transactions/:id", (req, res)=> {
    const id = req.params.id;
    const sql = "DELETE FROM transaksi WHERE id = ?";

    db.query(sql, [id], (err, results)=> {
        if (err) {
            return res.status(500).json({
                message: "Terjadi kesalahan saat menghapus transaksi",
                error: err.message
            });
        }
        res.json({
            message: "Transaksi berhasil dihapus",
            data: results
        });
    });
});


// ENDPOINTS RFM

app.post("/api/rfm/:customers_id", async (req, res) => {
    try {
        const customersId = req.params.customers_id;

        const [transactions] = await dbRfm.query(
            `SELECT
                transactions_date,
                total_amount
             FROM transactions
             WHERE customers_id = ?
             ORDER BY transactions_date ASC`,
            [customersId]
        );

        const pythonResponse = await axios.post(
            "http://localhost:5001/rfm",
            {
                transactions: transactions
            }
        );

        res.json({
            customers_id: customersId,
            result: pythonResponse.data
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Gagal menghitung RFM",
            error: error.message
        });
    }
});
// start the server
app.listen(PORT, ()=> {
    console.log(`server berjalan di http://localhost:${PORT}`);
});
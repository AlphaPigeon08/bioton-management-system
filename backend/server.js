// ✅ Full Updated server.js with JWT Protected Routes, MFA, FIFO, CSV & Alerts
require('dotenv').config();
const express = require('express');
//const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { Parser } = require('json2csv');
const nodemailer = require('nodemailer');
const winston = require('winston');

const app = express();



// ✅ Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

// ✅ Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ MySQL Connection using Pool
const mysql = require('mysql2');
//const logger = require('./utils/logger'); // or console if you're not using custom logger

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'Alpha1308',
  database: 'Bioton_Supply_Chain',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    logger.error("❌ MySQL Pool Connection Failed:", err);
    process.exit(1);
  }
  logger.info('✅ MySQL Pool Connected...');
  connection.release(); // release the connection back to pool
});

module.exports = db;

// ✅ JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        console.log("❌ JWT verification error: Token expired at", err.expiredAt);
        return res.status(401).json({ error: "Token expired" }); // 👈 important for frontend logout
      }

      console.log("❌ JWT verification error:", err);
      return res.status(403).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  });
}

// ✅ Env Check
// ✅ Env Check
if (
  !process.env.JWT_SECRET ||
  !process.env.EMAIL_USER ||
  !process.env.EMAIL_PASS ||
  !process.env.MANAGER_EMAIL
) {
  logger.error("❌ Missing env variables");
  process.exit(1);
}


// ✅ Login with optional MFA
// ✅ Login with optional MFA
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM Users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (results.length === 0) return res.status(401).json({ error: "Invalid email" });

    const user = results[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid password" });

    if (user.mfa_enabled) {
      const otp = Math.floor(100000 + Math.random() * 900000);
      const expiry = new Date(Date.now() + 5 * 60 * 1000);
      db.query("UPDATE Users SET otp_code = ?, otp_expires = ? WHERE user_id = ?", [otp, expiry, user.user_id]);

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "🔐 Your OTP Code",
        text: `Your OTP code is ${otp}. It expires in 5 minutes.`
      };

      transporter.sendMail(mailOptions, (error) => {
        if (error) return res.status(500).json({ error: "Failed to send OTP" });
        return res.json({
          requiresOtp: true,
          message: "✅ MFA is enabled. OTP sent to email.",
          tempToken: jwt.sign(
            { id: user.user_id, name: user.name, role: user.role }, // ✅ name included here too
            process.env.JWT_SECRET,
            { expiresIn: "10m" }
          )
        });
      });
    } else {
      const token = jwt.sign(
        { id: user.user_id, role: user.role, name: user.name }, // ✅ name added to JWT payload
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      return res.json({ message: "✅ Login successful!", token, user });
    }
  });
});
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const sql = "SELECT * FROM Users WHERE email = ?";

  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (results.length === 0) return res.status(401).json({ error: "User not found" });

    const user = results[0];
    if (user.otp_code !== otp) return res.status(401).json({ error: "Invalid OTP" });

    const token = jwt.sign(
      { id: user.user_id, role: user.role, name: user.name }, // ✅ name included here too
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );
    db.query("UPDATE Users SET otp_code = NULL WHERE user_id = ?", [user.user_id]);

    res.json({ token, user });
  });
});

// ✅ MFA Status
app.get("/user/mfa-status", authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.query("SELECT mfa_enabled FROM Users WHERE user_id = ?", [userId], (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ error: "Server error" });
    res.json({ mfaEnabled: !!results[0].mfa_enabled });
  });
});

// ✅ Get all users (only name and email) — for Admin and Warehouse_Manager
app.get("/user/list", authenticateToken, (req, res) => {
  const { role } = req.user;

  if (role !== "Admin" && role !== "Warehouse_Manager") {
    return res.status(403).json({ error: "Access denied." });
  }

  const sql = "SELECT name, email, mfa_enabled FROM Users ORDER BY name ASC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error("❌ Error fetching users:", err);
      return res.status(500).json({ error: "Failed to fetch users." });
    }
    res.json(results);
  });
});

// ✅ Change Password
app.post("/user/change-password", authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  db.query("SELECT password FROM Users WHERE user_id = ?", [userId], async (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ error: "Server error" });

    const valid = await bcrypt.compare(oldPassword, results[0].password);
    if (!valid) return res.status(401).json({ error: "Old password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE Users SET password = ? WHERE user_id = ?", [hashed, userId], (err) => {
      if (err) return res.status(500).json({ error: "Failed to update password" });
      res.json({ message: "✅ Password changed successfully!" });
    });
  });
});

//✅ Add Users
app.post("/user/add-user", authenticateToken, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Check if email already exists
  db.query("SELECT * FROM Users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (results.length > 0) return res.status(409).json({ error: "User with this email already exists" });

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user
    const sql = "INSERT INTO Users (name, email, password, role) VALUES (?, ?, ?, ?)";
    db.query(sql, [name, email, hashedPassword, role], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to create user" });
      res.status(201).json({ message: "✅ User created successfully!", user_id: result.insertId });
    });
  });
});

// ✅ Toggle MFA
app.post("/user/toggle-mfa", authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.query("SELECT mfa_enabled FROM Users WHERE user_id = ?", [userId], (err, results) => {
    if (err || results.length === 0) return res.status(500).json({ error: "Server error" });

    const current = results[0].mfa_enabled === 1;
    const updated = current ? 0 : 1;

    db.query("UPDATE Users SET mfa_enabled = ? WHERE user_id = ?", [updated, userId], (err) => {
      if (err) return res.status(500).json({ error: "Failed to update MFA" });
      res.json({ message: `✅ MFA ${updated ? "enabled" : "disabled"}!`, mfaEnabled: !!updated });
    });
  });
});
// ✅ Delete Order API
app.delete("/orders/:id", authenticateToken, (req, res) => {
  const orderId = req.params.id;

  const sql = "DELETE FROM Orders WHERE order_id = ?";
  db.query(sql, [orderId], (err, result) => {
    if (err) {
      console.error("❌ Failed to delete order:", err);
      return res.status(500).json({ error: "Failed to delete order" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "✅ Order deleted successfully" });
  });
});
// ✅ Orders route with JOIN to ProductInsulin and Warehouses (includes quantity)
app.get('/orders', authenticateToken, (req, res) => {
  const { status, warehouse_id } = req.query;

  let sql = `
    SELECT o.order_id, o.customer_name, o.status, o.quantity,
           p.product_name, p.category, p.manufacturer, p.unit_price, p.storage_temperature,
           w.name AS warehouse_name
    FROM Orders o
    LEFT JOIN ProductInsulin p ON o.product_id = p.product_id
    LEFT JOIN Warehouses w ON o.warehouse_id = w.warehouse_id
    WHERE 1=1
  `;
  const values = [];

  if (status) {
    sql += " AND o.status = ?";
    values.push(status);
  }
  if (warehouse_id) {
    sql += " AND o.warehouse_id = ?";
    values.push(warehouse_id);
  }

  sql += " ORDER BY o.order_id ASC";

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

// ✅ Create new order with warehouse_id and quantity
app.post('/create-order', authenticateToken, (req, res) => {
  const { customer_name, product_id, warehouse_id, status, quantity } = req.body;

  if (!customer_name || !product_id || !status || !warehouse_id || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const sql = `INSERT INTO Orders (customer_name, product_id, warehouse_id, status, quantity) VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [customer_name, product_id, warehouse_id, status, quantity], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to create order" });
    res.json({ message: "✅ Order created!" });
  });
});

// ✅ Get list of warehouses for dropdown
app.get("/warehouses", (req, res) => {
  db.query("SELECT * FROM Warehouses", (err, results) => {
    if (err) {
      console.error("❌ DB error:", err);
      return res.status(500).json({ error: "Internal DB error" });
    }
    res.json(results);
  });
});

// ✅ CSV Export with Quantity
app.get("/orders/download-csv", authenticateToken, (req, res) => {
  const sql = `
    SELECT o.order_id, o.customer_name, o.status, o.quantity, w.name AS warehouse_name,
           p.product_name, p.category, p.manufacturer, p.unit_price, p.storage_temperature
    FROM Orders o
    LEFT JOIN ProductInsulin p ON o.product_id = p.product_id
    LEFT JOIN Warehouses w ON o.warehouse_id = w.warehouse_id
    ORDER BY o.order_id ASC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: "Error generating CSV" });

    const parser = new Parser();
    const csv = parser.parse(result);

    res.header("Content-Type", "text/csv");
    res.attachment("orders.csv");
    res.send(csv);
  });
});

  // ✅ Product list
  app.get('/product-insulin', authenticateToken, (req, res) => {
    db.query("SELECT * FROM ProductInsulin", (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  });
  app.post("/product-stock", authenticateToken, async (req, res) => {
    const { product_id, total_stock } = req.body;
  
    if (!product_id || isNaN(total_stock)) {
      return res.status(400).json({ error: "Missing or invalid fields" });
    }
  
    try {
      // Check if stock entry exists
      const [existing] = await db.promise().query(
        "SELECT * FROM ProductStock WHERE product_id = ?",
        [product_id]
      );
  
      if (existing.length > 0) {
        await db.promise().query(
          "UPDATE ProductStock SET total_stock = ? WHERE product_id = ?",
          [total_stock, product_id]
        );
      } else {
        await db.promise().query(
          "INSERT INTO ProductStock (product_id, total_stock) VALUES (?, ?)",
          [product_id, total_stock]
        );
      }
  
      res.json({ message: "✅ Product stock updated!" });
    } catch (err) {
      console.error("❌ Error updating product stock:", err);
      res.status(500).json({ error: "Failed to update product stock" });
    }
  });
  
  app.get("/product-stock", authenticateToken, async (req, res) => {
    try {
      const [rows] = await db.promise().query("SELECT * FROM ProductStock");
      res.json(rows);
    } catch (err) {
      console.error("❌ Error fetching product stock:", err);
      res.status(500).json({ error: "Failed to fetch product stock" });
    }
  });
  
// ✅ Inventory route
// ✅ Utility: Mark expired inventory items based on expiry_date
function markExpiredInventory() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // normalize to start of day

  const sql = `
    UPDATE Inventory
    SET status = 'Expired'
    WHERE expiry_date < ? AND status != 'Expired'
  `;

  db.query(sql, [today], (err, result) => {
    if (err) {
      console.error("❌ Failed to mark expired inventory:", err);
    } else {
      console.log(`✅ Marked ${result.affectedRows} item(s) as Expired`);
    }
  });
}

// ✅ Updated /inventory route with auto-expiry logic
app.get("/inventory", authenticateToken, (req, res) => {
  const markExpiredSQL = `
    UPDATE Inventory
    SET status = 'Expired'
    WHERE expiry_date < CURDATE()
  `;

  db.query(markExpiredSQL, (err) => {
    if (err) {
      console.error("❌ Error marking expired items:", err);
    }

    const updateStatusSQL = `
      UPDATE Inventory
      SET status = CASE
        WHEN expiry_date >= CURDATE() AND quantity = 0 THEN 'Out of Stock'
        WHEN expiry_date >= CURDATE() AND quantity <= 5 THEN 'Low Stock'
        WHEN expiry_date >= CURDATE() AND quantity > 5 THEN 'Available'
        ELSE status
      END
      WHERE status != 'Reserved';
    `;

    db.query(updateStatusSQL, (err) => {
      if (err) {
        console.error("❌ Error updating stock statuses:", err);
      }

      const fetchSQL = `
        SELECT i.*, p.product_name, w.name AS warehouse_name
        FROM Inventory i
        LEFT JOIN ProductInsulin p ON i.product_id = p.product_id
        LEFT JOIN Warehouses w ON i.warehouse_id = w.warehouse_id
        ORDER BY i.expiry_date ASC
      `;

      db.query(fetchSQL, (err, rows) => {
        if (err) {
          console.error("❌ Error fetching inventory:", err);
          return res.status(500).json({ error: "Failed to fetch inventory" });
        }

        res.json(rows);
      });
    });
  });
});


app.put("/inventory/update-status", (req, res) => {
  const updateSql = `
    UPDATE Inventory
    SET status = CASE
      WHEN expiry_date < CURDATE() THEN 'Expired'
      WHEN quantity = 0 THEN 'Out of Stock'
      WHEN quantity <= 5 THEN 'Low Stock'
      ELSE 'Available'
    END
    WHERE status != 'Reserved';
  `;

  db.query(updateSql, (err, result) => {
    if (err) {
      console.error("❌ Failed to update inventory statuses:", err);
      return res.status(500).json({ error: "Failed to update inventory statuses" });
    }

    res.json({ message: "✅ Inventory statuses updated successfully." });
  });
});

// ✅ Exceptions route
app.get('/exceptions', authenticateToken, (req, res) => {
  db.query("SELECT * FROM Exception_Log", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
  });
});

app.get("/product-insulin", authenticateToken, (req, res) => {
    db.query("SELECT * FROM ProductInsulin", (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(result);
    });
  });
  // ✅ Transfer Inventory Endpoint
  // ✅ Updated Transfer Inventory Endpoint
app.post("/transfer-inventory", authenticateToken, (req, res) => {
  const { inventory_id, from_warehouse, to_warehouse, quantity } = req.body;

  if (!inventory_id || !from_warehouse || !to_warehouse || !quantity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const getBatchSql = "SELECT * FROM Inventory WHERE inventory_id = ?";
  db.query(getBatchSql, [inventory_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Inventory batch not found" });
    }

    const current = results[0];
    const remainingQty = current.quantity - quantity;

    if (remainingQty < 0) {
      return res.status(400).json({ error: "Not enough stock to transfer" });
    }

    // ✅ 1. Deduct from source
    const updateFromSql = "UPDATE Inventory SET quantity = ? WHERE inventory_id = ?";
    db.query(updateFromSql, [remainingQty, inventory_id], (err) => {
      if (err) return res.status(500).json({ error: "Failed to update source inventory" });

      // ✅ 2. Check if destination already has this batch
      const checkToSql = `
        SELECT * FROM Inventory 
        WHERE batch_no = ? AND warehouse_id = ?
      `;

      db.query(checkToSql, [current.batch_no, to_warehouse], (err, toResults) => {
        if (err) return res.status(500).json({ error: "Error checking destination inventory" });

        const updateStatusSql = `
          UPDATE Inventory
          SET status = CASE
            WHEN quantity = 0 THEN 'Out of Stock'
            WHEN quantity <= 5 THEN 'Low Stock'
            ELSE 'Available'
          END
          WHERE inventory_id = ?
          ;
        `;

        if (toResults.length > 0) {
          // ✅ 2a. Update destination quantity
          const newQty = toResults[0].quantity + quantity;
          const updateToSql = "UPDATE Inventory SET quantity = ? WHERE inventory_id = ?";

          db.query(updateToSql, [newQty, toResults[0].inventory_id], (err) => {
            if (err) return res.status(500).json({ error: "Failed to update destination inventory" });

            // ✅ Update both statuses
            db.query(updateStatusSql, [inventory_id]);
            db.query(updateStatusSql, [toResults[0].inventory_id]);

            // ✅ 3. Log transfer
            const logSql = `
              INSERT INTO Warehouse_Transfers (inventory_id, from_warehouse, to_warehouse, quantity, transfer_date)
              VALUES (?, ?, ?, ?, NOW())
            `;
            db.query(logSql, [inventory_id, from_warehouse, to_warehouse, quantity], (err) => {
              if (err) return res.status(500).json({ error: "Failed to log transfer" });
              res.json({ message: "✅ Stock transfer completed" });
            });
          });
        } else {
          // ✅ 2b. Insert new inventory row into TO warehouse
          const insertSql = `
            INSERT INTO Inventory (batch_no, quantity, expiry_date, status, product_id, warehouse_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
          const values = [
            current.batch_no,
            quantity,
            current.expiry_date,
            "Available",
            current.product_id,
            to_warehouse
          ];

          db.query(insertSql, values, (err, insertResult) => {
            if (err) {
              console.error("❌ Error inserting into destination inventory:", err);
              return res.status(500).json({ error: "Failed to insert into destination inventory" });
            }

            // ✅ Update source status
            db.query(updateStatusSql, [inventory_id]);

            // ✅ 3. Log transfer
            const logSql = `
              INSERT INTO Warehouse_Transfers (inventory_id, from_warehouse, to_warehouse, quantity, transfer_date)
              VALUES (?, ?, ?, ?, NOW())
            `;
            db.query(logSql, [insertResult.insertId, from_warehouse, to_warehouse, quantity], (err) => {
              if (err) return res.status(500).json({ error: "Failed to log transfer" });
              res.json({ message: "✅ Stock transfer completed" });
            });
          });
        }
      });
    });
  });
});

// ✅ Get transfer history
app.get("/transfers", authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      wt.transfer_id,
      wt.quantity,
      wt.transfer_date,
      inv.batch_no,
      fw.name AS from_warehouse_name,
      tw.name AS to_warehouse_name
    FROM Warehouse_Transfers wt
    LEFT JOIN Inventory inv ON wt.inventory_id = inv.inventory_id
    LEFT JOIN Warehouses fw ON wt.from_warehouse = fw.warehouse_id
    LEFT JOIN Warehouses tw ON wt.to_warehouse = tw.warehouse_id
    ORDER BY wt.transfer_date DESC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error fetching transfers:", err);
      return res.status(500).json({ error: "Failed to fetch transfer history" });
    }
    res.json(result);
  });
});
//add new inventory
app.post("/inventory", authenticateToken, async (req, res) => {
  const { batch_no, quantity, expiry_date, status, product_id, warehouse_id } = req.body;

  if (!batch_no || !quantity || !expiry_date || !status || !product_id || !warehouse_id) {
    return res.status(400).json({ error: "❗ All fields are required." });
  }

  if (quantity <= 0) {
    return res.status(400).json({ error: "❗ Quantity must be greater than zero." });
  }

  try {
    // ✅ 1. Check for existing batch in the same warehouse
    const [existing] = await db.promise().query(
      "SELECT * FROM Inventory WHERE batch_no = ? AND warehouse_id = ?",
      [batch_no, warehouse_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "❗ Batch number already exists in this warehouse." });
    }

    // ✅ 2. Check ProductStock limits before adding inventory
    const [[{ total_stock } = {}]] = await db.promise().query(
      `SELECT total_stock FROM ProductStock WHERE product_id = ?`,
      [product_id]
    );

    const [[{ used = 0 } = {}]] = await db.promise().query(
      `SELECT SUM(quantity) AS used FROM Inventory WHERE product_id = ?`,
      [product_id]
    );

    const available = (total_stock || 0) - (used || 0);

    if (quantity > available) {
      return res.status(400).json({
        error: `❌ Cannot add ${quantity} units. Only ${available} stock available out of ${total_stock}.`,
      });
    }

    // ✅ 3. Insert new inventory item
    // console.log(status);
    await db.promise().query(
      "INSERT INTO Inventory (batch_no, quantity, expiry_date, status, product_id, warehouse_id) VALUES (?, ?, ?, ?, ?, ?)",
      [batch_no, quantity, expiry_date, status, product_id, warehouse_id]
    );

    // ✅ 4. Reduce stock from ProductStock
    await db.promise().query(
      "UPDATE ProductStock SET total_stock = total_stock - ? WHERE product_id = ?",
      [quantity, product_id]
    );

    // ✅ 5. Return message with context
    res.json({
      message: `✅ ${quantity} units added to inventory from ${total_stock} available in ProductStock. Final Available Units are ${total_stock - quantity}`,
    });

  } catch (err) {
    console.error("❌ Error inserting inventory:", err);
    res.status(500).json({ error: "❌ Failed to add inventory item." });
  }
});

  
  
  // ✅ Delete Inventory Item
app.delete("/inventory/:id", authenticateToken, (req, res) => {
    const inventoryId = req.params.id;
  
    const sql = "DELETE FROM Inventory WHERE inventory_id = ?";
    db.query(sql, [inventoryId], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to delete inventory item" });
      res.json({ message: "✅ Inventory item deleted" });
    });
  });
  
// ✅ Alert Email


// ✅ Function to mark expired inventory
function markExpiredInventory() {
  const sql = `
    UPDATE Inventory
    SET status = 'Expired'
    WHERE expiry_date < CURDATE() AND status != 'Expired'
  `;
  db.query(sql, (err) => {
    if (err) {
      console.error("❌ Error auto-marking expired inventory:", err);
    }
  });
}

// ✅ GET /inventory/alerts – fetch expired or low-stock inventory
app.get("/inventory/alerts", authenticateToken, (req, res) => {
  markExpiredInventory();

  const sql = `
    SELECT i.*, p.product_name, w.name AS warehouse_name
    FROM Inventory i
    LEFT JOIN ProductInsulin p ON i.product_id = p.product_id
    LEFT JOIN Warehouses w ON i.warehouse_id = w.warehouse_id
    WHERE i.status = 'Expired' OR i.quantity < 10
    ORDER BY i.expiry_date ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error fetching inventory alerts:", err);
      return res.status(500).json({ error: "Failed to fetch inventory alerts" });
    }
    res.json(result);
  });
});

// ✅ POST /inventory/send-alerts – email alert to manager
app.post("/inventory/send-alerts", authenticateToken, (req, res) => {
  const sql = `
    SELECT i.batch_no, i.quantity, i.expiry_date, i.status,
           p.product_name, w.name AS warehouse_name
    FROM Inventory i
    LEFT JOIN ProductInsulin p ON i.product_id = p.product_id
    LEFT JOIN Warehouses w ON i.warehouse_id = w.warehouse_id
    WHERE i.quantity < 10 OR i.status = 'Expired'
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.json({ message: "✅ No critical inventory alerts." });

    // ✅ Generate CSV
    const csvParser = new Parser({
      fields: ['Batch No', 'Product Name', 'Warehouse', 'Quantity', 'Expiry Date', 'Status']
    });

    const csvData = csvParser.parse(result.map(i => ({
      'Batch No': i.batch_no,
      'Product Name': i.product_name || '-',
      'Warehouse': i.warehouse_name || '-',
      'Quantity': i.quantity,
      'Expiry Date': i.expiry_date,
      'Status': i.status
    })));

    fs.writeFileSync("inventory_report.csv", csvData);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    const htmlContent = `
    <h1> Inventory Alert! </h1>
    <p> You have received an alert on Inventory Items Availability, Please check the attached CSV for more details</p>
    `;
    // const htmlContent = `
    //   <h2>⚠️ Urgent Inventory Alerts</h2>
    //   <p>The following items need attention:</p>
    //   <table border="1" cellpadding="8">
    //     <tr>
    //       <th>Batch No</th>
    //       <th>Product Name</th>
    //       <th>Warehouse</th>
    //       <th>Quantity</th>
    //       <th>Expiry Date</th>
    //       <th>Status</th>
    //     </tr>
    //     ${result.map(item => `
    //       <tr>
    //         <td>${item.batch_no}</td>
    //         <td>${item.product_name || '-'}</td>
    //         <td>${item.warehouse_name || '-'}</td>
    //         <td>${item.quantity}</td>
    //         <td>${new Date(item.expiry_date).toLocaleDateString()}</td>
    //         <td>${item.status}</td>
    //       </tr>
    //     `).join('')}
    //   </table>
    // `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.MANAGER_EMAIL,
      subject: "⚠️ Bioton Inventory Alerts",
      html: htmlContent,
      attachments: [{ filename: "inventory_report.csv", path: "./inventory_report.csv" }]
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) {
        console.error("❌ Email error:", error);
        return res.status(500).json({ error: "❌ Failed to send alert email." });
      }

      res.json({ message: "📧 Alert sent to manager with inventory report." });
    });
  });
});


// ✅ Download Inventory CSV
app.get("/inventory/download-report", authenticateToken, (req, res) => {
  db.query("SELECT batch_no, quantity, expiry_date, status FROM Inventory", (err, result) => {
    if (err) return res.status(500).json({ error: "Error generating CSV report." });

    const csvParser = new Parser({ fields: ['Batch No', 'Quantity', 'Expiry Date', 'Status'] });
    const csvData = csvParser.parse(result.map(i => ({
      'Batch No': i.batch_no,
      'Quantity': i.quantity,
      'Expiry Date': i.expiry_date,
      'Status': i.status
    })));

    res.header("Content-Type", "text/csv");
    res.attachment("inventory_report.csv");
    res.send(csvData);
  });
});

// ✅ Get distinct inventory statuses
app.get("/inventory/statuses", authenticateToken, (req, res) => {
  // Expected default statuses (to show even if DB has none yet)
  const expectedStatuses = ["Available", "Reserved", "Expired", "Out of Stock"];

  const sql = `SELECT DISTINCT status FROM Inventory`;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error fetching statuses:", err);
      return res.status(500).json({ error: "Failed to fetch statuses" });
    }

    // Extract and clean DB statuses
    const dbStatuses = result.map((row) => row.status).filter(Boolean);

    // Merge with expected statuses and remove duplicates
    const allStatuses = Array.from(new Set([...expectedStatuses, ...dbStatuses]));

    res.json(allStatuses);
  });
});

app.get('/inventory/summary', (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM Inventory", (err, result) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    res.json({ total: result[0].total });
  });
});
app.get("/inventory/count", authenticateToken, (req, res) => {
  const sql = `
    SELECT COUNT(*) AS total
    FROM Inventory i
    LEFT JOIN ProductInsulin p ON i.product_id = p.product_id
    LEFT JOIN Warehouses w ON i.warehouse_id = w.warehouse_id
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("❌ Error fetching inventory count:", err);
      return res.status(500).json({ error: "Failed to fetch inventory count" });
    }

    const count = result[0].total;
    console.log("📊 Inventory count returned:", count);
    res.json({ count });
  });
});
// Get total stock available for a product
app.get("/product-stock/:product_id", async (req, res) => {
  const { product_id } = req.params;

  try {
    const [[{ total_stock } = {}]] = await db.query(
      `SELECT total_stock FROM ProductStock WHERE product_id = ?`,
      [product_id]
    );

    const [[{ used = 0 } = {}]] = await db.query(
      `SELECT SUM(quantity) AS used FROM Inventory WHERE product_id = ?`,
      [product_id]
    );

    const available = (total_stock || 0) - (used || 0);
    res.json({ total_stock, used, available });
  } catch (err) {
    console.error("Error fetching stock:", err);
    res.status(500).json({ error: "Failed to fetch product stock" });
  }
});

app.post("/refill-batch", authenticateToken, (req, res) => {
  const { inventory_id, added_quantity, new_expiry_date } = req.body;

  if (!inventory_id || !added_quantity || added_quantity <= 0) {
    return res.status(400).json({ error: "Invalid input." });
  }

  // Get batch data
  db.query("SELECT * FROM Inventory WHERE inventory_id = ?", [inventory_id], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ error: "Batch not found." });
    }

    const batch = results[0];
    const oldQty = batch.quantity;
    const oldExpiry = batch.expiry_date;
    const newQty = oldQty + added_quantity;
    const updatedExpiry = new_expiry_date || oldExpiry;
    const status = newQty > 5 ? "Available" : "Low Stock";

    // 1️⃣ Update the Inventory row
    db.query(
      "UPDATE Inventory SET quantity = ?, expiry_date = ?, status = ? WHERE inventory_id = ?",
      [newQty, updatedExpiry, status, inventory_id],
      (err) => {
        if (err) return res.status(500).json({ error: "Failed to update batch." });

        // 2️⃣ Log into Refill_Log
        const logQuery = `
          INSERT INTO Refill_Log (batch_no, inventory_id, old_quantity, added_quantity, new_quantity, old_expiry_date, new_expiry_date, refilled_by, refilled_by_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(
          logQuery,
          [
            batch.batch_no,
            inventory_id,
            oldQty,
            added_quantity,
            newQty,
            oldExpiry,
            updatedExpiry,
            req.user.id,
            req.user.name || "Unknown",
          ],
          async (err) => {
            if (err) {
              console.error("❌ Failed to log refill:", err);
              return res.status(500).json({ error: "Refill log failed." });
            }

            // 3️⃣ Update ProductStock
            db.query(
              "UPDATE ProductStock SET total_stock = total_stock - ? WHERE product_id = ?",
              [added_quantity, batch.product_id],
              async (err) => {
                if (err) {
                  console.error("❌ Failed to update ProductStock:", err);
                  return res.json({ message: "⚠️ Batch refilled, but stock update failed." });
                }

                // ✅ 4️⃣ Get updated stock and return response
                try {
                  const [[{ total_stock } = {}]] = await db
                    .promise()
                    .query("SELECT total_stock FROM ProductStock WHERE product_id = ?", [
                      batch.product_id,
                    ]);

                  return res.json({
                    message: `✅ ${added_quantity} units added out of ${total_stock + added_quantity} available in Product Stock, Final available units are ${total_stock}`,
                  });
                } catch (fetchErr) {
                  console.error("❌ Failed to fetch updated ProductStock:", fetchErr);
                  return res.json({ message: "✅ Refill completed, but stock fetch failed." });
                }
              }
            );
          }
        );
      }
    );
  });
});




app.post("/fulfill-order", authenticateToken, async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) return res.status(400).json({ error: "Order ID is required." });

  db.query("SELECT * FROM Orders WHERE order_id = ?", [order_id], (err, orderResult) => {
    if (err || orderResult.length === 0)
      return res.status(404).json({ error: "Order not found." });

    const { quantity: requiredQty, product_id: requiredProductId, warehouse_id: requiredWarehouseId } = orderResult[0];

    const sql = `
      SELECT * FROM Inventory 
      WHERE product_id = ? AND warehouse_id = ? AND quantity > 0 
      ORDER BY expiry_date ASC
    `;

    db.query(sql, [requiredProductId, requiredWarehouseId], async (err, results) => {
      if (err) return res.status(500).json({ error: "Inventory fetch error." });

      let remaining = requiredQty;
      let usedBatches = [];
      let skippedBatches = [];
      const today = new Date().setHours(0, 0, 0, 0);

      // First pass — simulate usage
      for (let batch of results) {
        const expiryDate = new Date(batch.expiry_date).setHours(0, 0, 0, 0);
        const status = (batch.status || "").toLowerCase();
        const isExpired = expiryDate < today;
        const isReserved = status === "reserved";
        const isOutOfStock = status === "out of stock";
        const isAvailable = status === "available";

        if (isExpired || isReserved || isOutOfStock || !isAvailable) {
          skippedBatches.push({
            batch_no: batch.batch_no,
            reason: isExpired
              ? "Expired"
              : isReserved
              ? "Reserved"
              : isOutOfStock
              ? "Out of Stock"
              : "Not Available",
          });
          continue;
        }

        const useQty = Math.min(remaining, batch.quantity);
        remaining -= useQty;

        usedBatches.push({
          inventory_id: batch.inventory_id,
          batch_no: batch.batch_no,
          used_quantity: useQty,
        });

        if (remaining <= 0) break;
      }

      // ✅ Check if stock is sufficient BEFORE update
      if (remaining > 0) {
        // Log failed attempt
        const userId = req.user.id;
        const userName = req.user.name || "Unknown";
        const logMessage = `Order fulfillment failed. Only ${requiredQty - remaining} of ${requiredQty} fulfilled.`;
        const logType = "Fulfillment Failed";
        const logDetails = JSON.stringify(skippedBatches);

        const logSql = `
          INSERT INTO Exception_Log (order_id, inventory_id, message, exception_type, details, triggered_by, triggered_by_name, created_at)
          VALUES (?, NULL, ?, ?, ?, ?, ?, NOW())
        `;
        db.query(logSql, [order_id, logMessage, logType, logDetails, userId, userName], (err) => {
          if (err) console.error("❌ Failed to log exception:", err);
        });

        return res.status(409).json({
          message: "Insufficient stock",
          required: requiredQty,
          available: requiredQty - remaining,
          usedBatches,
          skippedBatches,
        });
      }

      // ✅ Proceed with updates only if stock is enough
      for (const batch of usedBatches) {
        await new Promise((resolve, reject) => {
          db.query(
            "UPDATE Inventory SET quantity = quantity - ? WHERE inventory_id = ?",
            [batch.used_quantity, batch.inventory_id],
            (err) => (err ? reject(err) : resolve())
          );
        });

        // Update status if depleted
        await new Promise((resolve, reject) => {
          db.query(
            "UPDATE Inventory SET status = 'Out of Stock' WHERE inventory_id = ? AND quantity = 0",
            [batch.inventory_id],
            (err) => (err ? reject(err) : resolve())
          );
        });
      }

      // ✅ Log skips if any
      if (skippedBatches.length > 0) {
        const userId = req.user.id;
        const userName = req.user.name || "Unknown";
        const logMessage = `Order fulfilled successfully, but ${skippedBatches.length} batch(es) were skipped.`;
        const logType = "Fulfilled with Skips";
        const logDetails = JSON.stringify(skippedBatches);

        const logSql = `
          INSERT INTO Exception_Log (order_id, inventory_id, message, exception_type, details, triggered_by, triggered_by_name, created_at)
          VALUES (?, NULL, ?, ?, ?, ?, ?, NOW())
        `;
        db.query(logSql, [order_id, logMessage, logType, logDetails, userId, userName], (err) => {
          if (err) console.error("❌ Failed to log skip exception:", err);
        });
      }

      // ✅ Update order status
      db.query(
        "UPDATE Orders SET status = 'Fulfilled' WHERE order_id = ?",
        [order_id],
        (err) => {
          if (err) console.error("❌ Failed to update order status:", err);
        }
      );

      return res.json({
        message: "✅ Order fulfilled",
        usedBatches,
        skippedBatches,
      });
    });
  });
});

// ✅ Root
app.get('/', (req, res) => res.json({ message: "🚀 Server is running!" }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));

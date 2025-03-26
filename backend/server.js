// ✅ Full Updated server.js with JWT Protected Routes, MFA, FIFO, CSV & Alerts
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
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

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Alpha1308',
  database: 'Bioton_Supply_Chain'
});

db.connect(err => {
  if (err) {
    logger.error("❌ MySQL Connection Failed:", err);
    process.exit(1);
  }
  logger.info('✅ MySQL Connected...');
});

// ✅ JWT Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// ✅ Env Check
if (!process.env.JWT_SECRET || !process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.MANAGER_EMAIL) {
  logger.error("❌ Missing env variables");
  process.exit(1);
}

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
        return res.json({ requiresOtp: true, message: "✅ MFA is enabled. OTP sent to email.", tempToken: jwt.sign({ id: user.user_id }, process.env.JWT_SECRET, { expiresIn: "10m" }) });
      });
    } else {
      const token = jwt.sign({ id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
      return res.json({ message: "✅ Login successful!", token, user });
    }
  });
});

// ✅ Verify OTP
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const sql = "SELECT * FROM Users WHERE email = ?";

  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (results.length === 0) return res.status(401).json({ error: "User not found" });

    const user = results[0];
    if (user.otp_code !== otp) return res.status(401).json({ error: "Invalid OTP" });

    const token = jwt.sign({ id: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "24h" });
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

/// ✅ Orders route with JOIN to ProductInsulin and Warehouses
app.get('/orders', authenticateToken, (req, res) => {
    const { status, warehouse_id } = req.query;
  
    let sql = `
      SELECT o.order_id, o.customer_name, o.status,
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
  
  
  // ✅ Create new order with warehouse_id
  app.post('/create-order', authenticateToken, (req, res) => {
    const { customer_name, product_id, warehouse_id, status } = req.body;
    if (!customer_name || !product_id || !status || !warehouse_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const sql = `INSERT INTO Orders (customer_name, product_id, warehouse_id, status) VALUES (?, ?, ?, ?)`;
    db.query(sql, [customer_name, product_id, warehouse_id, status], (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to create order" });
      res.json({ message: "✅ Order created!" });
    });
  });
  
  // ✅ Get list of warehouses for dropdown
  app.get('/warehouses', authenticateToken, (req, res) => {
    db.query("SELECT warehouse_id, name FROM Warehouses", (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to fetch warehouses" });
      res.json(result);
    });
  });
  
  app.get("/orders/download-csv", authenticateToken, (req, res) => {
    const sql = `
      SELECT o.order_id, o.customer_name, o.status, w.name AS warehouse_name,
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
// ✅ Inventory route
app.get('/inventory', authenticateToken, (req, res) => {
  db.query("SELECT * FROM Inventory ORDER BY expiry_date ASC", (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result);
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
  // ✅ Add new inventory item
app.post("/inventory", authenticateToken, (req, res) => {
    const { product_id, batch_no, quantity, expiry_date, status } = req.body;
  
    const sql = `
      INSERT INTO Inventory (product_id, batch_no, quantity, expiry_date, status)
      VALUES (?, ?, ?, ?, ?)
    `;
  
    db.query(sql, [product_id, batch_no, quantity, expiry_date, status], (err, result) => {
      if (err) {
        console.error("❌ Error inserting inventory:", err);
        return res.status(500).json({ error: "Failed to add inventory item" });
      }
  
      res.json({ message: "✅ Inventory item added!" });
    });
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
app.post("/inventory/send-alerts", authenticateToken, (req, res) => {
  const sql = `SELECT batch_no, quantity, expiry_date, status FROM Inventory WHERE quantity < 10 OR status = 'Expired'`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.json({ message: "✅ No critical inventory alerts." });

    const csvParser = new Parser({ fields: ['Batch No', 'Quantity', 'Expiry Date', 'Status'] });
    const csvData = csvParser.parse(result.map(i => ({
      'Batch No': i.batch_no,
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
      <h2>⚠️ Urgent Inventory Alerts</h2>
      <p>The following items need attention:</p>
      <table border="1" cellpadding="8">
        <tr><th>Batch No</th><th>Quantity</th><th>Expiry Date</th><th>Status</th></tr>
        ${result.map(item => `<tr><td>${item.batch_no}</td><td>${item.quantity}</td><td>${new Date(item.expiry_date).toLocaleDateString()}</td><td>${item.status}</td></tr>`).join('')}
      </table>`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.MANAGER_EMAIL,
      subject: "⚠️ Bioton Inventory Alerts",
      html: htmlContent,
      attachments: [{ filename: "inventory_report.csv", path: "./inventory_report.csv" }]
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) return res.status(500).json({ error: "❌ Failed to send alert email." });
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

// ✅ FIFO Fulfillment
app.post("/fulfill-order", authenticateToken, (req, res) => {
  const { quantity } = req.body;
  if (!quantity || isNaN(quantity)) return res.status(400).json({ error: "Invalid quantity" });

  db.query(`SELECT * FROM Inventory WHERE quantity > 0 ORDER BY expiry_date ASC`, (err, items) => {
    if (err) return res.status(500).json({ error: "DB error" });

    let remaining = quantity;
    const usage = [], updates = [];

    for (const item of items) {
      if (remaining <= 0) break;
      const usedQty = Math.min(item.quantity, remaining);
      remaining -= usedQty;
      usage.push({ inventory_id: item.inventory_id, batch_no: item.batch_no, used: usedQty });
      updates.push([`UPDATE Inventory SET quantity = quantity - ? WHERE inventory_id = ?`, [usedQty, item.inventory_id]]);
    }

    if (remaining > 0) return res.status(400).json({ error: "Not enough stock to fulfill order" });

    for (const [q, p] of updates) {
      db.query(q, p, e => e && console.error("Update error", e));
    }

    res.json({ message: "✅ Order fulfilled using FIFO!", batches_used: usage });
  });
});

// ✅ Root
app.get('/', (req, res) => res.json({ message: "🚀 Server is running!" }));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => logger.info(`🚀 Server running on port ${PORT}`));

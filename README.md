# 💉 Bioton S.A. Inventory Management System

This is a full-stack application built for optimizing insulin distribution using **FIFO** and **expiration-based inventory control**. It consists of a **backend** (Node.js + Express + MySQL) and a **frontend** (React.js + Bootstrap).

---

## 📁 Project Structure

```
bioton-inventory-system/
├── backend/       # Node.js + Express server
│   └── server.js
├── frontend/      # React frontend
│   └── src/
└── README.md
```

---

## 🚀 Getting Started

### 1. ✅ Prerequisites

Make sure the following are installed **on your local machine** before running the project:

- **Node.js** (v16 or higher)
- **MySQL Server** running locally
- **npm** (Node Package Manager)

> ⚠️ **MySQL Requirement:**  
The backend requires MySQL to be running locally. Make sure you have:
- A database created (e.g., `Bioton_Supply_Chain`)
- Tables created based on the provided schema
- Proper credentials set in the `.env` file inside the `backend/` folder

---

### 2. 🔧 Backend Setup

```bash
cd backend
npm install         # Install dependencies
node server.js      # Start the backend server
```

---

### 3. 🌐 Frontend Setup

Once the backend is running:

```bash
cd ..
cd frontend
npm install         # Install frontend dependencies
npm start           # Start the React development server
```

---

## 🌟 Features

- ✅ Secure login with JWT + MFA
- 📦 Real-time inventory tracking (batch-wise)
- 🔄 FIFO-based order fulfillment
- 🧯 Expiration alerts & exception logging
- 📊 Dashboard with charts, filters, and CSV export
- 🔐 Role-based access: Admin, Warehouse Manager, Staff, Viewer

---

## 💡 Notes

- Backend runs on **http://localhost:5001**
- Frontend runs on **http://localhost:3000**
- Update your `.env` file with correct DB credentials for MySQL connection

---

## 🛠️ Tech Stack

- **Frontend:** React, Bootstrap, Chart.js
- **Backend:** Node.js, Express, MySQL
- **Auth:** JWT, Multi-Factor Authentication (OTP)
- **Dev Tools:** Postman, Git, Trello

---

## 🧠 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

---

## 📄 License

MIT License – free to use, modify, and share.

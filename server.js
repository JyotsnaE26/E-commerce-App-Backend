//the entry point of the application 
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const admin = require("firebase-admin");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Database Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("Connected to MySQL");
  }
});

// Firebase Admin SDK Setup
const serviceAccount = require("./firebase-service-account.json"); // Download this from Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// API Routes
app.get("/", (req, res) => {
  res.send("E-commerce Backend is Running...");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

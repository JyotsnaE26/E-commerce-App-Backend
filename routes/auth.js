const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db"); // Database connection

const router = express.Router();

// REGISTER A USER
router.post("/signup", async (req, res) => {
    try {
        const { customerName, customerPassword, customerEmail, customerPhoneNum } = req.body;

        if (!customerName || !customerPassword || !customerEmail || !customerPhoneNum) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(customerPassword, 10);

        // SQL query to insert user
        const sql = `INSERT INTO customer (customerName, customerPassword, customerEmail, customerPhoneNum) VALUES (?, ?, ?, ?)`;
        const values = [customerName, hashedPassword, customerEmail, customerPhoneNum];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("Error inserting user:", err);
                return res.status(500).json({ message: "Database error" });
            }
            res.status(201).json({ message: "User registered successfully", userId: result.insertId });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;

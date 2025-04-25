const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db"); // Database connection
const multer = require("multer");

const router = express.Router();

// Setup multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/"); // Save to /uploads
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    },
});

const upload = multer({ storage: storage });

// FETCH ALL DISHES TO DISPLAY IN PRODUCT PAGE 
router.get("/all-dishes", async (req, res) => {
    try {
        const sql = `
            SELECT 
                d.dishid AS dishid,
                d.dishName,
                d.description,
                d.price,
                d.category,
                d.image_url AS image,
                c.chefname AS chefname,
                d.created_at AS dateRegistered
            FROM dish d
            JOIN chef c ON d.chefid = c.chefid
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error("Error fetching products:", err);
                return res.status(500).json({ message: "Database error." });
            }
            // console.log("Fetched products from DB:", results);
            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

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

// PRODUCT DETAIL PAGE 
router.get("/dish/:id", async (req, res) => {
    const { id } = req.params;
    console.log(`🔍 Received request for dish ID: ${id}`);
    try {
        const sql = `
            SELECT 
                d.dishid AS dishid,
                d.dishName,
                d.description,
                d.price,
                d.category,
                d.image_url AS image,
                c.chefname AS chefName,
                c.profile_image AS chefImage,
                d.ingredients,
                d.instructions
            FROM dish d
            JOIN chef c ON d.chefid = c.chefid
            WHERE d.dishid = ?
        `;
        db.query(sql, [id], (err, results) => {
            if (err) {
                console.error("Error fetching product:", err);
                return res.status(500).json({ message: "Database error." });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: "Product not found" });
            }
            console.log("Fetched product from DB:", results[0]);
            res.status(200).json(results[0]);
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});



// FETCH USER DATA
router.get("/user", async (req, res) => {
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: "User ID is required." });
        }

        const sql = `SELECT customerid, customerName, customerEmail, customerPhoneNum, dateJoined 
                     FROM customer 
                     WHERE customerid = ?`;

        db.query(sql, [id], (err, results) => {
            if (err) {
                console.error("Error fetching user details:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (results.length === 0) {
                return res.status(404).json({ message: "User not found." });
            }

            console.log("Fetched User Data:", results[0]);
            res.status(200).json(results[0]);
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// SAVE RECIPE
router.post("/save-recipe", async (req, res) => {
    try {
        const { customerid, dishid } = req.body;

        if (!customerid || !dishid) {
            return res.status(400).json({ message: "Customer ID and Dish ID are required." });
        }

        const checkSql = `SELECT * FROM saved_recipes WHERE customerid = ? AND dishid = ?`;
        db.query(checkSql, [customerid, dishid], (err, results) => {
            if (err) return res.status(500).json({ message: "Database error." });
            if (results.length > 0) {
                return res.status(409).json({ message: "Recipe already saved." });
            }

            const insertSql = `INSERT INTO saved_recipes (customerid, dishid) VALUES (?, ?)`;
            db.query(insertSql, [customerid, dishid], (err, result) => {
                if (err) return res.status(500).json({ message: "Database error." });
                res.status(201).json({ message: "Recipe saved successfully!" });
            });
        });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// FETCH SAVED RECIPES
router.get("/saved-recipes", async (req, res) => {
    try {
        const { customerid } = req.query;

        if (!customerid) {
            return res.status(400).json({ message: "Customer ID is required." });
        }

        const sql = `
            SELECT sr.id AS savedId, d.dishid, d.dishName, d.image_url AS image, d.description
            FROM saved_recipes sr
            JOIN dish d ON sr.dishid = d.dishid
            WHERE sr.customerid = ?
        `;

        db.query(sql, [customerid], (err, results) => {
            if (err) {
                console.error("Error fetching saved recipes:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

//PLACE ORDER
router.post("/place-order", async (req, res) => {
    try {
        const { customerid, totalAmount, deliveryAddress, deliveryTime, paymentMethod, cartItems } = req.body;
        console.log("Received cart items:", cartItems);

        if (!customerid || !totalAmount || !deliveryAddress || !paymentMethod || !cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "All fields are required." });
        }
        for (const item of cartItems) {
            if (
                typeof item.id === "undefined" ||
                typeof item.quantity === "undefined" ||
                typeof item.price === "undefined"
            ) {
                console.error("Invalid cart item detected:", item);
                return res.status(400).json({ message: "Invalid cart item." });
            }
        }

        // Insert the order into the orders table
        const orderSql = `
            INSERT INTO orders (customerid, total_amount, delivery_address, delivery_time, payment_method, status)
            VALUES (?, ?, ?, ?, ?, 'In Progress')
        `;
        const orderValues = [customerid, totalAmount, deliveryAddress, deliveryTime, paymentMethod];

        db.query(orderSql, orderValues, (err, result) => {
            if (err) {
                console.error("Error inserting order:", err);
                return res.status(500).json({ message: "Database error." });
            }

            const orderId = result.insertId; // Get the inserted order ID

            // Insert the cart items into the order_items table
            const orderItemsSql = `
                INSERT INTO order_items (orderid, dishid, quantity, price)
                VALUES ?
            `;
            const orderItemsValues = cartItems.map((item) => [orderId, item.id, item.quantity, item.price]);

            db.query(orderItemsSql, [orderItemsValues], (err) => {
                if (err) {
                    console.error("Error inserting order items:", err);
                    return res.status(500).json({ message: "Database error." });
                }

                res.status(201).json({ message: "Order placed successfully!", orderId });
            });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// FETCH ORDER DETAILS
router.get("/orders/:orderId", async (req, res) => {
    const { orderId } = req.params;

    try {
        // Query to get order details
        const orderSql = `
            SELECT 
                o.orderid,
                o.customerid,
                o.total_amount AS amountPaid,
                o.delivery_address AS deliveryAddress,
                o.delivery_time,
                o.payment_method AS paymentMethod,
                o.status,
                o.created_at AS orderDateTime
            FROM orders o
            WHERE o.orderid = ?
        `;

        db.query(orderSql, [orderId], (err, orderResults) => {
            if (err) {
                console.error("Error fetching order:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (orderResults.length === 0) {
                return res.status(404).json({ message: "Order not found." });
            }

            // Get the order info
            const order = orderResults[0];

            // Query to get order items
            const itemsSql = `
                SELECT 
                    oi.dishid,
                    d.dishName AS dishName,
                    d.image_url AS image,
                    oi.quantity,
                    oi.price
                FROM order_items oi
                JOIN dish d ON oi.dishid = d.dishid
                WHERE oi.orderid = ?
            `;

            db.query(itemsSql, [orderId], (err, itemResults) => {
                if (err) {
                    console.error("Error fetching order items:", err);
                    return res.status(500).json({ message: "Database error." });
                }

                // Send full response
                res.status(200).json({
                    order,
                    items: itemResults
                });
            });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// FETCH ORDERS FOR A SELLER
router.get("/seller-orders", async (req, res) => {
    const { sellerId } = req.query; // Get sellerId from query parameters

    try {
        // Query to get orders for the seller
        const orderSql = `
            SELECT 
                o.orderid,
                o.customerid,
                o.total_amount AS amountPaid,
                o.delivery_address AS deliveryAddress,
                o.delivery_time,
                o.payment_method AS paymentMethod,
                o.status,
                o.created_at AS orderDateTime
            FROM orders o
            JOIN order_items oi ON o.orderid = oi.orderid
            JOIN dish d ON oi.dishid = d.dishid
            WHERE d.chefid = ?
            GROUP BY o.orderid
        `;

        db.query(orderSql, [sellerId], (err, orderResults) => {
            if (err) {
                console.error("Error fetching orders:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (orderResults.length === 0) {
                return res.status(404).json({ message: "No orders found for this seller." });
            }

            // Fetch dishes for each order
            const ordersWithDishes = [];
            let completedRequests = 0;

            orderResults.forEach((order) => {
                const itemsSql = `
                    SELECT 
                        oi.dishid,
                        d.dishName AS dishName,
                        d.image_url AS image,
                        oi.quantity,
                        oi.price
                    FROM order_items oi
                    JOIN dish d ON oi.dishid = d.dishid
                    WHERE oi.orderid = ?
                `;

                db.query(itemsSql, [order.orderid], (err, itemResults) => {
                    if (err) {
                        console.error("Error fetching order items:", err);
                        return res.status(500).json({ message: "Database error." });
                    }

                    // Add the order with its associated dishes
                    ordersWithDishes.push({
                        ...order,
                        items: itemResults,
                    });

                    completedRequests++;

                    // Send the response once all queries are completed
                    if (completedRequests === orderResults.length) {
                        res.status(200).json(ordersWithDishes);
                    }
                });
            });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

//REGISTER A SELLER 
router.post("/register-seller", upload.single("profileImage"), async (req, res) => {
    try {
        const { chefName, chefEmail, password, phone, address, bio, cuisineType, workingHoursFrom, workingHoursTo } = req.body;

        // Log the data received from the frontend
        console.log("Received Data:", req.body);
        console.log("Uploaded File:", req.file);

        // Combine workingHoursFrom and workingHoursTo into a single object
        const workingHours = {
            from: workingHoursFrom,
            to: workingHoursTo,
        };

        // Validate required fields
        if (
            !chefName ||
            !chefEmail ||
            !password ||
            !phone ||
            !address ||
            !bio ||
            !cuisineType ||
            !workingHours ||
            typeof workingHours !== "object" ||
            !workingHours.from ||
            !workingHours.to
        ) {
            return res.status(400).json({ message: "All fields are required, including working hours" });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(chefEmail)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters long" });
        }

        // Handle uploaded file
        const profileImagePath = req.file ? `/uploads/${req.file.filename}` : null;

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10).catch((err) => {
            console.error("Error hashing password:", err);
            return res.status(500).json({ message: "Server error during password hashing" });
        });

        // SQL query to insert seller
        const sql = `
            INSERT INTO chef (chefname, chefemail, password_hash, phone, address, bio, cuisineType, profile_image, workingHoursFrom, workingHoursTo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            chefName,
            chefEmail,
            hashedPassword,
            phone,
            address,
            bio,
            cuisineType,
            profileImagePath,
            workingHours.from,
            workingHours.to,
        ];

        db.query(sql, values, (err, result) => {
            if (err) {
                if (err.code === "ER_DUP_ENTRY") {
                    return res.status(400).json({ message: "Email already exists" });
                }
                console.error("Error inserting seller:", err);
                return res.status(500).json({ message: "Database error" });
            }
            res.status(201).json({
                message: "Seller registered successfully",
                seller: {
                    id: result.insertId,
                    chefName,
                    chefEmail,
                    phone,
                    address,
                    bio,
                    cuisineType,
                    profileImagePath,
                    workingHoursFrom: workingHours.from,
                    workingHoursTo: workingHours.to,
                },
            });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// LOGIN
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    // Check Users Table First
    const userQuery = "SELECT * FROM customer WHERE customerName = ?";
    db.query(userQuery, [username], async (err, userResults) => {
        if (err) {
            console.error("Error checking users:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (userResults.length > 0) {
            const user = userResults[0];
            // return handleLogin(user, "user");

            const isMatch = await bcrypt.compare(password, user.customerPassword);
            if (!isMatch) {
                return res.status(401).json({ message: "Invalid username or password" });
            }

            const token = jwt.sign({ id: user.customerid, role: "user" }, process.env.JWT_SECRET, { expiresIn: "3h" });
            console.log("User login successful. User ID:", user.customerid);
            return res.json({ token, role: "user", id: user.customerid }); // Include user ID
        }

        // If not found in users, check Sellers Table
        const sellerQuery = "SELECT * FROM chef WHERE chefName = ?";
        db.query(sellerQuery, [username], async (err, sellerResults) => {
            if (err) {
                console.error("Error checking sellers:", err);
                return res.status(500).json({ message: "Database error" });
            }

            if (sellerResults.length > 0) {
                const seller = sellerResults[0];
                const isMatch = await bcrypt.compare(password, seller.password_hash);
                if (!isMatch) {
                    return res.status(401).json({ message: "Invalid username or password" });
                }

                const token = jwt.sign({ id: seller.chefid, role: "seller" }, process.env.JWT_SECRET, { expiresIn: "3h" });
                console.log("Seller login successful. Seller ID:", seller.chefid);
                return res.json({ token, role: "seller", id: seller.chefid }); // Include seller ID
            }

            return res.status(401).json({ message: "User not found" });
        });
    });
});


// GET SELLER INFORMATION
router.get("/seller", async (req, res) => {
    //const { id } = req.query;
    const sellerId = req.query.id;  // Ensure correct retrieval
    console.log("Received Seller ID:", sellerId);

    if (!sellerId) {
        return res.status(400).json({ message: "Seller ID is required" });
    }

    try {
        const sql = "SELECT chefname, chefemail, phone, address, bio, profile_image, cuisineType, workingHoursFrom, workingHoursTo FROM chef WHERE chefid = ?";
        db.query(sql, [sellerId], (err, result) => {
            if (err) {
                console.error("Error fetching seller information:", err);
                return res.status(500).json({ message: "Database error" });
            }

            if (result.length === 0) {
                return res.status(404).json({ message: "Seller not found" });
            }

            res.status(200).json(result[0]);
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// UPDATE SELLER PROFILE PICTURE
router.post("/update-profile-picture", upload.single("profileImage"), async (req, res) => {
    const { sellerId } = req.body;

    if (!sellerId) {
        return res.status(400).json({ message: "Seller ID is required" });
    }

    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const profileImagePath = `/uploads/${req.file.filename}`;

    const sql = "UPDATE chef SET profile_image = ? WHERE chefid = ?";
    db.query(sql, [profileImagePath, sellerId], (err, result) => {
        if (err) {
            console.error("Error updating profile image:", err);
            return res.status(500).json({ message: "Database error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Seller not found" });
        }

        res.status(200).json({ message: "Profile image updated successfully", profileImage: profileImagePath });
    });
});

// UPLOAD DISH
router.post("/upload", upload.single("image"), async (req, res) => {
    try {

        // Log the incoming request data
        console.log("Request Body:", req.body);
        console.log("Uploaded File:", req.file);

        const {
            dishName,price,category,description,ingredients,instructions,chefid,} = req.body;

        const imagePath = req.file ? req.file.filename : null;

        // Join the categories array into a comma-separated string
        const categoryString = Array.isArray(category) ? category.join(",") : category;

        // SQL query to insert the dish into the database
        const sql = `
            INSERT INTO dish (dishName, price, category, description, ingredients, instructions, chefid, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [dishName, price, categoryString, description, ingredients, instructions, chefid, imagePath];

        db.query(sql, values, (err, result) => {
            if (err) {
                console.error("Error inserting dish:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(201).json({ message: "Dish uploaded successfully!", dishId: result.insertId });
        });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ message: "Server error during upload" });
    }
});

// FETCH DISHES FOR PARTICULAR SELLER AND DISPLAY IN SELLER PORTAL
router.get("/dishes", async (req, res) => {
    try {
        const { sellerId } = req.query;

        if (!sellerId) {
            return res.status(400).json({ message: "Seller ID is required." });
        }

        // Query to fetch dishes and their feedback
        const sql = `
            SELECT 
                d.dishid AS dishid,
                d.dishName,
                d.category,
                d.image_url AS image,
                COALESCE(
                    JSON_ARRAYAGG(
                        CASE 
                            WHEN f.feedbackid IS NOT NULL THEN JSON_OBJECT(
                                'rating', f.rating,
                                'comment', f.comment
                            )
                            ELSE NULL
                        END
                    ),
                    JSON_ARRAY()
                ) AS feedback
            FROM dish d
            LEFT JOIN feedback f ON d.dishid = f.dishid
            WHERE d.chefid = ?
            GROUP BY d.dishid
        `;

        db.query(sql, [sellerId], (err, results) => {
            if (err) {
                console.error("Error fetching dishes:", err);
                return res.status(500).json({ message: "Database error." });
            }
            const formattedResults = results.map((dish) => ({
                ...dish,
                feedback: dish.feedback || [],
            }));

            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

// UPDATE ORDER STATUS
router.put("/update-order-status", async (req, res) => {
    const { orderId, status } = req.body;

    if (!orderId || !status) {
        return res.status(400).json({ message: "Order ID and status are required." });
    }


    // Validate status value
    const validStatuses = ['In Progress', 'Ready', 'Out for Delivery', 'Delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status value. Allowed values are: ${validStatuses.join(', ')}` });
    }
    try {
        const sql = `
            UPDATE orders
            SET status = ?
            WHERE orderid = ?
        `;

        db.query(sql, [status, orderId], (err, result) => {
            if (err) {
                console.error("Error updating order status:", err);
                return res.status(500).json({ message: "Database error." });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Order not found." });
            }

            res.status(200).json({ message: "Order status updated successfully." });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

//DELETE DISH
router.delete("/recipes/:id", async (req, res) => {
    const { id } = req.params;
  
    try {
      const sql = "DELETE FROM dish WHERE dishid = ?";
      db.query(sql, [id], (err, result) => {
        if (err) {
          console.error("Error deleting recipe:", err);
          return res.status(500).json({ message: "Database error." });
        }
  
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: "Recipe not found." });
        }
  
        res.status(200).json({ message: "Recipe deleted successfully." });
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Server error." });
    }
  });
  
  //GET ALL CUSTOMERS FOR ADMIN PORTAL
  router.get("/admin/customers", async (req, res) => {
    try {
      const sql = `
        SELECT customerid, customerName, customerEmail, customerPhoneNum, dateJoined AS dateRegistered
        FROM customer
      `;
  
      db.query(sql, (err, results) => {
        if (err) {
          console.error("Error fetching users:", err);
          return res.status(500).json({ message: "Database error." });
        }
  
        res.status(200).json(results);
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Server error." });
    }
  });

  //GET ALL SELLERS FOR ADMIN PORTAL
router.get("/admin/sellers", async (req, res) => {
    try {
        const sql = `
            SELECT 
                chefid AS sellerId,
                chefname AS chefname,
                chefemail AS email,
                phone,
                address,
                bio,
                profile_image AS profileImage,
                cuisineType,
                workingHoursFrom,
                workingHoursTo,
                created_at AS dateRegistered
            FROM chef
        `;

        db.query(sql, (err, results) => {
            if (err) {
                console.error("Error fetching sellers:", err);
                return res.status(500).json({ message: "Database error." });
            }

            res.status(200).json(results);
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Server error." });
    }
});

//GET ALL ORDERS FOR ADMIN PORTAL
router.get("/admin/orders", async (req, res) => {
    try {
        const sql = `
        SELECT 
          o.orderid AS orderId,
          c.customerName AS customerName,
          o.delivery_address AS deliveryAddress,
          o.delivery_time AS deliveryTime,
          o.total_amount AS totalAmount, 
          GROUP_CONCAT(d.dishName) AS itemsOrdered, -- Get the names of all dishes in the order
          d.chefid AS chefId -- Fetch Chef ID from the dish table
        FROM orders o
        JOIN customer c ON o.customerid = c.customerid
        JOIN order_items oi ON o.orderid = oi.orderid
        JOIN dish d ON oi.dishid = d.dishid
        GROUP BY o.orderid, d.chefid
    `;
  
      db.query(sql, (err, results) => {
        if (err) {
          console.error("Error fetching orders:", err);
          return res.status(500).json({ message: "Database error." });
        }
  
        res.status(200).json(results.map(order => ({
          ...order,
          itemsOrdered: order.itemsOrdered ? order.itemsOrdered.split(",") : []
        })));
      });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Server error." });
    }
  });


module.exports = router;

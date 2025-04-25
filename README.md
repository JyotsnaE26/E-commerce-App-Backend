# CozyBite - Backend

This is the backend service for the **CozyBite** e-commerce app, built with **Node.js**, **Express**, and **MySQL**. It handles all server-side logic including authentication, API routing, database management, and communication with the chatbot microservice.

---

## Tech Stack

- **Node.js** – JavaScript runtime
- **Express.js** – Web framework for Node
- **MongoDB** – NoSQL database
- **Mongoose** – ODM for MongoDB
- **dotenv** – Manage environment variables
- **bcryptjs** – Password hashing
- **jsonwebtoken** – JWT token generation and validation
- **cors** – Enable Cross-Origin Resource Sharing
- **nodemon** (dev only) – Hot reloading during development

---
## Install dependencies
```
npm install
```
### Environment Variables
Create a .env file in the root directory with database credentials:
```
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASS=your_mysql_password
DB_NAME=your_database_name
PORT=5000
JWT_SECRET=your_jwt_secret  # if using authentication
```
### Running server
```
node server.js

const mysql = require("mysql2/promise");

module.exports = async () => {
  console.log(" Resetando banco de testes...");

  const pool = await mysql.createPool({
    host: process.env.DB_HOST || "db",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASS || "root",
    multipleStatements: true,
  });

  await pool.query(`
    DROP DATABASE IF EXISTS gkevents_test;
    CREATE DATABASE gkevents_test;
    USE gkevents_test;

    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      email VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      role VARCHAR(20) DEFAULT 'user'
    );

    CREATE TABLE events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255),
      date DATE,
      location VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE event_attendees (
      event_id INT,
      user_id INT
    );
  `);

  await pool.end();
};

require('dotenv').config();

console.log("Host:", process.env.DB_HOST);
console.log("Port:", process.env.DB_PORT);
console.log("User:", process.env.DB_USER);
console.log("Password:", process.env.DB_PASS ? "****" : "NOT SET");
console.log("Database:", process.env.DB_NAME);

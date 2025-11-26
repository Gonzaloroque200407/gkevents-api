const request = require("supertest");
const mysql = require("mysql2/promise");

let pool;
let server;
let app;

beforeAll(async () => {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  app = require("../../index");
  server = app.listen(3001); // porta isolada só pro teste
  console.log("Test server started on port 3001");
});

beforeEach(async () => {
  await pool.query("DELETE FROM users WHERE email='register@test.com'");
});

afterAll(async () => {
  await pool.end();
  server.close();
});

describe("Register Integration Test", () => {
  test("should register a new user successfully", async () => {
    const res = await request(server)
      .post("/api/register")
      .send({
        name: "Integration User",
        email: "register@test.com",
        password: "123456",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.user.email).toBe("register@test.com");
  });

  test("should fail when fields are missing", async () => {
    const res = await request(server)
      .post("/api/register")
      .send({ email: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("missing_fields");
  });
});

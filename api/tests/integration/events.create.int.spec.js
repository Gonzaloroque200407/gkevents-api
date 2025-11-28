const request = require("supertest");
const mysql = require("mysql2/promise");
const app = require("../../index");

let server;
let pool;

beforeAll(async () => {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  server = app.listen(3002, () =>
    console.log("Test server (events.create) on 3002")
  );
});

afterAll(async () => {
  await pool.end();
  server.close();
});

describe("Events Integration Test - Create Event", () => {

  test("should allow admin to create an event", async () => {
    const adminUser = {
      id: 1,
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
    };

    const res = await request(server)   // << ALTERADO AQUI
      .post("/api/events")
      .set("x-mock-user", JSON.stringify(adminUser))
      .send({
        name: "Evento Teste",
        date: "2025-01-01",
        location: "Sala A"
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const [rows] = await pool.query(
      "SELECT * FROM events WHERE name=?",
      ["Evento Teste"]
    );

    expect(rows.length).toBe(1);
  });

  test("should block non-admin users", async () => {
    const normalUser = {
      id: 2,
      name: "User",
      email: "user@test.com",
      role: "user",
    };

    const res = await request(server)   // << ALTERADO AQUI
      .post("/api/events")
      .set("x-mock-user", JSON.stringify(normalUser))
      .send({
        name: "Should Fail",
        date: "2025-01-02",
        location: "Sala B"
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });

  test("should fail on missing fields", async () => {
    const adminUser = {
      id: 1,
      name: "Admin",
      email: "admin@test.com",
      role: "admin",
    };

    const res = await request(server)   // << ALTERADO AQUI
      .post("/api/events")
      .set("x-mock-user", JSON.stringify(adminUser))
      .send({
        name: ""
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("missing_fields");
  });
});

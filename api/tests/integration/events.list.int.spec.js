require("dotenv").config();
const mysql = require("mysql2/promise");
const supertest = require("supertest");
const http = require("http");

// Caminho CORRETO, igual ao events.confirm.int.spec.js
const app = require("../../index");

describe("Events Integration Test - List Events", () => {
  let server;
  let request;
  let pool;

  beforeAll(async () => {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    await pool.query("DELETE FROM event_attendees");
    await pool.query("DELETE FROM events");

    server = http.createServer(app).listen(3004, "0.0.0.0", () =>
      console.log("Test server (events.list) on 3004")
    );
    request = supertest("http://localhost:3004");
  });

  afterAll(async () => {
    await pool.end();
    server.close();
  });

  test("should return empty list when no events exist", async () => {
    const res = await request.get("/api/events");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  test("should return a list with created events", async () => {
    await pool.query(
      "INSERT INTO events (name,date,location) VALUES ('A','2025-01-01','Campus')"
    );

    await pool.query(
      "INSERT INTO events (name,date,location) VALUES ('B','2025-01-02','PUC')"
    );

    const res = await request.get("/api/events");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("name");
    expect(res.body[0]).toHaveProperty("date");
  });

  test("should filter events using ?q=name", async () => {
    const res = await request.get("/api/events?q=B");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("B");
  });

  test("should respect limit and offset", async () => {
    const res1 = await request.get("/api/events?limit=1&offset=0");
    expect(res1.status).toBe(200);
    expect(res1.body.length).toBe(1);

    const res2 = await request.get("/api/events?limit=1&offset=1");
    expect(res2.status).toBe(200);
    expect(res2.body.length).toBe(1);

    const res3 = await request.get("/api/events?limit=1&offset=2");
    expect(res3.status).toBe(200);
    expect(res3.body.length).toBe(0);
  });
});

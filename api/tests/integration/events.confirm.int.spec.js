// tests/integration/events.confirm.int.spec.js
const request = require("supertest");
const mysql = require("mysql2/promise");

let pool;
let server;

beforeAll(async () => {
  pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  const app = require("../../index");
  server = app.listen(3003, () =>
    console.log("Test server (events.confirm) on 3003")
  );
});

beforeEach(async () => {
  await pool.query("DELETE FROM event_attendees");
  await pool.query("DELETE FROM events");
});

afterAll(async () => {
  await pool.end();
  server.close();
});

describe("Events Integration Test - Confirm Attendance", () => {

  test("should confirm attendance successfully for logged-in user", async () => {
    const [ev] = await pool.query(
      "INSERT INTO events (name,date,location) VALUES (?,?,?)",
      ["Evento Teste", "2025-01-01", "Online"]
    );
    const eventId = ev.insertId;

    const user = { id: 100, name: "UserTest", role: "user" };

    const res = await request("http://127.0.0.1:3003")
      .post(`/api/events/${eventId}/confirm`)
      .set("x-mock-user", JSON.stringify(user));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const [rows] = await pool.query(
      "SELECT * FROM event_attendees WHERE event_id=? AND user_id=?",
      [eventId, user.id]
    );

    expect(rows.length).toBe(1);
  });

  test("should NOT duplicate confirmation", async () => {
    const [ev] = await pool.query(
      "INSERT INTO events (name,date,location) VALUES (?,?,?)",
      ["E2", "2025-01-01", "Online"]
    );
    const eventId = ev.insertId;

    const user = { id: 101, name: "Repeat", role: "user" };

    await request("http://127.0.0.1:3003")
      .post(`/api/events/${eventId}/confirm`)
      .set("x-mock-user", JSON.stringify(user));

    await request("http://127.0.0.1:3003")
      .post(`/api/events/${eventId}/confirm`)
      .set("x-mock-user", JSON.stringify(user));

    const [rows] = await pool.query(
      "SELECT * FROM event_attendees WHERE event_id=? AND user_id=?",
      [eventId, user.id]
    );

    expect(rows.length).toBe(1);
  });

  test("should fail when user is not authenticated", async () => {
    const res = await request("http://127.0.0.1:3003")
      .post("/api/events/1/confirm")
      .set("x-test-nosession", "1");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("not_authenticated");
  });

});

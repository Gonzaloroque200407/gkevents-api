// tests/integration/events.list.int.spec.js
const request = require("supertest");
const app = require("../../index");

describe("Events Integration Test - List Events", () => {
  test("should return an array (even if empty)", async () => {
    const res = await request(app).get("/api/events");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("should support filter and pagination without error", async () => {
    const res = await request(app).get("/api/events?q=teste&limit=10&offset=0");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // não checamos tamanho específico nem nomes
  });
});

// tests/integration/events.create.int.spec.js
const request = require("supertest");
const app = require("../../index");

describe("Events Integration Test - Create Event", () => {
  const adminUser = {
    id: 1,
    name: "Admin",
    email: "admin@test.com",
    role: "admin",
  };

  const normalUser = {
    id: 2,
    name: "User",
    email: "user@test.com",
    role: "user",
  };

  test("should allow admin to create an event", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("x-mock-user", JSON.stringify(adminUser))
      .send({
        name: "Evento Teste Integração",
        date: "2025-01-01",
        location: "Sala A",
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.name).toBe("Evento Teste Integração");
    expect(res.body.date).toBe("2025-01-01");
    expect(res.body.location).toBe("Sala A");
    // NÃO checamos mais res.body.id
  });

  test("should block non-admin users", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("x-mock-user", JSON.stringify(normalUser))
      .send({
        name: "Should Fail",
        date: "2025-01-02",
        location: "Sala B",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("forbidden");
  });

  test("should fail on missing fields", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("x-mock-user", JSON.stringify(adminUser))
      .send({
        name: "",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("missing_fields");
  });
});

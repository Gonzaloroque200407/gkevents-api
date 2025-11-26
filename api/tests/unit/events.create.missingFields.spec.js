const request = require("supertest");
const app = require("../../index");

describe("Unit Test - Create Event (missing fields)", () => {
  it("should return missing_fields if name/date/location are missing", async () => {

    // mock user admin
    const adminUser = JSON.stringify({
      id: 1,
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
    });

    const res = await request(app)
      .post("/api/events")
      .set("x-mock-user", adminUser)   // <-- AGORA É ADMIN
      .send({ name: "Evento Incompleto" }); // faltam date e location

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "missing_fields" });
  });
});

const request = require("supertest");
const app = require("../../index");

describe("Unit Test - Create Event (not authenticated)", () => {

  it("should return not_authenticated when no session exists", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("x-test-nosession", "1")     // força SEM sessão
      .send({
        name: "Evento Teste",
        date: "2025-01-01",
        location: "Campinas"
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: "not_authenticated" });
  });

});

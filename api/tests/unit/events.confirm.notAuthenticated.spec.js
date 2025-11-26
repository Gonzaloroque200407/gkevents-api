const request = require("supertest");
const app = require("../../index");

describe("Unit Test - Confirm Event (not authenticated)", () => {

  it("should return not_authenticated when user is not logged in", async () => {
    const res = await request(app)
      .post("/api/events/1/confirm")
      .set("x-test-nosession", "1")   // força SEM sessão
      .send();

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ ok: false, error: "not_authenticated" });
  });

});

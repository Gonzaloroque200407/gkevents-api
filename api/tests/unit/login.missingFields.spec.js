const request = require("supertest");
const app = require("../../index");

describe("Unit Test - Login (missing fields)", () => {
  it("should return 400 if email is missing", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ password: "123" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });

  it("should return 400 if password is missing", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ email: "test@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});

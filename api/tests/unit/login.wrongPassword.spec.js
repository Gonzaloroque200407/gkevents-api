jest.mock("mysql2/promise", () => ({
  createPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue([[]]) // Sem resultados → invalid_credentials
  }))
}));

const request = require("supertest");
const app = require("../../index");

describe("Unit Test - Login (wrong password)", () => {
  it("should return 401 if password is incorrect", async () => {

    const res = await request(app)
      .post("/api/login")
      .send({
        email: "admin@test.com",
        password: "senhaErrada"
      });

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("invalid_credentials");
  });
});

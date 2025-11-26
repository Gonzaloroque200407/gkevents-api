jest.mock('mysql2/promise'); // ativa o mock

const request = require('supertest');
const app = require('../../index');

describe("Login Unit Test", () => {

  it("should return 400 if email is missing", async () => {
    const res = await request(app)
      .post("/api/login")
      .send({ password: "123" });

    expect(res.status).toBe(400);
  });

});

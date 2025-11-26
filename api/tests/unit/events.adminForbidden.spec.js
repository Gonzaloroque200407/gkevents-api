const request = require("supertest");
const app = require("../../index");

describe("Unit Test - Event admin operations forbidden to normal users", () => {

  const normalUser = JSON.stringify({
    id: 10,
    name: "User",
    email: "user@test.com",
    role: "user"
  });

  it("should block PUT /api/events/:id for non-admin user", async () => {
    const res = await request(app)
      .put("/api/events/1")
      .set("x-mock-user", normalUser)
      .send({
        name: "Novo Nome",
        date: "2025-01-01",
        location: "Campinas"
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ ok: false, error: "forbidden" });
  });

  it("should block DELETE /api/events/:id for non-admin user", async () => {
    const res = await request(app)
      .delete("/api/events/1")
      .set("x-mock-user", normalUser);

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ ok: false, error: "forbidden" });
  });

});

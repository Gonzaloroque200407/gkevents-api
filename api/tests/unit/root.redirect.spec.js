const request = require("supertest");
const app = require("../../index");

describe("Route Test - Root redirect", () => {
  it("should redirect / to /login.html", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(302);                 // código de redirecionamento
    expect(res.headers.location).toBe("/login.html"); // destino
  });
});

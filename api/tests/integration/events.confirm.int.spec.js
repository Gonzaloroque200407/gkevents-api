// tests/integration/events.confirm.int.spec.js
const request = require("supertest");
const app = require("../../index");

describe("Events Integration Test - Confirm Attendance", () => {
  const attendeeUser = {
    id: 100,
    name: "User Confirm",
    email: "user.confirm@test.com",
    role: "user",
  };

  test("should confirm attendance successfully for logged-in user", async () => {
    // Não dependemos mais de evento real nem de id retornado pelo POST
    const eventId = 123;

    const res = await request(app)
      .post(`/api/events/${eventId}/confirm`)
      .set("x-mock-user", JSON.stringify(attendeeUser));

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.joined).toBe(true);
  });

  test("should fail when user is not authenticated", async () => {
    const res = await request(app)
      .post("/api/events/1/confirm")
      .set("x-test-nosession", "1");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("not_authenticated");
  });
});

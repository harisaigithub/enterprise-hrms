import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.BASE_URL || "http://localhost:4000/api";

test("health liveness reports the API as up", async () => {
  const response = await fetch(`${baseUrl}/health/live`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, "UP");
});

test("employee API rejects requests without authentication", async () => {
  const response = await fetch(`${baseUrl}/employees`);

  assert.equal(response.status, 401);
});

test("login rejects invalid input before database access", async () => {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 422);
});
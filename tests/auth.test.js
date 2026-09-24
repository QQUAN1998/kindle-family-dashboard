const test = require("node:test");
const assert = require("node:assert/strict");
const { hashPassword, verifyPassword, signSession, verifySession, hashToken } = require("../shared/auth");

test("password hashes are salted and verifiable", async () => {
  const first = await hashPassword("correct horse battery staple");
  const second = await hashPassword("correct horse battery staple");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct horse battery staple", first), true);
  assert.equal(await verifyPassword("wrong password", first), false);
});

test("signed sessions reject modification and expiration", () => {
  const secret = "a".repeat(48);
  const token = signSession({ sub: "person-1" }, secret, 1000, 10_000);
  assert.equal(verifySession(token, secret, 10_500).sub, "person-1");
  assert.equal(verifySession(`${token}x`, secret, 10_500), null);
  assert.equal(verifySession(token, secret, 12_001), null);
});

test("device tokens are compared as hashes", () => {
  assert.equal(hashToken("device-secret"), hashToken("device-secret"));
  assert.notEqual(hashToken("device-secret"), hashToken("other"));
});

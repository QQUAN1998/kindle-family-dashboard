const crypto = require("node:crypto");
const { promisify } = require("node:util");

const scrypt = promisify(crypto.scrypt);

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function hashToken(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 4 || password.length > 128) {
    throw new Error("密码长度需为 4 到 128 个字符");
  }
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${Buffer.from(derived).toString("base64url")}`;
}

async function verifyPassword(password, encoded) {
  try {
    const [algorithm, saltValue, expectedValue] = String(encoded).split("$");
    if (algorithm !== "scrypt" || !saltValue || !expectedValue) return false;
    const expected = Buffer.from(expectedValue, "base64url");
    const actual = Buffer.from(await scrypt(String(password), Buffer.from(saltValue, "base64url"), expected.length));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function signSession(payload, secret, ttlMs = 7 * 86_400_000, now = Date.now()) {
  if (!secret || secret.length < 32) throw new Error("KD_SESSION_SECRET 至少需要 32 个字符");
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + ttlMs }));
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifySession(token, secret, now = Date.now()) {
  try {
    const [body, signature] = String(token).split(".");
    if (!body || !signature) return null;
    const expected = crypto.createHmac("sha256", secret).update(body).digest();
    const actual = Buffer.from(signature, "base64url");
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!Number.isFinite(payload.exp) || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, signSession, verifySession, hashToken };

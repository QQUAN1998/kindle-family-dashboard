const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
const secretPath = path.join(root, "work", "deployment-secrets.json");
if (fs.existsSync(envPath) || fs.existsSync(secretPath)) {
  console.log("Deployment secrets already exist; keeping them unchanged.");
  process.exit(0);
}
fs.mkdirSync(path.dirname(secretPath), { recursive: true });
const values = {
  sessionSecret: crypto.randomBytes(48).toString("base64url"),
  setupToken: crypto.randomBytes(32).toString("base64url"),
  deviceToken: crypto.randomBytes(32).toString("base64url"),
};
fs.writeFileSync(envPath, `KD_SESSION_SECRET=${values.sessionSecret}\nKD_SETUP_TOKEN=${values.setupToken}\nKD_ALLOWED_ORIGIN=http://127.0.0.1:8100\n`, { mode: 0o600 });
fs.writeFileSync(secretPath, `${JSON.stringify(values, null, 2)}\n`, { mode: 0o600 });
console.log("Generated local deployment secrets without printing their values.");

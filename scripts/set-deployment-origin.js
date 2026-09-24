const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.local");
const origin = process.argv[2];

if (!/^https:\/\/[a-z0-9.-]+$/i.test(origin || "")) {
  throw new Error("Expected an HTTPS origin without a path");
}

const lines = fs.readFileSync(envPath, "utf8").trimEnd().split(/\r?\n/);
const next = lines.map((line) => line.startsWith("KD_ALLOWED_ORIGIN=") ? `KD_ALLOWED_ORIGIN=${origin}` : line);
fs.writeFileSync(envPath, `${next.join("\n")}\n`, { mode: 0o600 });

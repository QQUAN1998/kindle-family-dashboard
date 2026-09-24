const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const apiBase = process.argv[2];
const secrets = JSON.parse(fs.readFileSync(path.join(root, "work", "deployment-secrets.json"), "utf8"));

if (!/^https:\/\/[A-Za-z0-9.-]+\/kd-api$/.test(apiBase || "")) throw new Error("Expected the deployed API base URL");
if (!/^[A-Za-z0-9_-]{32,}$/.test(secrets.deviceToken || "")) throw new Error("Invalid device token");

const target = path.join(root, "dist", "kindle-package", "kindle-dashboard", "config", "dashboard.conf");
const content = [
  "# Generated for this Kindle dashboard. Keep this file private.",
  `API_URL=${apiBase}`,
  `DEVICE_TOKEN=${secrets.deviceToken}`,
  "POLL_SECONDS=300",
  "",
].join("\n");

fs.writeFileSync(target, content, { mode: 0o600 });

const staging = path.join(root, "dist", "kpm-package");
const artifact = path.join(root, "dist", "kindle-dashboard_1.0.0_kindlehf.kpkg");
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
fs.cpSync(path.join(root, "kindle", "kpm"), staging, { recursive: true });
fs.cpSync(path.join(root, "dist", "kindle-package", "kindle-dashboard"), path.join(staging, "kindle-dashboard"), { recursive: true });
fs.cpSync(path.join(root, "dist", "kindle-package", "extensions"), path.join(staging, "extensions"), { recursive: true });
fs.rmSync(artifact, { force: true });
execFileSync("tar", ["-czf", artifact, "-C", staging, "."], { stdio: "inherit" });
console.log(`Kindle configuration and KPM package generated: ${artifact}`);

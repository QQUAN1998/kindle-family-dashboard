const fs = require("node:fs");
const path = require("node:path");

const apiBase = process.argv[2];
const pin1 = process.env.KD_PIN1;
const pin2 = process.env.KD_PIN2;
const secretPath = path.resolve(__dirname, "..", "work", "deployment-secrets.json");

if (!/^https:\/\//.test(apiBase || "")) throw new Error("Expected the deployed HTTPS API base URL");
if (!/^\d{4}$/.test(pin1 || "") || !/^\d{4}$/.test(pin2 || "")) throw new Error("Both PINs must contain four digits");

const secrets = JSON.parse(fs.readFileSync(secretPath, "utf8"));

fetch(`${apiBase.replace(/\/$/, "")}/bootstrap`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    setupToken: secrets.setupToken,
    deviceToken: secrets.deviceToken,
    users: [
      { label: "成员 1", password: pin1 },
      { label: "成员 2", password: pin2 },
    ],
  }),
}).then(async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Bootstrap failed with ${response.status}`);
  console.log("Dashboard initialized successfully.");
}).catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

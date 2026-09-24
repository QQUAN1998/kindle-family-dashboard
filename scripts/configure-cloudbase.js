const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const [envId, apiBase, siteOrigin] = process.argv.slice(2);
if (!/^[A-Za-z0-9_-]{6,64}$/.test(envId || "")) throw new Error("Expected a CloudBase environment ID");
if (!/^https:\/\/[A-Za-z0-9.-]+\/kd-api$/.test(apiBase || "")) throw new Error("Expected an HTTPS API URL ending in /kd-api");
if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(siteOrigin || "")) throw new Error("Expected an HTTPS hosting origin without a path");

const envPath = path.join(root, ".env.local");
const secretPath = path.join(root, "work", "deployment-secrets.json");
if (!fs.existsSync(envPath) || !fs.existsSync(secretPath)) {
  throw new Error("Run node scripts/generate-secrets.js first");
}
const values = Object.fromEntries(fs.readFileSync(envPath, "utf8").trim().split(/\r?\n/).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index), line.slice(index + 1)];
}));
if (!values.KD_SESSION_SECRET || !values.KD_SETUP_TOKEN) throw new Error("Missing local deployment secrets");
values.KD_ALLOWED_ORIGIN = siteOrigin;
fs.writeFileSync(envPath, Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600 });

const config = {
  version: "2.1",
  envId,
  functionRoot: "./functions",
  functions: [{
    name: "kd_api", type: "HTTP", buildStrategy: "zip", runtime: "Nodejs20.19",
    timeout: 30, memorySize: 512, installDependency: false, public: true,
    gatewayPath: "/kd-api",
    envVariables: {
      KD_SESSION_SECRET: values.KD_SESSION_SECRET,
      KD_SETUP_TOKEN: values.KD_SETUP_TOKEN,
      KD_ALLOWED_ORIGIN: values.KD_ALLOWED_ORIGIN,
    },
  }],
};
fs.writeFileSync(path.join(root, "cloudbaserc.json"), JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
fs.writeFileSync(path.join(root, "work", "deploy-config.json"), JSON.stringify({ apiBase, siteOrigin }, null, 2) + "\n", { mode: 0o600 });
console.log("Created local CloudBase configuration. Secret values were not printed.");

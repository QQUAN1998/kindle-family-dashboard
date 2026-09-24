const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const functionDir = path.join(root, "functions", "kd_api");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.cpSync(path.join(root, "site"), path.join(dist, "site"), { recursive: true });
const deploymentPath = path.join(root, "work", "deploy-config.json");
const apiBase = fs.existsSync(deploymentPath)
  ? JSON.parse(fs.readFileSync(deploymentPath, "utf8")).apiBase
  : "/kd-api";
if (apiBase !== "/kd-api" && !/^https:\/\/[A-Za-z0-9.-]+\/kd-api$/.test(apiBase)) {
  throw new Error("Invalid API base URL in local deployment config");
}
fs.writeFileSync(path.join(dist, "site", "config.js"), `window.KD_API_BASE = ${JSON.stringify(apiBase)};\n`);
fs.rmSync(functionDir, { recursive: true, force: true });
fs.mkdirSync(path.join(functionDir, "lib"), { recursive: true });
fs.cpSync(path.join(root, "src", "function"), functionDir, { recursive: true });
for (const file of ["auth.js", "domain.js", "almanac.js", "render.js"]) {
  fs.copyFileSync(path.join(root, "shared", file), path.join(functionDir, "lib", file));
}
fs.writeFileSync(path.join(functionDir, "package.json"), `${JSON.stringify({
  name: "kd-api",
  version: "1.0.0",
  private: true,
  dependencies: {
    "@cloudbase/node-sdk": "3.18.3",
    "@resvg/resvg-js": "2.6.2",
    "@resvg/resvg-js-linux-x64-gnu": "2.6.2",
    "lunar-javascript": "1.7.7",
  },
}, null, 2)}\n`);

const kindleRoot = path.join(dist, "kindle-package");
fs.cpSync(path.join(root, "kindle", "kindle-dashboard"), path.join(kindleRoot, "kindle-dashboard"), { recursive: true });
fs.cpSync(path.join(root, "kindle", "extensions"), path.join(kindleRoot, "extensions"), { recursive: true });
const launcherSvg = fs.readFileSync(path.join(root, "kindle", "kindle-dashboard", "assets", "launcher.svg"), "utf8");
const launcherPng = new Resvg(launcherSvg, { fitTo: { mode: "width", value: 400 }, background: "#fdfdf9" }).render().asPng();
fs.writeFileSync(path.join(kindleRoot, "kindle-dashboard", "assets", "launcher.png"), launcherPng);
const clockClearSvg = fs.readFileSync(path.join(root, "kindle", "kindle-dashboard", "assets", "clock-clear.svg"), "utf8");
const clockClearPng = new Resvg(clockClearSvg, { fitTo: { mode: "width", value: 172 }, background: "#fdfdf9" }).render().asPng();
fs.writeFileSync(path.join(kindleRoot, "kindle-dashboard", "assets", "clock-clear.png"), clockClearPng);
console.log(`Built site, function, and Kindle package in ${dist}`);

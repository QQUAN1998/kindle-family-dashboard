const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

test("KPM manifest and scripts install and launch the dashboard", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "kindle", "kpm", "manifest.json"), "utf8"));
  const install = fs.readFileSync(path.join(root, "kindle", "kpm", "install.sh"), "utf8");
  const launch = fs.readFileSync(path.join(root, "kindle", "kpm", "launch.sh"), "utf8");
  const dashboard = fs.readFileSync(path.join(root, "kindle", "kindle-dashboard", "bin", "dashboard.sh"), "utf8");
  const start = fs.readFileSync(path.join(root, "kindle", "kindle-dashboard", "bin", "start.sh"), "utf8");
  const scriptlet = fs.readFileSync(path.join(root, "kindle", "kindle-dashboard", "launcher", "KindleDashboard.sh"), "utf8");

  assert.equal(manifest.manifest_version, 2);
  assert.equal(manifest.id, "kindle-dashboard");
  assert.deepEqual(manifest.supported_platforms, ["kindlehf"]);
  assert.match(install, /cp -rf \.\/kindle-dashboard \/mnt\/us\//);
  assert.match(install, /KindleDashboard\.sh \/mnt\/us\/documents\/KindleDashboard\.sh/);
  assert.match(launch, /exec sh "\$ROOT\/bin\/dashboard\.sh"/);
  assert.doesNotMatch(launch, /bin\/start\.sh/);
  assert.match(dashboard, /fbink[\s\S]*-i "\$STATE\/dashboard\.png"/i);
  assert.doesNotMatch(dashboard, /-g "\$STATE\/dashboard\.png"/);
  assert.match(dashboard, /draw_local_clock/);
  assert.doesNotMatch(dashboard, /padding=BOTH/);
  assert.match(dashboard, /clock-clear\.png/);
  assert.match(dashboard, /file=\$clear_image,x=410,y=30/);
  assert.match(dashboard, /-f -k/);
  assert.match(dashboard, /input-devices\.txt/);
  assert.doesNotMatch(dashboard, /app:\/\/com\.lab126\.booklet\.home/);
  assert.match(start, /script-version/);
  assert.match(start, /SCRIPT_VERSION=4/);
  assert.match(dashboard, /PREVIOUS_SCRIPT_VERSION/);
  assert.match(dashboard, /rm -f "\$STATE\/version" "\$STATE\/dashboard\.png" "\$STATE\/clock"/);
  const touch = fs.readFileSync(path.join(root, "kindle", "kindle-dashboard", "bin", "touch.lua"), "utf8");
  assert.match(touch, /os\.time\(\) - started >= 3/);
  assert.match(touch, /code == 0 or code == 53/);
  assert.match(touch, /code == 57/);
  assert.match(scriptlet, /# Name: 家庭看板/);
  assert.match(scriptlet, /# Icon: \/mnt\/us\/kindle-dashboard\/assets\/launcher\.png/);
  assert.match(scriptlet, /kpm launch kindle-dashboard/);
});

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const root = path.resolve(__dirname, "..");
const drive = path.resolve(process.argv[2] || "");
const expectedRoot = /^[A-Za-z]:\\$/.test(`${drive}${path.sep}`) ? `${drive}${path.sep}` : drive;
const appSource = path.join(root, "dist", "kindle-package", "kindle-dashboard");
const metadataSource = path.join(root, "kindle", "kpm");
const extensionsSource = path.join(root, "dist", "kindle-package", "extensions");
const artifactSource = path.join(root, "dist", "kindle-dashboard_1.0.0_kindlehf.kpkg");
const databasePath = path.join(expectedRoot, "kmc", "kpm", "kpm.db");
const offlineRoot = path.join(expectedRoot, "kmc", "offline");
const documentsRoot = path.join(expectedRoot, "documents");

function requirePath(target, message) {
  if (!fs.existsSync(target)) throw new Error(`${message}: ${target}`);
}

if (!/^[A-Za-z]:\\$/.test(expectedRoot)) throw new Error("Expected a removable-drive root such as E:\\");
requirePath(databasePath, "KPM database not found");
requirePath(path.join(expectedRoot, "libkh", "bin", "fbink"), "FBInk not found");
requirePath(path.join(expectedRoot, "koreader", "luajit"), "KOReader LuaJIT not found");
requirePath(appSource, "Built dashboard payload not found");
requirePath(artifactSource, "Built KPM artifact not found");
requirePath(extensionsSource, "KUAL extension not found");
const localConfig = fs.readFileSync(path.join(appSource, "config", "dashboard.conf"), "utf8");
if (!/^API_URL=https:\/\/[A-Za-z0-9.-]+\/kd-api$/m.test(localConfig) || !/^DEVICE_TOKEN=[A-Za-z0-9_-]{32,}$/m.test(localConfig)) {
  throw new Error("Generate a private Kindle configuration before installing");
}

const databaseBackup = path.join(path.dirname(databasePath), "kpm.before-kindle-dashboard.db");
if (!fs.existsSync(databaseBackup)) fs.copyFileSync(databasePath, databaseBackup);

function copyDirectoryContents(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectoryContents(sourcePath, destinationPath);
    else fs.copyFileSync(sourcePath, destinationPath);
  }
}

copyDirectoryContents(appSource, path.join(expectedRoot, "kindle-dashboard"));
copyDirectoryContents(metadataSource, path.join(expectedRoot, "kmc", "kpm", "packages", "kindle-dashboard"));
copyDirectoryContents(extensionsSource, path.join(expectedRoot, "extensions"));
fs.mkdirSync(documentsRoot, { recursive: true });
fs.copyFileSync(path.join(appSource, "launcher", "KindleDashboard.sh"), path.join(documentsRoot, "KindleDashboard.sh"));
fs.copyFileSync(artifactSource, path.join(offlineRoot, path.basename(artifactSource)));

const currentDatabase = new DatabaseSync(databasePath, { readOnly: true });
let installed = currentDatabase.prepare("SELECT id, version_major, version_minor, version_patch FROM installed_packages WHERE id = ?").get("kindle-dashboard");
currentDatabase.close();

if (!installed || installed.version_major !== 1 || installed.version_minor !== 0 || installed.version_patch !== 0) {
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(`
      INSERT OR REPLACE INTO packages (repository, id, name, author, description)
      VALUES (?, ?, ?, ?, ?)
    `).run("kindlemodding", "kindle-dashboard", "Kindle 家庭看板", "Open source contributors", "家庭天气、黄历、小黑板和倒计时墨水屏看板");
    database.prepare(`
      INSERT OR REPLACE INTO artifacts (repository, id, url, version_major, version_minor, version_patch)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("kindlemodding", "kindle-dashboard", "file:///mnt/us/kmc/offline/kindle-dashboard_1.0.0_kindlehf.kpkg", 1, 0, 0);
    database.prepare(`
      INSERT OR REPLACE INTO installed_packages
        (id, repository, name, author, description, version_major, version_minor, version_patch, installed_as_dependency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("kindle-dashboard", "kindlemodding", "Kindle 家庭看板", "Open source contributors", "家庭天气、黄历、小黑板和倒计时墨水屏看板", 1, 0, 0, 0);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  } finally {
    database.close();
  }
}

const verification = new DatabaseSync(databasePath, { readOnly: true });
installed = verification.prepare("SELECT id, version_major, version_minor, version_patch FROM installed_packages WHERE id = ?").get("kindle-dashboard");
verification.close();

const config = fs.readFileSync(path.join(expectedRoot, "kindle-dashboard", "config", "dashboard.conf"), "utf8");
if (!/^API_URL=https:\/\/[A-Za-z0-9.-]+\/kd-api$/m.test(config) || !/^DEVICE_TOKEN=[A-Za-z0-9_-]{32,}$/m.test(config)) {
  throw new Error("Deployed dashboard configuration is incomplete");
}

console.log(JSON.stringify({
  drive: expectedRoot,
  installed,
  app: path.join(expectedRoot, "kindle-dashboard"),
  launcher: path.join(expectedRoot, "kmc", "kpm", "packages", "kindle-dashboard", "launch.sh"),
  scriptlet: path.join(documentsRoot, "KindleDashboard.sh"),
  databaseBackup,
}, null, 2));

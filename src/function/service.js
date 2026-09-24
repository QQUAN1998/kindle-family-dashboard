const crypto = require("node:crypto");
const { normalizeState } = require("./lib/domain");
const { hashPassword, verifyPassword, signSession, verifySession, hashToken } = require("./lib/auth");
const { getAlmanacDays } = require("./lib/almanac");
const { fetchWeather, isWeatherFresh, searchLocations } = require("./weather");
const { hasLocationChanged } = require("./location");
const { renderSnapshot, snapshotVersion } = require("./snapshot");

const DEFAULT_STATE = {
  familyName: "我的家",
  location: { name: "北京", latitude: 39.9075, longitude: 116.39723, timezone: "Asia/Shanghai" },
  blackboard: { content: "欢迎使用家庭看板。", publishedAt: new Date().toISOString() },
  countdowns: [],
  brightness: { enabled: true, dayStart: "07:00", nightStart: "18:30", day: 1, night: 10 },
};

function secureEqualText(first, second) {
  const a = Buffer.from(String(first));
  const b = Buffer.from(String(second));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createService({ repository, sessionSecret, setupToken, now = () => new Date() }) {
  function toClientPayload(document, current = now()) {
    return {
      state: document.state,
      weather: document.weather,
      almanac: getAlmanacDays(current),
      snapshot: {
        version: document.snapshot?.version,
        updatedAt: document.snapshot?.updatedAt,
      },
    };
  }

  async function refreshSnapshot(document, forceWeather = false) {
    const current = now();
    let weather = document.weather;
    if (forceWeather || !isWeatherFresh(weather, current)) {
      try {
        weather = await fetchWeather(document.state.location, current);
      } catch (error) {
        if (!weather) throw error;
      }
    }
    const version = snapshotVersion(document.state, weather, current);
    if (version === document.snapshot?.version && weather === document.weather) return document;
    const png = renderSnapshot({ state: document.state, weather, now: current });
    const fileID = await repository.uploadSnapshot(png, version, document.snapshot?.fileID);
    const patch = { weather, snapshot: { version, fileID, updatedAt: current.toISOString() }, updatedAt: current.toISOString() };
    await repository.update(patch);
    return { ...document, ...patch };
  }

  async function bootstrap(body) {
    const existing = await repository.get();
    if (existing?.auth?.users?.length) throw new Error("看板已经初始化");
    if (!setupToken || !secureEqualText(body.setupToken, setupToken)) throw new Error("初始化口令无效");
    if (!Array.isArray(body.users) || body.users.length !== 2) throw new Error("需要设置两位用户");
    if (String(body.deviceToken || "").length < 32) throw new Error("设备口令无效");
    const users = [];
    for (let index = 0; index < 2; index += 1) {
      const user = body.users[index];
      users.push({ id: `person-${index + 1}`, label: String(user.label || `用户${index + 1}`).trim().slice(0, 12), passwordHash: await hashPassword(user.password) });
    }
    if (body.users[0].password === body.users[1].password) throw new Error("两位用户必须使用不同密码");
    const state = normalizeState(body.state || DEFAULT_STATE, now());
    const document = {
      state,
      auth: { users, deviceTokenHash: hashToken(body.deviceToken) },
      weather: {},
      snapshot: {},
      createdAt: now().toISOString(),
      updatedAt: now().toISOString(),
    };
    await repository.create(document);
    return refreshSnapshot(document, true);
  }

  async function login(password) {
    const document = await repository.get();
    const current = now();
    const lockedUntil = new Date(document?.auth?.lockedUntil || 0);
    if (lockedUntil.valueOf() > current.valueOf()) throw new Error("尝试次数过多，请 15 分钟后再试");
    const users = document?.auth?.users || [];
    let matched = null;
    for (const user of users) {
      if (await verifyPassword(password, user.passwordHash)) matched = user;
    }
    if (!matched) {
      const failedAttempts = Number(document?.auth?.failedAttempts || 0) + 1;
      const shouldLock = failedAttempts >= 5;
      await repository.update({
        auth: {
          ...document.auth,
          failedAttempts: shouldLock ? 0 : failedAttempts,
          lockedUntil: shouldLock ? new Date(current.valueOf() + 15 * 60 * 1000).toISOString() : null,
        },
      });
      throw new Error(shouldLock ? "尝试次数过多，请 15 分钟后再试" : "密码错误");
    }
    if (document.auth.failedAttempts || document.auth.lockedUntil) {
      await repository.update({ auth: { ...document.auth, failedAttempts: 0, lockedUntil: null } });
    }
    return { token: signSession({ sub: matched.id, label: matched.label }, sessionSecret), user: { id: matched.id, label: matched.label } };
  }

  function authenticateSession(header) {
    const token = String(header || "").replace(/^Bearer\s+/i, "");
    const session = verifySession(token, sessionSecret);
    if (!session) throw new Error("登录已失效");
    return session;
  }

  async function getState() {
    const document = await repository.get();
    if (!document) return null;
    const refreshed = await refreshSnapshot(document);
    return toClientPayload(refreshed);
  }

  async function putState(body) {
    const current = now();
    const state = normalizeState({ ...body, blackboard: { ...body.blackboard, publishedAt: body.blackboard?.publishedAt || current.toISOString() } }, current);
    const document = await repository.get();
    const locationChanged = hasLocationChanged(document.state.location, state.location);
    const patch = { state, updatedAt: current.toISOString() };
    await repository.update(patch);
    const refreshed = await refreshSnapshot({ ...document, ...patch }, locationChanged);
    return toClientPayload(refreshed, current);
  }

  async function getKindleSnapshot(deviceToken) {
    const document = await repository.get();
    if (!document || !secureEqualText(hashToken(deviceToken), document.auth.deviceTokenHash)) throw new Error("设备口令无效");
    const refreshed = await refreshSnapshot(document);
    return { url: await repository.getSnapshotUrl(refreshed.snapshot.fileID), version: refreshed.snapshot.version, brightness: refreshed.state.brightness };
  }

  async function scheduledRefresh() {
    const document = await repository.get();
    if (!document) return { skipped: true };
    const refreshed = await refreshSnapshot(document, true);
    return { version: refreshed.snapshot.version };
  }

  return { bootstrap, login, authenticateSession, getState, putState, getKindleSnapshot, scheduledRefresh, searchLocations };
}

module.exports = { createService, DEFAULT_STATE };

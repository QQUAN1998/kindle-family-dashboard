const tcb = require("@cloudbase/node-sdk");
const { createRepository } = require("./repository");
const { createService } = require("./service");

const app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV });
const service = createService({
  repository: createRepository(app),
  sessionSecret: process.env.KD_SESSION_SECRET,
  setupToken: process.env.KD_SETUP_TOKEN,
});

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  if (Buffer.byteLength(raw, "utf8") > 16_384) throw new Error("请求内容过大");
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

exports.main = async (event) => {
  if (!event?.httpMethod) return service.scheduledRefresh();
  if (event.httpMethod === "OPTIONS") return response(204, {});
  const path = String(event.path || "/").replace(/^\/kd-api/, "");
  try {
    if (event.httpMethod === "GET" && path === "/health") return response(200, { ok: true });
    if (event.httpMethod === "POST" && path === "/bootstrap") {
      await service.bootstrap(parseBody(event));
      return response(201, { ok: true });
    }
    if (event.httpMethod === "POST" && path === "/login") return response(200, await service.login(parseBody(event).password));
    if (event.httpMethod === "GET" && path === "/kindle/snapshot") {
      const token = event.queryStringParameters?.device || event.headers?.["x-device-token"];
      return response(200, await service.getKindleSnapshot(token));
    }
    service.authenticateSession(event.headers?.authorization || event.headers?.Authorization);
    if (event.httpMethod === "GET" && path === "/state") return response(200, await service.getState());
    if (event.httpMethod === "PUT" && path === "/state") {
      return response(200, await service.putState(parseBody(event)));
    }
    if (event.httpMethod === "GET" && path === "/locations") {
      return response(200, { results: await service.searchLocations(event.queryStringParameters?.q) });
    }
    return response(404, { error: "接口不存在" });
  } catch (error) {
    const message = error instanceof SyntaxError ? "请求格式无效" : error.message || "请求失败";
    const status = /登录|密码|口令/.test(message) ? 401 : /不存在/.test(message) ? 404 : 400;
    return response(status, { error: message });
  }
};

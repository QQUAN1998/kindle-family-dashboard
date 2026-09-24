const http = require("node:http");
const { main } = require("./index");

const PORT = Number(process.env.PORT || 9000);
const MAX_BODY_BYTES = 16_384;

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("请求内容过大"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, reply) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const body = await readBody(request);
    const result = await main({
      httpMethod: request.method,
      path: url.pathname,
      headers: request.headers,
      queryStringParameters: Object.fromEntries(url.searchParams.entries()),
      body,
      isBase64Encoded: false,
    });
    reply.writeHead(result.statusCode || 200, result.headers || {});
    reply.end(result.body || "");
  } catch (error) {
    reply.writeHead(400, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    reply.end(JSON.stringify({ error: error.message || "请求失败" }));
  }
});

server.listen(PORT, "0.0.0.0");

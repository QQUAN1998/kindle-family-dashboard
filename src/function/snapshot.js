const crypto = require("node:crypto");
const { Resvg } = require("@resvg/resvg-js");
const { renderDashboardSvg } = require("./lib/render");
const { getAlmanacDays } = require("./lib/almanac");

function renderSnapshot({ state, weather, now = new Date() }) {
  const svg = renderDashboardSvg({ state, weather, almanac: getAlmanacDays(now), now });
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 600 },
    background: "#fdfdf9",
  }).render().asPng();
  return Buffer.from(png);
}

function snapshotVersion(state, weather, now = new Date()) {
  const minuteBucket = Math.floor(now.valueOf() / 1_800_000);
  return crypto.createHash("sha256").update(JSON.stringify({ state, weather, minuteBucket })).digest("hex").slice(0, 16);
}

module.exports = { renderSnapshot, snapshotVersion };

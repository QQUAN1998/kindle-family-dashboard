const fs = require("node:fs");
const path = require("node:path");
const { Resvg } = require("@resvg/resvg-js");
const { renderDashboardSvg } = require("../shared/render");
const { getAlmanacDays } = require("../shared/almanac");
const { DEFAULT_STATE } = require("../functions/kd_api/service");

const now = new Date();
const future = (days) => {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const state = {
  ...DEFAULT_STATE,
  familyName: "示例之家",
  countdowns: [
    { id: "trip", category: "旅游", title: "周末出行", date: future(18) },
    { id: "birthday", category: "生日", title: "生日聚会", date: future(36) },
    { id: "concert", category: "演唱会", title: "音乐会", date: future(11) },
    { id: "anniversary", category: "纪念日", title: "纪念日", date: future(72) },
    { id: "work", category: "工作DDL", title: "交稿日", date: future(5) },
    { id: "ticket", category: "抢票", title: "购票日", date: future(3) },
  ],
};
const weather = { locationName: "北京", updatedAt: now.toISOString(), days: [
  { code: 61, min: 23, max: 28, rain: 78 },
  { code: 3, min: 22, max: 29, rain: 42 },
] };
const svg = renderDashboardSvg({ state, weather, almanac: getAlmanacDays(now), now, battery: 86 });
const png = new Resvg(svg, { fitTo: { mode: "width", value: 600 }, background: "#fdfdf9" }).render().asPng();
const output = path.join(__dirname, "..", "dist", "kindle-preview.png");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, png);
console.log(output);

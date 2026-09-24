const { countDays, visibleCountdowns } = require("./domain");

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function fmtTime(value, timezone = "Asia/Shanghai") {
  return new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(value);
}

function fmtDate(value, timezone = "Asia/Shanghai") {
  return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long", timeZone: timezone }).format(value);
}

function weatherIcon(code) {
  if ([0, 1].includes(Number(code))) return "sun";
  if ([2, 3, 45, 48].includes(Number(code))) return "cloud";
  return "rain";
}

function categoryIcon(category) {
  return ({ "生日": "cake", "演唱会": "music", "旅游": "plane", "纪念日": "heart", "工作DDL": "work", "抢票": "ticket" })[category] || "spark";
}

function icon(name, x, y, size = 24) {
  const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cloud: '<path d="M5 18h13a4 4 0 0 0 .2-8 6 6 0 0 0-11.5 1.7A3.2 3.2 0 0 0 5 18Z"/>',
    rain: '<path d="M5 15h13a4 4 0 0 0 .2-8A6 6 0 0 0 6.7 8.7 3.2 3.2 0 0 0 5 15Z"/><path d="m8 18-1 3m6-3-1 3m6-3-1 3"/>',
    umbrella: '<path d="M4 12a8 8 0 0 1 16 0H4Zm8-8v16c0 2 3 2 3 0"/>',
    cake: '<path d="M5 11h14v9H5zM4 15h16M8 11V8m4 3V7m4 4V8"/><circle cx="8" cy="6" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="16" cy="6" r="1"/>',
    music: '<path d="M9 18V6l10-2v12M9 9l10-2"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>',
    plane: '<path d="m3 11 18-7-7 18-3-8-8-3Zm8 3 4-4"/>',
    heart: '<path d="M20.8 5.7c-2-2-5.2-2-7.2 0L12 7.3l-1.6-1.6a5.1 5.1 0 0 0-7.2 7.2L12 21l8.8-8.1a5.1 5.1 0 0 0 0-7.2Z"/>',
    work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
    ticket: '<path d="M3 7h18v4a3 3 0 0 0 0 6v4H3v-4a3 3 0 0 0 0-6V7Z"/><path d="M12 7v14"/>',
    spark: '<path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/>',
  };
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="#111" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.spark}</g>`;
}

function renderWeather(weather) {
  const days = Array.isArray(weather?.days) ? weather.days.slice(0, 2) : [];
  return [0, 1].map((index) => {
    const day = days[index] || {};
    const x = 18 + index * 286;
    const label = index === 0 ? "今天" : "明天";
    const rain = Number.isFinite(Number(day.rain)) ? Math.round(Number(day.rain)) : "--";
    const min = Number.isFinite(Number(day.min)) ? Math.round(Number(day.min)) : "--";
    const max = Number.isFinite(Number(day.max)) ? Math.round(Number(day.max)) : "--";
    return `<g>
      <rect x="${x}" y="132" width="278" height="112" rx="12" fill="#f8f8f5" stroke="#555"/>
      <text x="${x + 18}" y="160" class="label">${label}</text>
      ${rain !== "--" && rain >= 40 ? icon("umbrella", x + 232, 143, 22) : ""}
      ${icon(weatherIcon(day.code), x + 18, 176, 34)}
      <text x="${x + 62}" y="210" class="temp">${min}–${max}°</text>
      <text x="${x + 222}" y="197" text-anchor="middle" class="rainValue">${rain}%</text>
      <text x="${x + 222}" y="218" text-anchor="middle" class="micro">降雨</text>
    </g>`;
  }).join("");
}

function renderAlmanac(days) {
  const normalized = Array.isArray(days) ? days.slice(0, 2) : [];
  return [0, 1].map((index) => {
    const day = normalized[index] || { label: index === 0 ? "今天" : "明天", solar: "--", lunar: "--", good: [] };
    const x = 28 + index * 286;
    const good = (day.good || []).reduce((result, item) => {
      const next = [...result, item].join(" · ");
      return Array.from(next).length <= 13 ? [...result, item] : result;
    }, []);
    return `<g clip-path="url(#almanac-${index})">
      <clipPath id="almanac-${index}"><rect x="${x}" y="288" width="262" height="72"/></clipPath>
      <text x="${x}" y="304" class="almanacDate">${esc(day.label)} ${esc(day.solar)} · ${esc(day.lunar)}</text>
      <text x="${x}" y="340" class="almanacGood"><tspan class="heavy">宜</tspan> ${esc(good.join(" · "))}</text>
    </g>`;
  }).join("");
}

function renderCountdowns(state, now) {
  return visibleCountdowns(state.countdowns || [], now).slice(0, 6).map((item, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 18 + col * 190;
    const y = 548 + row * 93;
    const days = countDays(item.date, now);
    const value = days === 0 ? "今" : Math.abs(days);
    const unit = days === 0 ? "天" : days > 0 ? "天后" : "天前";
    return `<g>
      <rect x="${x}" y="${y}" width="182" height="85" rx="10" fill="#f2f2ee"/>
      ${icon(categoryIcon(item.category), x + 12, y + 11, 24)}
      <text x="${x + 43}" y="${y + 30}" class="category">${esc(item.category)}</text>
      <text x="${x + 12}" y="${y + 69}" class="countTitle">${esc(item.title)}</text>
      <text x="${x + 169}" y="${y + 69}" text-anchor="end"><tspan class="days">${esc(value)}</tspan><tspan class="unit"> ${unit}</tspan></text>
    </g>`;
  }).join("");
}

function renderDashboardSvg({ state, weather, almanac, now = new Date(), battery = "--" }) {
  const timezone = state.location?.timezone || "Asia/Shanghai";
  const publishDate = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(new Date(state.blackboard.publishedAt));
  const updatedAt = weather?.updatedAt ? fmtTime(new Date(weather.updatedAt), timezone) : "--:--";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800">
  <rect width="600" height="800" fill="#fdfdf9"/>
  <style>
    text{font-family:"Noto Sans CJK SC","Noto Sans SC","Microsoft YaHei",sans-serif;fill:#111}
    .family{font-size:26px;font-weight:800}.date{font-size:15px}.clock{font-size:52px;font-weight:900;font-family:"Noto Serif CJK SC",serif}
    .section{font-size:18px;font-weight:800}.label{font-size:17px;font-weight:800}.temp{font-size:29px;font-weight:900}
    .rainValue{font-size:18px;font-weight:800}.micro{font-size:12px}.almanacDate{font-size:16px;font-weight:800}.almanacGood{font-size:17px}.heavy{font-weight:900}
    .blackTitle{font-size:20px;font-weight:900}.blackText{font-size:19px;font-weight:700}.category{font-size:14px}.countTitle{font-size:15px;font-weight:800}
    .days{font-size:27px;font-weight:900;font-family:serif}.unit{font-size:12px}.footer{font-size:13px;font-weight:700}.button{font-size:16px;font-weight:900}
  </style>
  <rect x="8" y="8" width="584" height="784" rx="16" fill="none" stroke="#111" stroke-width="2"/>
  <g>
    <text x="26" y="52" class="date">${esc(fmtDate(now, timezone))}</text>
    <text x="26" y="89" class="family">${esc(state.familyName)}</text>
    <g id="header-cat" transform="translate(278 38)" fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 14 7 3l9 7c4-2 12-2 16 0l9-7 5 11v12c0 11-10 18-22 18S2 37 2 26Z"/>
      <circle cx="17" cy="23" r="1.8" fill="#111"/><circle cx="31" cy="23" r="1.8" fill="#111"/>
      <path d="m21 29 3 2 3-2m-3 2v3m0 0c-3 0-5-1-6-3m6 3c3 0 5-1 6-3M12 29 3 27m9 6-9 2m33-6 9-2m-9 6 9 2"/>
    </g>
    <rect id="device-clock-area" x="410" y="30" width="172" height="66" fill="#fdfdf9"/>
    <path d="M18 104h564" stroke="#111" stroke-width="2"/>
  </g>
  <text x="20" y="125" class="section">${esc(weather?.locationName || state.location?.name || "天气")}</text>
  <text x="578" y="124" text-anchor="end" class="micro">${updatedAt} 更新</text>
  ${renderWeather(weather)}
  <g>
    <rect x="18" y="258" width="564" height="116" rx="12" fill="#fff" stroke="#555"/>
    <text x="28" y="284" class="section">今明黄历</text>
    <path d="M300 292v65" stroke="#aaa" stroke-dasharray="3 3"/>
    ${renderAlmanac(almanac)}
  </g>
  <g>
    <rect x="18" y="386" width="564" height="104" rx="12" fill="#ecece6" stroke="#555"/>
    <text x="30" y="420" class="blackTitle">小黑板</text>
    <path d="M112 400v28" stroke="#777"/>
    <g id="blackboard-paw" fill="none" stroke="#111" stroke-width="1.5">
      <ellipse cx="142" cy="420" rx="8" ry="6"/>
      <circle cx="130" cy="410" r="3"/><circle cx="138" cy="404" r="3"/>
      <circle cx="147" cy="404" r="3"/><circle cx="154" cy="411" r="3"/>
    </g>
    <text x="166" y="421" class="blackText">${esc(state.blackboard.content)}</text>
    <text x="568" y="421" text-anchor="end" class="micro">${esc(publishDate)} 发布</text>
  </g>
  <g>
    <rect x="12" y="504" width="576" height="231" rx="14" fill="none" stroke="#555"/>
    <text x="22" y="535" class="section">倒计时</text>
    <text x="578" y="534" text-anchor="end" class="micro">未来值得期待的日子</text>
    ${renderCountdowns(state, now)}
  </g>
  <g>
    <rect x="18" y="748" width="110" height="34" rx="8" fill="#fff" stroke="#111" stroke-width="1.5"/>
    <text x="73" y="771" text-anchor="middle" class="button">刷新</text>
    <text x="300" y="770" text-anchor="middle" class="footer">同步于 ${esc(fmtTime(now, timezone))} · 电量 ${esc(battery)}%</text>
    <rect x="472" y="748" width="110" height="34" rx="8" fill="#fff" stroke="#111" stroke-width="1.5"/>
    <text x="527" y="771" text-anchor="middle" class="button">返回书架</text>
  </g>
</svg>`;
}

module.exports = { renderDashboardSvg, esc };

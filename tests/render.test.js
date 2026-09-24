const test = require("node:test");
const assert = require("node:assert/strict");
const { renderDashboardSvg } = require("../shared/render");

test("renders a fixed 600 by 800 Kindle document with escaped user text", () => {
  const svg = renderDashboardSvg({
    now: new Date("2026-09-22T09:30:00+08:00"),
    state: {
      familyName: "示例家庭 <script>",
      blackboard: { content: "周六出发 & 带相机", publishedAt: "2026-09-22T01:30:00.000Z" },
      countdowns: [],
    },
    weather: { locationName: "杭州", updatedAt: "2026-09-22T01:28:00.000Z", days: [] },
    almanac: [],
  });
  assert.match(svg, /width="600" height="800"/);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /周六出发 &amp; 带相机/);
  assert.match(svg, /id="header-cat"/);
  assert.match(svg, /id="blackboard-paw"/);
  assert.match(svg, /id="device-clock-area"/);
  assert.doesNotMatch(svg, /class="clock"/);
  assert.doesNotMatch(svg, /M278 25c17-20/);
});

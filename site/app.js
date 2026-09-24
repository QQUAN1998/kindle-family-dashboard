const API_BASE = window.KD_API_BASE || "/kd-api";
const categorySuggestions = ["生日", "演唱会", "旅游", "纪念日", "工作DDL", "抢票"];
const categoryIcons = { "生日": "cake-slice", "演唱会": "music-2", "旅游": "plane", "纪念日": "heart", "工作DDL": "briefcase-business", "抢票": "ticket" };
const sampleWeather = { locationName: "杭州", updatedAt: new Date().toISOString(), days: [
  { code: 61, min: 23, max: 28, rain: 78 }, { code: 3, min: 22, max: 29, rain: 42 },
] };
let state = null;
let weather = sampleWeather;
let almanac = [];
let saveTimer;
let toastTimer;
let stateRevision = 0;
let saveChain = Promise.resolve();
let locationPicker;
const demoState = {
  familyName: "我的家",
  location: { name: "杭州", admin2: "杭州市", admin1: "浙江", country: "中国", countryCode: "CN", latitude: 30.29365, longitude: 120.16142, timezone: "Asia/Shanghai" },
  blackboard: { content: "欢迎使用家庭看板。", publishedAt: new Date().toISOString() },
  countdowns: [
    { id: "trip", category: "旅游", title: "周末出行", date: dateFromNow(18) }, { id: "birthday", category: "生日", title: "生日聚会", date: dateFromNow(36) },
    { id: "concert", category: "演唱会", title: "音乐会", date: dateFromNow(11) }, { id: "anniversary", category: "纪念日", title: "纪念日", date: dateFromNow(72) },
    { id: "work", category: "工作DDL", title: "交稿日", date: dateFromNow(5) }, { id: "ticket", category: "抢票", title: "购票日", date: dateFromNow(3) },
  ],
  brightness: { enabled: true, dayStart: "07:00", nightStart: "18:30", day: 1, night: 10 },
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  cloudStatus: $("#cloudStatus"), syncState: $(".sync-state"), loginDialog: $("#loginDialog"), loginForm: $("#loginForm"), loginPassword: $("#loginPassword"), toggleLoginPassword: $("#toggleLoginPassword"), loginError: $("#loginError"),
  familyNameInput: $("#familyNameInput"), citySearchInput: $("#citySearchInput"), citySearchForm: $("#citySearchForm"), locationResults: $("#locationResults"), locationSearchStatus: $("#locationSearchStatus"), currentCityName: $("#currentCityName"), currentCityMeta: $("#currentCityMeta"), popularCities: $("#popularCities"), blackboardForm: $("#blackboardForm"), blackboardInput: $("#blackboardInput"), blackboardPublishedAt: $("#blackboardPublishedAt"),
  addCountdownButton: $("#addCountdownButton"), countdownLimitNote: $("#countdownLimitNote"), countdownEditorList: $("#countdownEditorList"), brightnessEnabled: $("#brightnessEnabled"), dayStart: $("#dayStart"), nightStart: $("#nightStart"),
  dayBrightness: $("#dayBrightness"), nightBrightness: $("#nightBrightness"), dayBrightnessOutput: $("#dayBrightnessOutput"), nightBrightnessOutput: $("#nightBrightnessOutput"), previewDate: $("#previewDate"), previewFamilyName: $("#previewFamilyName"),
  previewClock: $("#previewClock"), previewCity: $("#previewCity"), weatherDays: $("#weatherDays"), almanacDays: $("#almanacDays"), previewBlackboardContent: $("#previewBlackboardContent"), previewBlackboardDate: $("#previewBlackboardDate"),
  previewCountdowns: $("#previewCountdowns"), previewSyncState: $("#previewSyncState"), kindleViewport: $("#kindleViewport"), kindleScreen: $("#kindleScreen"), einkToast: $("#einkToast"),
};

function token() { return localStorage.getItem("kd_session") || ""; }
async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(token() ? { authorization: `Bearer ${token()}` } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "网络请求失败");
  return body;
}

function setCloudStatus(label, mode = "") {
  elements.cloudStatus.textContent = label;
  elements.syncState.classList.toggle("is-saving", mode === "saving");
  elements.syncState.classList.toggle("is-error", mode === "error");
}

function escapeHtml(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function dateFromNow(days) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function formatSolarDate(date) { return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(date); }
function formatPublishedAt(value) { return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }
function daysRemaining(dateString) { const target = new Date(`${dateString}T12:00:00+08:00`); const today = new Date(); today.setHours(12, 0, 0, 0); return Math.round((target - today) / 86_400_000); }
function weatherIcon(code) { return [0, 1].includes(Number(code)) ? "sun" : [2, 3, 45, 48].includes(Number(code)) ? "cloud" : "cloud-rain"; }
function roundedMetric(value) { return Number.isFinite(Number(value)) ? Math.round(Number(value)) : "--"; }
function fitAlmanacItems(items) {
  return (items || []).reduce((result, item) => Array.from([...result, item].join(" · ")).length <= 13 ? [...result, item] : result, []);
}

function renderWeather() {
  elements.previewCity.textContent = weather.locationName || state.location.name;
  elements.weatherDays.innerHTML = [0, 1].map((index) => {
    const day = weather.days?.[index] || {};
    const rain = roundedMetric(day.rain);
    return `<div class="weather-day"><div class="weather-day__heading"><span class="weather-day__label">${index ? "明天" : "今天"}</span>${Number(rain) >= 40 ? '<span class="umbrella-tip"><img src="assets/icons/umbrella.svg" alt="建议带伞" /></span>' : '<span class="umbrella-tip is-hidden"></span>'}</div><div class="weather-day__main"><img class="weather-symbol" src="assets/icons/${weatherIcon(day.code)}.svg" alt="" /><span class="weather-day__range">${roundedMetric(day.min)}–${roundedMetric(day.max)}°</span><span class="weather-day__rain"><strong>${rain}${rain === "--" ? "" : "%"}</strong><small>降雨</small></span></div></div>`;
  }).join("");
}

function renderAlmanac() {
  const days = almanac.length === 2 ? almanac : [
    { label: "今天", solar: "--", lunar: "同步中", good: [] },
    { label: "明天", solar: "--", lunar: "同步中", good: [] },
  ];
  elements.almanacDays.innerHTML = days.map((day) => `<div class="almanac-day"><p class="almanac-day__date">${escapeHtml(day.label)} ${escapeHtml(day.solar)} · ${escapeHtml(day.lunar)}</p><p class="almanac-day__good"><strong>宜</strong> ${escapeHtml(fitAlmanacItems(day.good).join(" · ") || "同步中")}</p></div>`).join("");
}

function renderCountdownEditor() {
  elements.addCountdownButton.disabled = state.countdowns.length >= 6;
  elements.countdownLimitNote.textContent = `${state.countdowns.length} / 6 个；到期后 1 天隐藏，3 天后删除。`;
  elements.countdownEditorList.innerHTML = state.countdowns.map((item, index) => {
    const custom = !categorySuggestions.includes(item.category);
    const options = categorySuggestions.map((category) => `<option value="${category}" ${item.category === category ? "selected" : ""}>${category}</option>`).join("");
    return `<div class="countdown-editor-row${custom ? " has-custom-category" : ""}"><select data-index="${index}" data-action="category">${options}<option value="__custom__" ${custom ? "selected" : ""}>自定义</option></select>${custom ? `<input class="countdown-custom-category" data-index="${index}" data-field="category" maxlength="10" value="${escapeHtml(item.category)}" placeholder="类目名称" />` : ""}<input data-index="${index}" data-field="title" maxlength="20" value="${escapeHtml(item.title)}" /><input data-index="${index}" data-field="date" type="date" value="${item.date}" /><button class="icon-button countdown-delete" data-index="${index}" data-action="delete" type="button" aria-label="删除">×</button></div>`;
  }).join("");
}

function renderCountdowns() {
  elements.previewCountdowns.innerHTML = state.countdowns.filter((item) => daysRemaining(item.date) >= -1).slice(0, 6).map((item) => { const days = daysRemaining(item.date); return `<div class="countdown-item"><span class="countdown-item__category"><img src="assets/icons/${categoryIcons[item.category] || "sparkles"}.svg" alt="" /><span>${escapeHtml(item.category)}</span></span><span class="countdown-item__title">${escapeHtml(item.title)}</span><span class="countdown-item__days"><strong>${days === 0 ? "今" : Math.abs(days)}</strong><span>${days === 0 ? "天" : days > 0 ? "天后" : "天前"}</span></span></div>`; }).join("");
}

function renderDateTime() { const now = new Date(); elements.previewDate.textContent = formatSolarDate(now); elements.previewClock.textContent = new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(now); }
function selectLocation(item) {
  state.location = {
    name: item.name,
    admin2: item.admin2 || "",
    admin1: item.admin1 || "",
    country: item.country || "",
    countryCode: item.countryCode || "",
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone,
  };
  weather = { locationName: item.name, updatedAt: null, days: [] };
  renderAll();
  setCloudStatus("更新天气", "saving");
  return saveState(true);
}
function renderAll() {
  elements.familyNameInput.value = state.familyName; elements.previewFamilyName.textContent = state.familyName; elements.blackboardInput.value = state.blackboard.content;
  elements.blackboardPublishedAt.textContent = `上次发布：${formatPublishedAt(state.blackboard.publishedAt)}`; elements.previewBlackboardContent.textContent = state.blackboard.content; elements.previewBlackboardDate.textContent = `${formatPublishedAt(state.blackboard.publishedAt)} 发布`;
  elements.brightnessEnabled.checked = state.brightness.enabled; elements.dayStart.value = state.brightness.dayStart; elements.nightStart.value = state.brightness.nightStart; elements.dayBrightness.value = state.brightness.day; elements.nightBrightness.value = state.brightness.night;
  elements.dayBrightnessOutput.value = state.brightness.day; elements.nightBrightnessOutput.value = state.brightness.night;
  locationPicker.sync(state.location); renderDateTime(); renderWeather(); renderAlmanac(); renderCountdownEditor(); renderCountdowns(); updateKindleScale();
}

function showToast(message) { clearTimeout(toastTimer); elements.einkToast.textContent = message; elements.einkToast.classList.add("is-visible"); toastTimer = setTimeout(() => elements.einkToast.classList.remove("is-visible"), 1800); }
function updateKindleScale() { if (document.body.classList.contains("kindle-only")) return; const scale = elements.kindleViewport.clientWidth / 600; elements.kindleViewport.style.height = `${800 * scale}px`; elements.kindleScreen.style.transform = `scale(${scale})`; }

async function loadState() {
  setCloudStatus("同步中", "saving");
  const data = await api("/state");
  state = data.state; weather = data.weather || sampleWeather; almanac = data.almanac || []; stateRevision = 0; renderAll(); setCloudStatus("已同步");
  elements.previewSyncState.textContent = `同步于 ${new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(data.snapshot?.updatedAt || Date.now()))}`;
}

function noteStateChange() {
  stateRevision += 1;
  setCloudStatus("待保存", "saving");
  elements.previewSyncState.textContent = "等待同步";
}

function saveState(changed = false) {
  clearTimeout(saveTimer);
  if (changed) noteStateChange();
  const revision = stateRevision;
  const payload = JSON.parse(JSON.stringify(state));
  setCloudStatus("保存中", "saving");
  saveChain = saveChain.catch(() => undefined).then(async () => {
    try {
      const data = await api("/state", { method: "PUT", body: JSON.stringify(payload) });
      if (revision !== stateRevision) return true;
      state = data.state;
      weather = data.weather || weather;
      almanac = data.almanac || almanac;
      renderAll();
      setCloudStatus("已保存");
      elements.previewSyncState.textContent = `同步于 ${new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(data.snapshot?.updatedAt || Date.now()))}`;
      return true;
    } catch (error) {
      if (revision === stateRevision) setCloudStatus("保存失败", "error");
      showToast(error.message);
      return false;
    }
  });
  return saveChain;
}
function scheduleSave() { clearTimeout(saveTimer); noteStateChange(); saveTimer = setTimeout(() => saveState(), 700); }

locationPicker = window.KDLocationPicker.createLocationPicker({
  input: elements.citySearchInput,
  form: elements.citySearchForm,
  results: elements.locationResults,
  status: elements.locationSearchStatus,
  currentName: elements.currentCityName,
  currentMeta: elements.currentCityMeta,
  popular: elements.popularCities,
  search: async (query) => (await api(`/locations?q=${encodeURIComponent(query)}`)).results || [],
  onSelect: selectLocation,
});

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault(); elements.loginError.textContent = "";
  try { const result = await api("/login", { method: "POST", body: JSON.stringify({ password: elements.loginPassword.value }) }); localStorage.setItem("kd_session", result.token); elements.loginDialog.close(); elements.loginPassword.value = ""; elements.loginPassword.type = "password"; elements.toggleLoginPassword.textContent = "显示"; elements.toggleLoginPassword.setAttribute("aria-pressed", "false"); await loadState(); }
  catch (error) { elements.loginError.textContent = error.message; }
});
elements.toggleLoginPassword.addEventListener("click", () => {
  const visible = elements.loginPassword.type === "text";
  elements.loginPassword.type = visible ? "password" : "text";
  elements.toggleLoginPassword.textContent = visible ? "显示" : "隐藏";
  elements.toggleLoginPassword.setAttribute("aria-pressed", String(!visible));
  elements.loginPassword.focus();
});
elements.familyNameInput.addEventListener("input", (event) => { state.familyName = Array.from(event.target.value).slice(0, 15).join(""); event.target.value = state.familyName; elements.previewFamilyName.textContent = state.familyName; scheduleSave(); });
elements.blackboardForm.addEventListener("submit", (event) => { event.preventDefault(); const content = elements.blackboardInput.value.trim(); if (!content) return; state.blackboard = { content, publishedAt: new Date().toISOString() }; renderAll(); saveState(true); });
elements.countdownEditorList.addEventListener("input", (event) => { const field = event.target.dataset.field; const index = Number(event.target.dataset.index); if (!field || Number.isNaN(index)) return; state.countdowns[index][field] = event.target.value; renderCountdowns(); scheduleSave(); });
elements.countdownEditorList.addEventListener("change", (event) => { if (event.target.dataset.action !== "category") return; const index = Number(event.target.dataset.index); state.countdowns[index].category = event.target.value === "__custom__" ? "" : event.target.value; renderCountdownEditor(); renderCountdowns(); scheduleSave(); });
elements.countdownEditorList.addEventListener("click", (event) => { const button = event.target.closest('[data-action="delete"]'); if (!button) return; state.countdowns.splice(Number(button.dataset.index), 1); renderCountdownEditor(); renderCountdowns(); saveState(true); });
elements.addCountdownButton.addEventListener("click", () => { if (state.countdowns.length >= 6) return; state.countdowns.push({ id: self.crypto.randomUUID(), category: "生日", title: "新倒计时", date: dateFromNow(7) }); renderCountdownEditor(); renderCountdowns(); scheduleSave(); });
function updateBrightness() { state.brightness = { enabled: elements.brightnessEnabled.checked, dayStart: elements.dayStart.value, nightStart: elements.nightStart.value, day: Number(elements.dayBrightness.value), night: Number(elements.nightBrightness.value) }; elements.dayBrightnessOutput.value = state.brightness.day; elements.nightBrightnessOutput.value = state.brightness.night; scheduleSave(); }
[elements.brightnessEnabled, elements.dayStart, elements.nightStart, elements.dayBrightness, elements.nightBrightness].forEach((control) => control.addEventListener("input", updateBrightness));
$("#resetButton").addEventListener("click", () => loadState().catch((error) => showToast(error.message)));
$("#refreshPreviewButton").addEventListener("click", () => loadState().then(() => showToast("已同步最新内容")).catch((error) => showToast(error.message)));
$("#exitPreviewButton").addEventListener("click", () => showToast("Kindle 实机将返回书架"));
document.querySelectorAll(".view-switch__button").forEach((button) => button.addEventListener("click", () => { document.body.dataset.mobileView = button.dataset.view; document.querySelectorAll(".view-switch__button").forEach((item) => item.classList.toggle("is-active", item === button)); requestAnimationFrame(updateKindleScale); }));
new ResizeObserver(updateKindleScale).observe(elements.kindleViewport);
if (new URLSearchParams(location.search).get("kindle") === "1") document.body.classList.add("kindle-only");
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => undefined);
if (new URLSearchParams(location.search).get("demo") === "1") {
  state = demoState;
  renderAll();
  setCloudStatus("效果预览");
} else if (token()) loadState().catch(() => { localStorage.removeItem("kd_session"); elements.loginDialog.showModal(); }); else elements.loginDialog.showModal();
setInterval(renderDateTime, 60_000);

const WEATHER_TTL_MS = 30 * 60 * 1000;
const LOCATION_TTL_MS = 24 * 60 * 60 * 1000;
const locationCache = new Map();
const { searchCityCatalog } = require("./city-catalog");

async function fetchJson(url, errorMessage) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`${errorMessage} (${response.status})`);
      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(lastError?.message?.startsWith(errorMessage) ? lastError.message : errorMessage);
}

async function searchLocations(query) {
  const normalized = String(query || "").trim();
  if (Array.from(normalized).length < 2 || Array.from(normalized).length > 40) throw new Error("请输入至少 2 个字符的城市名");
  const catalogResults = searchCityCatalog(normalized);
  if (catalogResults.length) return catalogResults;
  const cached = locationCache.get(normalized);
  if (cached && Date.now() - cached.createdAt < LOCATION_TTL_MS) return cached.results;
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", normalized);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "zh");
  url.searchParams.set("format", "json");
  const body = await fetchJson(url, "城市搜索暂时不可用");
  const results = (body.results || []).map((item) => ({
    id: item.id,
    name: item.name,
    admin2: item.admin2 || "",
    admin1: item.admin1 || "",
    country: item.country || "",
    countryCode: item.country_code || "",
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone || "Asia/Shanghai",
  }));
  locationCache.set(normalized, { createdAt: Date.now(), results });
  return results;
}

async function fetchWeather(location, now = new Date()) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max");
  url.searchParams.set("timezone", location.timezone || "auto");
  url.searchParams.set("forecast_days", "2");
  const body = await fetchJson(url, "天气服务暂时不可用");
  return {
    locationName: location.name,
    updatedAt: now.toISOString(),
    days: [0, 1].map((index) => ({
      date: body.daily?.time?.[index],
      code: body.daily?.weather_code?.[index],
      min: body.daily?.temperature_2m_min?.[index],
      max: body.daily?.temperature_2m_max?.[index],
      rain: body.daily?.precipitation_probability_max?.[index],
    })),
  };
}

function isWeatherFresh(weather, now = new Date()) {
  const updatedAt = new Date(weather?.updatedAt || 0).valueOf();
  return Number.isFinite(updatedAt) && now.valueOf() - updatedAt < WEATHER_TTL_MS;
}

module.exports = { WEATHER_TTL_MS, LOCATION_TTL_MS, searchLocations, fetchWeather, isWeatherFresh };

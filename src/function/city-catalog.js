const CITY_CATALOG = [
  { id: "cn-beijing", name: "北京", admin2: "北京市", admin1: "北京市", country: "中国", countryCode: "CN", latitude: 39.9075, longitude: 116.39723, timezone: "Asia/Shanghai", aliases: ["北京市"] },
  { id: "cn-shanghai", name: "上海", admin2: "上海市", admin1: "上海市", country: "中国", countryCode: "CN", latitude: 31.22222, longitude: 121.45806, timezone: "Asia/Shanghai", aliases: ["上海市"] },
  { id: "cn-guangzhou", name: "广州", admin2: "广州市", admin1: "广东", country: "中国", countryCode: "CN", latitude: 23.11667, longitude: 113.25, timezone: "Asia/Shanghai", aliases: ["广州市"] },
  { id: "cn-shenzhen", name: "深圳", admin2: "深圳市", admin1: "广东", country: "中国", countryCode: "CN", latitude: 22.54554, longitude: 114.0683, timezone: "Asia/Shanghai", aliases: ["深圳市"] },
  { id: "cn-hangzhou", name: "杭州", admin2: "杭州市", admin1: "浙江", country: "中国", countryCode: "CN", latitude: 30.29365, longitude: 120.16142, timezone: "Asia/Shanghai", aliases: ["杭州市"] },
  { id: "cn-chengdu", name: "成都", admin2: "成都市", admin1: "四川", country: "中国", countryCode: "CN", latitude: 30.66667, longitude: 104.06667, timezone: "Asia/Shanghai", aliases: ["成都市"] },
  { id: "cn-chongqing", name: "重庆", admin2: "重庆市", admin1: "重庆市", country: "中国", countryCode: "CN", latitude: 29.56301, longitude: 106.55156, timezone: "Asia/Shanghai", aliases: ["重庆市"] },
  { id: "cn-xian", name: "西安", admin2: "西安市", admin1: "陕西", country: "中国", countryCode: "CN", latitude: 34.25833, longitude: 108.92861, timezone: "Asia/Shanghai", aliases: ["西安市"] },
  { id: "cn-nanjing", name: "南京", admin2: "南京市", admin1: "江苏", country: "中国", countryCode: "CN", latitude: 32.0603, longitude: 118.7969, timezone: "Asia/Shanghai", aliases: ["南京市"] },
  { id: "cn-wuhan", name: "武汉", admin2: "武汉市", admin1: "湖北", country: "中国", countryCode: "CN", latitude: 30.5928, longitude: 114.3055, timezone: "Asia/Shanghai", aliases: ["武汉市"] },
  { id: "cn-suzhou", name: "苏州", admin2: "苏州市", admin1: "江苏", country: "中国", countryCode: "CN", latitude: 31.30408, longitude: 120.59538, timezone: "Asia/Shanghai", aliases: ["苏州市"] },
  { id: "cn-xiamen", name: "厦门", admin2: "厦门市", admin1: "福建", country: "中国", countryCode: "CN", latitude: 24.47979, longitude: 118.08187, timezone: "Asia/Shanghai", aliases: ["厦门市"] },
  { id: "cn-qingdao", name: "青岛", admin2: "青岛市", admin1: "山东", country: "中国", countryCode: "CN", latitude: 36.06488, longitude: 120.38042, timezone: "Asia/Shanghai", aliases: ["青岛市"] },
  { id: "cn-changsha", name: "长沙", admin2: "长沙市", admin1: "湖南", country: "中国", countryCode: "CN", latitude: 28.19874, longitude: 112.97087, timezone: "Asia/Shanghai", aliases: ["长沙市"] },
  { id: "cn-kunming", name: "昆明", admin2: "昆明市", admin1: "云南", country: "中国", countryCode: "CN", latitude: 25.03889, longitude: 102.71833, timezone: "Asia/Shanghai", aliases: ["昆明市"] },
  { id: "cn-sanya", name: "三亚", admin2: "三亚市", admin1: "海南", country: "中国", countryCode: "CN", latitude: 18.24306, longitude: 109.505, timezone: "Asia/Shanghai", aliases: ["三亚市"] },
  { id: "cn-chaoyang-liaoning", name: "朝阳市", admin2: "朝阳市", admin1: "辽宁", country: "中国", countryCode: "CN", latitude: 41.57028, longitude: 120.45861, timezone: "Asia/Shanghai", aliases: ["朝阳", "辽宁朝阳"] },
  { id: "cn-chaoyang-beijing", name: "北京市朝阳区", admin2: "北京市", admin1: "北京市", country: "中国", countryCode: "CN", latitude: 39.9219, longitude: 116.44355, timezone: "Asia/Shanghai", aliases: ["朝阳", "北京朝阳", "朝阳区"] },
  { id: "gb-london", name: "伦敦", admin2: "大伦敦", admin1: "英格兰", country: "英国", countryCode: "GB", latitude: 51.5074, longitude: -0.1278, timezone: "Europe/London", aliases: ["London"] },
  { id: "jp-tokyo", name: "东京", admin2: "东京都", admin1: "东京都", country: "日本", countryCode: "JP", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo", aliases: ["Tokyo"] },
  { id: "us-new-york", name: "纽约", admin2: "纽约市", admin1: "纽约州", country: "美国", countryCode: "US", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", aliases: ["New York", "纽约市"] },
  { id: "sg-singapore", name: "新加坡", admin2: "新加坡", admin1: "新加坡", country: "新加坡", countryCode: "SG", latitude: 1.28967, longitude: 103.85007, timezone: "Asia/Singapore", aliases: ["Singapore"] },
  { id: "fr-paris", name: "巴黎", admin2: "巴黎", admin1: "法兰西岛", country: "法国", countryCode: "FR", latitude: 48.85341, longitude: 2.3488, timezone: "Europe/Paris", aliases: ["Paris"] },
  { id: "kr-seoul", name: "首尔", admin2: "首尔特别市", admin1: "首尔", country: "韩国", countryCode: "KR", latitude: 37.566, longitude: 126.9784, timezone: "Asia/Seoul", aliases: ["Seoul", "汉城"] },
  { id: "au-sydney", name: "悉尼", admin2: "悉尼", admin1: "新南威尔士州", country: "澳大利亚", countryCode: "AU", latitude: -33.86785, longitude: 151.20732, timezone: "Australia/Sydney", aliases: ["Sydney"] },
];

function publicLocation(location) {
  const result = { ...location };
  delete result.aliases;
  return result;
}

function searchCityCatalog(query) {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  if (!normalized) return [];
  return CITY_CATALOG
    .filter((city) => [city.name, ...city.aliases].some((name) => name.toLocaleLowerCase().includes(normalized)))
    .map(publicLocation);
}

module.exports = { CITY_CATALOG, searchCityCatalog };

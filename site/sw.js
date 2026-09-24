const CACHE = "kd-shell-v6";
const ASSETS = ["./", "./index.html", "./styles.css?v=25", "./location-picker.js?v=25", "./app.js?v=25", "./config.js"];
self.addEventListener("install", (event) => event.waitUntil(Promise.all([
  self.skipWaiting(),
  caches.open(CACHE).then((cache) => cache.addAll(ASSETS)),
])));
self.addEventListener("activate", (event) => event.waitUntil(Promise.all([
  self.clients.claim(),
  caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
])));
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});

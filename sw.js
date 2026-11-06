const CACHE_NAME = "target-track-offline-v10";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Noto+Sans+Gujarati:wght@500;600;700;800&display=swap"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (
    e.request.method !== "GET" ||
    e.request.url.includes("firebaseio.com") ||
    e.request.url.includes("googleapis.com/identitytoolkit")
  ) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() =>
        caches
          .match(e.request)
          .then((cached) => cached || caches.match("./index.html"))
      )
  );
});

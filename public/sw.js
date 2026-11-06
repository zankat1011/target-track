const CACHE_NAME = "target-track-offline-v11";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
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
  const url = e.request.url;

  // Ignore non-GET requests or Firebase realtime database calls
  if (
    e.request.method !== "GET" ||
    url.includes("firebaseio.com") ||
    url.includes("googleapis.com/identitytoolkit")
  ) {
    return;
  }

  // 1. Static Assets (Scripts, CSS, Fonts, Images) -> Cache-First / Stale-While-Revalidate
  const isStatic =
    e.request.destination === "script" ||
    e.request.destination === "style" ||
    e.request.destination === "font" ||
    e.request.destination === "image" ||
    url.includes("/assets/") ||
    url.includes("fonts.gstatic.com") ||
    url.includes("fonts.googleapis.com") ||
    url.endsWith(".js") ||
    url.endsWith(".css") ||
    url.endsWith(".png") ||
    url.endsWith(".svg") ||
    url.endsWith(".webp") ||
    url.endsWith(".woff2");

  if (isStatic) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request)
          .then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              const resClone = networkRes.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
            }
            return networkRes;
          })
          .catch(() => cached);

        // Return cached instantly (0ms) if available, otherwise fetch from network
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 2. Navigation / HTML -> Network First with immediate Cache Fallback
  e.respondWith(
    fetch(e.request)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, resClone));
        }
        return networkRes;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("./index.html")))
  );
});

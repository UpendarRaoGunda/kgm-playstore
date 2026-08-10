const VERSION = "kgm-pwa-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const APP_SHELL = [
  "/",
  "/offline.html",
  "/site.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function isPrivateOrDynamic(pathname) {
  return pathname.startsWith("/api/")
    || pathname.startsWith("/downloads/")
    || pathname.startsWith("/uploads/")
    || pathname.startsWith("/community/")
    || pathname.startsWith("/_vinext/image");
}

function isBuildAsset(pathname) {
  return pathname.startsWith("/_next/static/")
    || pathname.startsWith("/assets/")
    || pathname === "/favicon.svg"
    || pathname.startsWith("/icons/");
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivateOrDynamic(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && url.pathname === "/") {
            const copy = response.clone();
            event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.put("/", copy)));
          }
          return response;
        })
        .catch(async () => (await caches.match("/")) || caches.match("/offline.html")),
    );
    return;
  }

  if (isBuildAsset(url.pathname)) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
        if (cached) {
          event.waitUntil(network.catch(() => undefined));
          return cached;
        }
        return network;
      }),
    );
  }
});

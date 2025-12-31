const CACHE_NAME = "reportmanager-v13";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/styles.css",
  "./assets/js/app.js",
  "./assets/js/database.js",
  "./assets/js/camera.js",
  "./assets/js/forms.js",
  "./assets/js/reports.js",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.min.js",
  "https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).catch(() => caches.match("./"))
    )
  );
});

const CACHE_NAME = "spotify-pwa-v1";

// Ficheiros estáticos para armazenar em cache
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./admin.html",
  "./style.css",
  "./admin.css",
  "./main.js",
  "./admin.js",
  "./acesso-admin.js",
  "./firebase.js",
  "./spotify.png",
  "./manifest.json",
];

// Instalação do Service Worker e pré-carregamento dos ficheiros
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação e eliminação de caches antigas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceção de pedidos de rede (Network First para APIs/Firebase, Cache First para estáticos)
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Ignorar pedidos do Firebase ou ficheiros de áudio externos para tratamento direto pela rede
  if (
    url.includes("firebaseio.com") ||
    url.includes("gstatic.com") ||
    event.request.destination === "audio"
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});

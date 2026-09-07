// Service worker del Menú Digital — Nexus.
// Solo cachea el "cascarón" estático (HTML, manifests, iconos) para que la
// página siga abriendo sin conexión. Las llamadas a Supabase, Google Fonts
// y el CDN de la librería van directas a la red: nunca se interceptan ni
// se guardan aquí, así los datos del menú siempre son los reales.
//
// IMPORTANTE: sube de versión CACHE_NAME (v1 -> v2 -> v3...) cada vez que
// publiquéis un cambio importante en index.html o panel-menu.html. Es lo
// que obliga a los móviles/navegadores que ya tenían la PWA instalada a
// recoger la versión nueva en vez de quedarse con una copia vieja en caché.
//
// El fetch de abajo pide siempre { cache: 'no-store' }: así nos aseguramos
// de que "red primero" habla de verdad con el servidor y no se conforma
// con una copia guardada en la caché HTTP normal del navegador (que es lo
// que estaba causando que los cambios tardaran en verse aunque subiéramos
// de versión aquí).

const CACHE_NAME = 'nexus-menu-v3';
const APP_SHELL = [
  './index.html',
  './panel-menu.html',
  './manifest-menu.json',
  './manifest-panel.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // deja pasar Supabase, fuentes, CDN…

  event.respondWith(
    fetch(req, { cache: 'no-store' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});

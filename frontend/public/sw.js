// Service worker da PWA.
//
// Regras importantes:
// - Pedidos de outras origens (a API vive noutro dominio) NUNCA sao servidos do cache.
// - Respostas da API nunca sao guardadas: contem dados pessoais de formandos.
// - Navegacao e rede-primeiro, para nunca mostrar uma versao antiga do indice.
// - Assets estaticos com hash no nome podem ser cache-primeiro.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `apec-${CACHE_VERSION}`;
const OFFLINE_URL = '/index.html';

const STATIC_ASSETS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // addAll() e atomico: se um recurso falhar, nenhum fica em cache.
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('apec-') && key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith('/assets/') ||
  /\.(js|css|woff2?|png|jpe?g|svg|ico|webp)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Fora da nossa origem: deixa passar direto para a rede. Crossover para a API
  // nao pode ser servido de cache sob nenhuma circustancia.
  if (url.origin !== self.location.origin) return;

  // Rotas de API nunca entram no cache.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Navegacao: rede-primeiro, cache apenas como fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(OFFLINE_URL, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  if (!isStaticAsset(url)) return;

  // Assets estaticos: cache-primeiro, com atualizacao em segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetched;
    })
  );
});
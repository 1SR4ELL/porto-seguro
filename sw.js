/* Maré Mansa: guarda o app no aparelho para abrir mesmo sem internet.
   Ao mudar qualquer arquivo do app, aumente a VERSAO para os celulares baixarem a nova. */
const VERSAO = 'v3';
const CACHE_APP = 'porto-seguro-app-' + VERSAO;
const CACHE_FONTES = 'porto-seguro-fontes';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_APP).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes
        .filter(n => n.startsWith('porto-seguro-app-') && n !== CACHE_APP)
        .map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Fontes do Google: usa a cópia guardada e atualiza por trás.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(guardadoPrimeiro(req, CACHE_FONTES));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Abrir o app: sempre responde na hora com o que está guardado (funciona offline),
  // e baixa a versão nova por trás para a próxima vez.
  if (req.mode === 'navigate') {
    e.respondWith(guardadoPrimeiro(new Request('./index.html'), CACHE_APP));
    return;
  }
  e.respondWith(guardadoPrimeiro(req, CACHE_APP));
});

async function guardadoPrimeiro(req, nomeCache) {
  const cache = await caches.open(nomeCache);
  const guardado = await cache.match(req, { ignoreSearch: true });
  const daRede = fetch(req)
    .then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; })
    .catch(() => null);
  if (guardado) return guardado;
  const r = await daRede;
  return r || new Response('', { status: 504 });
}

// Guarda os arquivos do jogo no celular pra funcionar sem internet.
// IMPORTANTE: ao mudar qualquer arquivo do jogo, aumente o número da versão abaixo.
const VERSAO = 'horta-v0.1.0';

const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/estilo.css',
  'js/main.js',
  'js/estado.js',
  'js/save.js',
  'data/config.json',
  'data/mensagens.json',
  'art/icones/icone.svg',
  'art/icones/icone-192.png',
  'art/icones/icone-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Primeiro tenta a internet (pra pegar atualizações); sem internet, usa a cópia guardada.
self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  evento.respondWith(
    fetch(evento.request)
      .then((resposta) => {
        const copia = resposta.clone();
        caches.open(VERSAO).then((cache) => cache.put(evento.request, copia));
        return resposta;
      })
      .catch(() => caches.match(evento.request, { ignoreSearch: true }))
  );
});

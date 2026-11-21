// Guarda os arquivos do jogo no celular pra funcionar sem internet.
// Com internet, SEMPRE busca a versão mais nova primeiro (sem usar cache velho do navegador).
// Ao mudar a lista de arquivos, aumente o número da versão abaixo.
const VERSAO = 'horta-v0.15.4';
const ESPERA_REDE_MS = 4000; // internet lenta: depois disso usa a cópia guardada

const ARQUIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/estilo.css',
  'js/main.js',
  'js/estado.js',
  'js/save.js',
  'js/batalha.js',
  'js/evolucao.js',
  'js/campanha.js',
  'js/missoes.js',
  'js/atividades.js',
  'js/eventos.js',
  'js/arena.js',
  'js/som.js',
  'js/arte.js',
  'js/animacao.js',
  'js/arte-fonte.js',
  'art/arte.woff2',
  'js/ui/comum.js',
  'js/ui/tela-time.js',
  'js/ui/tela-batalha.js',
  'js/ui/tela-plantas.js',
  'js/ui/tela-mapa.js',
  'js/ui/painel-missoes.js',
  'js/ui/tela-atividades.js',
  'js/ui/painel-rotina.js',
  'js/ui/tela-eventos.js',
  'js/ui/tela-arena.js',
  'js/ui/tela-labirinto.js',
  'js/labirinto.js',
  'js/fusao.js',
  'data/config.json',
  'data/mensagens.json',
  'data/plantas.json',
  'data/pragas.json',
  'data/cartas.json',
  'data/campanha.json',
  'data/equipamentos.json',
  'data/faccoes.json',
  'data/missoes.json',
  'data/atividades.json',
  'data/changelog.json',
  'data/rotina.json',
  'data/invasao.json',
  'data/arena.json',
  'data/feira.json',
  'data/herbario.json',
  'data/ascensao.json',
  'data/talentos.json',
  'data/pesadelo.json',
  'data/labirinto.json',
  'data/fusoes.json',
  'art/icones/icone.svg',
  'art/icones/icone-192.png',
  'art/icones/icone-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO).then((cache) =>
      cache.addAll(ARQUIVOS.map((a) => new Request(a, { cache: 'reload' })))
    )
  );
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

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET' || new URL(pedido.url).origin !== self.location.origin) return;
  evento.respondWith(daRedeOuGuardado(pedido));
});

async function daRedeOuGuardado(pedido) {
  const cache = await caches.open(VERSAO);
  const daRede = fetch(new Request(pedido.url, { cache: 'no-cache' })).then((resposta) => {
    if (resposta.ok) cache.put(pedido, resposta.clone());
    return resposta;
  });
  try {
    return await Promise.race([
      daRede,
      new Promise((_, falhar) => setTimeout(() => falhar(new Error('rede lenta')), ESPERA_REDE_MS)),
    ]);
  } catch {
    const guardado = await caches.match(pedido, { ignoreSearch: true });
    return guardado || daRede;
  }
}

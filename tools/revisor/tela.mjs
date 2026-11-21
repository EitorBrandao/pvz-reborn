// Teste rápido no navegador, do jeito de um celular de 360px:
// abre o jogo, entra na horta, toca em cada botão da horta e confere que
// (1) não aparece erro de JavaScript e (2) nenhuma tela rola pro lado.
// Saída 0 = ok, 1 = problema, 3 = Playwright não disponível.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { process.exit(3); }

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const servidor = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const f = path.join(RAIZ, rel);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
const URL_JOGO = `http://127.0.0.1:${servidor.address().port}/index.html`;

const problemas = [];
const navegador = await chromium.launch();
try {
  const ctx = await navegador.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const pagina = await ctx.newPage();
  pagina.on('pageerror', (e) => problemas.push(`[tela] erro de JavaScript: ${e.message}`));
  pagina.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) problemas.push(`[tela] erro no console: ${m.text()}`); });

  const conferirRolagem = async (onde) => {
    const largura = await pagina.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth));
    if (largura > 361) problemas.push(`[tela] ${onde}: a tela rola pro lado (largura ${largura}px em celular de 360px)`);
  };
  const telaAtiva = () => pagina.evaluate(() => document.querySelector('.tela.ativa')?.id || '?');
  const abrirHorta = async () => {
    await pagina.goto(URL_JOGO);
    await pagina.waitForTimeout(800);
    // Passa pela tela de início (e qualquer apresentação) até chegar na horta.
    for (let i = 0; i < 6 && (await telaAtiva()) !== 'tela-base'; i++) {
      const botao = pagina.locator('.tela.ativa button:visible, .tela.ativa [role=button]:visible').first();
      if (!(await botao.count())) break;
      await botao.click({ timeout: 2000 }).catch(() => {});
      await pagina.waitForTimeout(400);
    }
  };

  await abrirHorta();
  await conferirRolagem(await telaAtiva());
  if ((await telaAtiva()) === 'tela-base') {
    const total = await pagina.locator('#tela-base button:visible').count();
    for (let i = 0; i < total; i++) {
      await abrirHorta();
      const botao = pagina.locator('#tela-base button:visible').nth(i);
      const nome = ((await botao.textContent().catch(() => '')) || '').trim().slice(0, 30);
      await botao.click({ timeout: 2000 }).catch(() => {});
      await pagina.waitForTimeout(500);
      await conferirRolagem(`${await telaAtiva()} (botão "${nome}")`);
    }
  } else {
    problemas.push(`[tela] não consegui chegar na horta (parei em ${await telaAtiva()})`);
  }
} finally {
  await navegador.close();
  servidor.close();
}

const unicos = [...new Set(problemas)];
if (unicos.length) { console.log(unicos.join('\n')); process.exit(1); }

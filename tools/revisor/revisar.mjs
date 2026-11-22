// Revisor automático: confere as regras do jogo antes de qualquer coisa ir pra main.
// Roda sozinho no "git push" pra main (tools/hooks/pre-push). Também dá pra rodar na mão:
//   node tools/revisor/revisar.mjs            (compara com origin/main)
//   node tools/revisor/revisar.mjs --sem-tela (pula o teste no navegador)
// Saída 0 = tudo certo. Saída 1 = tem erro (o push é bloqueado).

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(RAIZ);
const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith('--base=')) || '--base=origin/main').slice(7);
const ALVO = (args.find((a) => a.startsWith('--alvo=')) || '--alvo=HEAD').slice(7);

const erros = [];
const avisos = [];
const erro = (regra, msg) => erros.push(`[${regra}] ${msg}`);
const aviso = (regra, msg) => avisos.push(`[${regra}] ${msg}`);
const ler = (f) => fs.readFileSync(f, 'utf8');
const git = (cmd) => { try { return execSync(`git ${cmd}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
const versaoNum = (v) => (v || '0.0.0').replace(/^horta-v|^v/, '').split('.').map(Number);
const maior = (a, b) => { const x = versaoNum(a), y = versaoNum(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
const listar = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).map((f) => path.join(dir, f).split(path.sep).join('/')).filter((f) => fs.statSync(f).isFile()) : [];

// ---------- 1. JSON válido ----------
const dados = {};
for (const f of listar('data').filter((f) => f.endsWith('.json'))) {
  try { dados[path.basename(f, '.json')] = JSON.parse(ler(f)); } catch (e) { erro('json', `${f} não abre: ${e.message}`); }
}

// ---------- 2. Versão igual nos dois lugares ----------
const sw = ler('service-worker.js');
const versaoSW = (sw.match(/const VERSAO = 'horta-v([\d.]+)'/) || [])[1];
const versaoCfg = dados.config?.versaoJogo;
if (!versaoSW || versaoSW !== versaoCfg) erro('versão', `config.json diz ${versaoCfg} e service-worker.js diz ${versaoSW}: precisam ser iguais`);

// ---------- 3. Comparação com a main (versão subiu? juntou a main? arte com fonte?) ----------
const temBase = git(`rev-parse --verify -q ${BASE}`);
if (!temBase) aviso('main', `não achei ${BASE}; rode "git fetch origin main" pra conferir versão e mudanças`);
else {
  if (git(`merge-base --is-ancestor ${BASE} ${ALVO}`) === null) erro('main', `falta juntar a main mais nova: git fetch origin main && git merge origin/main`);
  const mudados = (git(`diff --name-only ${BASE} ${ALVO}`) || '').split('\n').filter(Boolean);
  const doJogador = mudados.filter((f) => /^(index\.html|manifest\.webmanifest|service-worker\.js|css\/|js\/|data\/|art\/)/.test(f));
  let cfgBase = null;
  try { cfgBase = JSON.parse(git(`show ${BASE}:data/config.json`) || 'null'); } catch { /* main sem config */ }
  const vBase = cfgBase?.versaoJogo;
  if (doJogador.length && vBase && !maior(versaoCfg, vBase)) {
    erro('versão', `a main já está na ${vBase} e você mudou o jogo (${doJogador.slice(0, 3).join(', ')}${doJogador.length > 3 ? '...' : ''}): suba a versão (ajuste: último número; fase nova: o do meio)`);
  }
  if (doJogador.length && vBase && maior(versaoCfg, vBase)) {
    const [a1, b1, c1] = versaoNum(vBase), [a2, b2, c2] = versaoNum(versaoCfg);
    const pulo = a2 > a1 || b2 > b1 + 1 || (b2 === b1 && c2 > c1 + 1);
    if (pulo) aviso('versão', `pulou de ${vBase} pra ${versaoCfg}; confira se não pulou número sem querer`);
  }
  if (mudados.includes('js/arte.js')) {
    for (const f of ['art/arte.woff2', 'js/arte-fonte.js']) {
      if (!mudados.includes(f)) erro('arte', `js/arte.js mudou mas ${f} não: rode "bash tools/fonte-cor/gerar.sh" e junte no mesmo envio`);
    }
  }
}

// ---------- 4. Arquivos offline (lista ARQUIVOS do service-worker) ----------
const arquivosSW = [...(sw.match(/const ARQUIVOS = \[([\s\S]*?)\];/) || [, ''])[1].matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((a) => a !== './');
for (const a of arquivosSW) if (!fs.existsSync(a)) erro('offline', `service-worker.js lista "${a}", mas o arquivo não existe`);
const servidos = [...listar('js'), ...listar('data'), ...listar('css'), ...listar('art')].filter((f) => /\.(js|json|css|woff2|png|svg|webp|jpg|mp3|ogg)$/.test(f));
for (const f of servidos) if (!arquivosSW.includes(f)) erro('offline', `${f} não está na lista ARQUIVOS do service-worker.js (não funciona sem internet)`);

// ---------- 5. Código JS sem erro de sintaxe ----------
const pastaTmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'revisor-'));
for (const f of [...listar('js').filter((f) => f.endsWith('.js')), 'service-worker.js']) {
  const copia = path.join(pastaTmp, f.replace(/\//g, '__') + (f === 'service-worker.js' ? '.cjs' : '.mjs'));
  fs.copyFileSync(f, copia);
  const r = spawnSync(process.execPath, ['--check', copia], { encoding: 'utf8' });
  if (r.status !== 0) erro('sintaxe', `${f}: ${(r.stderr || '').split('\n').find((l) => /Error/.test(l)) || 'erro de sintaxe'}`);
}
fs.rmSync(pastaTmp, { recursive: true, force: true });

// ---------- 6. Marcas de conflito esquecidas ----------
for (const f of [...listar('js'), ...listar('data'), ...listar('css'), 'index.html', 'service-worker.js', 'PLANO.md', 'CLAUDE.md']) {
  if (!/\.(js|json|css|html|md)$/.test(f)) continue;
  if (/^(<{7}|>{7}|={7})( |$)/m.test(ler(f))) erro('conflito', `${f} tem marca de conflito do git (<<<<<<< / >>>>>>>)`);
}

// ---------- 7. Nomes proibidos e internet ----------
const PROIBIDO = /plants\s*vs|popcap|zombie|electronic arts|youkia/i;
for (const f of [...listar('js'), ...listar('data'), ...listar('css'), 'index.html', 'manifest.webmanifest', 'README.md']) {
  if (!/\.(js|json|css|html|md|webmanifest|svg)$/.test(f)) continue;
  const t = ler(f);
  const m = t.match(PROIBIDO);
  if (m) erro('original', `${f} cita "${m[0]}": o jogo só usa nomes próprios`);
  if (f !== 'README.md') {
    const url = [...t.matchAll(/https?:\/\/[^\s'"`)]+/g)].map((x) => x[0]).find((u) => !/^https?:\/\/www\.w3\.org\//.test(u));
    if (url) erro('offline', `${f} usa endereço da internet (${url}): o jogo não pode depender de internet`);
  }
}

// ---------- 8. Som: todo status aplicado tem som próprio ----------
const som = ler('js/som.js');
const statusUsados = new Set();
const varrer = (o) => { if (o && typeof o === 'object') { if (typeof o.status === 'string' && /^[a-z_]+$/.test(o.status)) statusUsados.add(o.status); Object.values(o).forEach(varrer); } };
Object.values(dados).forEach(varrer);
for (const s of statusUsados) if (!new RegExp(`\\bstatus_${s}\\s*\\(`).test(som)) erro('som', `o status "${s}" não tem som próprio (status_${s}) em js/som.js`);

// ---------- 9. Música: toda tela aponta pra uma música que existe ----------
const blocoMusicas = (som.match(/const MUSICAS = \{([\s\S]*?)\n\};/) || [, ''])[1];
const musicas = new Set([...blocoMusicas.matchAll(/^ {2}([a-z_]+): \{/gm)].map((m) => m[1]));
const html = ler('index.html');
for (const [tela, mus] of Object.entries(dados.config?.som?.musicaPorTela || {})) {
  if (!musicas.has(mus)) erro('música', `a tela "${tela}" toca "${mus}", mas não existe essa música em MUSICAS (js/som.js)`);
  if (!html.includes(`id="${tela}"`)) aviso('música', `musicaPorTela cita "${tela}", mas não achei essa tela no index.html`);
}
const usoMusica = Object.values(dados.config?.som?.musicaPorTela || {});
const codigoJs = listar('js').filter((f) => f.endsWith('.js')).map(ler).join('\n') + JSON.stringify(dados);
for (const m of musicas) if (m !== 'horta' && !usoMusica.includes(m) && !new RegExp(`['"]${m}['"]`).test(codigoJs)) aviso('música', `a música "${m}" não é usada por nenhuma tela`);

// ---------- 10. Híbridas sempre melhores que as plantas normais ----------
// Compara com as duas plantas da receita E com a melhor planta normal do jogo, em pé de igualdade
// (mesmo nível, 5★, mesmo rank, sem talento/equipamento).
const plantas = dados.plantas || [];
const porId = Object.fromEntries(plantas.map((p) => [p.id, p]));
const receitas = dados.fusoes?.receitas || [];
try {
  const evo = await import(pathToFileURL(path.join(RAIZ, 'js/evolucao.js')).href);
  const fus = await import(pathToFileURL(path.join(RAIZ, 'js/fusao.js')).href);
  const D = { ...dados };
  const reg = (nivel, ascensao, extra = {}) => ({ ...evo.registroNovo(), nivel, estrelas: 5, ascensao, ...extra });
  const poderDe = (p, r) => evo.poder(evo.atributos(p, r, D), D);
  const cfgEvo = dados.config.evolucao;
  const normais = plantas.filter((p) => !p.hibrida);
  const ids = new Set();

  for (const rc of receitas) {
    const h = porId[rc.id], a = porId[rc.a], b = porId[rc.b];
    if (ids.has(rc.id)) erro('híbrida', `receita repetida: ${rc.id}`);
    ids.add(rc.id);
    if (!h) { erro('híbrida', `receita "${rc.id}" não tem planta em plantas.json`); continue; }
    if (!a || !b) { erro('híbrida', `receita "${rc.id}" usa planta que não existe (${rc.a} / ${rc.b})`); continue; }
    if (!h.hibrida) erro('híbrida', `${h.nome} vem de fusão mas não está marcada "hibrida": true`);
    if (a.hibrida || b.hibrida || rc.a === rc.b) erro('híbrida', `${h.nome}: a receita precisa de duas plantas normais diferentes`);

    // a) Poder base maior que o das duas plantas da receita e que o de qualquer planta normal
    for (const [nivel, rank] of [[1, 0], [25, 1], [50, 3]]) {
      const ph = poderDe(h, reg(nivel, rank));
      for (const p of [a, b]) {
        const pp = poderDe(p, reg(nivel, rank));
        if (ph <= pp) erro('híbrida', `${h.nome} (💪${ph}) não é mais forte que ${p.nome} (💪${pp}) no nível ${nivel}, rank ${rank}`);
      }
    }
    // Mesma classe (tanque, dano, apoio, controle): a classe muda como os pontos se distribuem, então só compara dentro dela.
    // Híbrida (ex.: Tanque Controle) compara com as normais das duas classes do par.
    const idClasse = (p) => dados.talentos?.funcoes?.[p.funcao] || 'dano';
    const classesDe = (p) => dados.talentos?.hibridas?.[idClasse(p)]?.classes || [idClasse(p)];
    if (!dados.talentos?.funcoes?.[h.funcao]) erro('híbrida', `${h.nome} tem função "${h.funcao}" que não existe em talentos.json`);
    for (const cl of classesDe(h)) {
      const mesmaClasse = normais.filter((p) => idClasse(p) === cl);
      for (const [nivel, rank] of [[1, 0], [50, 3]]) {
        const melhor = mesmaClasse.reduce((m, p) => (!m || poderDe(p, reg(nivel, rank)) > poderDe(m, reg(nivel, rank)) ? p : m), null);
        if (melhor && poderDe(h, reg(nivel, rank)) <= poderDe(melhor, reg(nivel, rank))) erro('híbrida', `${h.nome} (💪${poderDe(h, reg(nivel, rank))}) não passa a planta normal mais forte da classe ${cl}, ${melhor.nome} (💪${poderDe(melhor, reg(nivel, rank))}), no nível ${nivel}, rank ${rank}`);
      }
    }

    // b) Habilidade: efeitos que a planta da receita também tem não podem ser mais fracos na híbrida (comparando em 5★)
    const hh = evo.habilidadeComEstrelas(h.habilidade, 5);
    for (const p of [a, b]) {
      const hp = evo.habilidadeComEstrelas(p.habilidade, 5);
      if (hp.aplica && hh.aplica && hp.aplica.status === hh.aplica.status) {
        for (const c of ['valor', 'turnos']) {
          if ((hh.aplica[c] || 0) < (hp.aplica[c] || 0)) erro('híbrida', `${h.nome} aplica ${hh.aplica.status} com ${c} ${hh.aplica[c]}, menor que ${p.nome} (${hp.aplica[c]}) em 5★`);
        }
      }
      if (hp.tipo === hh.tipo) {
        for (const c of ['mult', 'golpes', 'alvos', 'reflete', 'turnos', 'bonus', 'seiva', 'limite']) {
          if (typeof hp[c] === 'number' && (hh[c] || 0) < hp[c]) erro('híbrida', `${h.nome} tem ${c} ${hh[c] ?? 0} na habilidade, menor que ${p.nome} (${hp[c]}) em 5★`);
        }
      }
    }
  }
  for (const p of plantas.filter((p) => p.hibrida)) if (!ids.has(p.id)) erro('híbrida', `${p.nome} é híbrida mas não tem receita em fusoes.json`);

  // c) A fusão herda o maior nível e o maior rank, e nasce 5★
  const rc0 = receitas[0];
  if (rc0) {
    const estado = { colecao: { [rc0.a]: reg(40, 1), [rc0.b]: reg(22, 2) } };
    const r = fus.registroHibrida(rc0, estado, D);
    if (r.ascensao !== 2) erro('fusão', `a híbrida devia herdar o maior rank (2) e veio com ${r.ascensao}`);
    if (r.nivel !== Math.min(40, evo.nivelMaximo(5, cfgEvo, 2))) erro('fusão', `a híbrida devia herdar o maior nível (40) e veio com ${r.nivel}`);
    if (r.estrelas < dados.fusoes.estrelasMin) erro('fusão', `a híbrida devia nascer com ${dados.fusoes.estrelasMin}★ e veio com ${r.estrelas}★`);
    if (!r.fusao) erro('fusão', 'o registro da híbrida precisa ter "fusao" (é o que libera o rank maior)');
  }

  // d) Híbrida sobe mais de rank que planta normal
  const asc = dados.ascensao;
  if (!(asc.rankMax > asc.rankMaxSemFusao)) erro('ascensão', `híbrida precisa ir mais longe: rankMax (${asc.rankMax}) tem que ser maior que rankMaxSemFusao (${asc.rankMaxSemFusao})`);
  if (evo.custoAscensao(reg(50, asc.rankMaxSemFusao), D) !== null) erro('ascensão', `planta normal passou do rank ${asc.rankMaxSemFusao}`);
  if (evo.custoAscensao(reg(50, asc.rankMaxSemFusao, { fusao: 1 }), D) === null) erro('ascensão', `híbrida travou no rank ${asc.rankMaxSemFusao}, devia ir até ${asc.rankMax}`);
} catch (e) {
  erro('híbrida', `não consegui testar as regras das híbridas: ${e.message}`);
}

// ---------- 11. Novidades e plano ----------
const novidades = dados.changelog || [];
if (versaoCfg && !novidades.some((n) => n.versao === versaoCfg)) aviso('novidades', `data/changelog.json não tem a versão ${versaoCfg}: o jogador não vai ver o que mudou`);

// ---------- 12. Teste no navegador (celular 360px) ----------
if (!args.includes('--sem-tela')) {
  const r = spawnSync(process.execPath, [path.join(RAIZ, 'tools/revisor/tela.mjs')], { encoding: 'utf8', timeout: 120000 });
  const saida = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.status === 0) { if (saida) avisos.push(...saida.split('\n').filter((l) => l.startsWith('[')).map((l) => l)); }
  else if (r.status === 3) aviso('tela', 'Playwright não está disponível: teste no navegador pulado');
  else erros.push(...(saida ? saida.split('\n').filter(Boolean) : ['[tela] o teste no navegador falhou sem mensagem']));
}

// ---------- Resultado ----------
console.log('\n🔎 Revisor da Horta Selvagem');
if (avisos.length) console.log('\n⚠️  Avisos (não bloqueiam):\n' + avisos.map((a) => '  - ' + a).join('\n'));
if (erros.length) {
  console.log('\n❌ Erros (o envio pra main fica bloqueado até corrigir):\n' + erros.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}
console.log('\n✅ Tudo certo pra ir pra main.\n');

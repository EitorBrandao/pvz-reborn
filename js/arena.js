// Arena contra rivais bots (PvP simulado): monta os times rivais, o ranking e as batalhas.
// Só contas e montagem: não desenha nada e não mexe no save (quem mexe é o estado.js).

import { criarRng, prepararBatalha, simular } from './batalha.js';

export const VOCE = -1; // marca "você" na lista do ranking

function numeroDoTexto(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Dias de diferença entre duas datas "AAAA-MM-DD"
export function diasEntre(de, ate) {
  const n = (t) => { const [a, m, d] = t.split('-').map(Number); return Math.round(Date.UTC(a, m - 1, d) / 86400000); };
  return n(ate) - n(de);
}

// ---------- Pontos (estilo Elo) ----------
// Quem tem mais pontos fica na frente. Ganhar de alguém mais forte rende muito; ganhar de
// alguém mais fraco rende pouco. Perder pra alguém mais fraco custa caro.

// Pontos de cada rival no dia "dias": começam por força (o 1º do ranking é o mais forte) e crescem com o tempo.
export function pontosBase(i, dias, dados) {
  const c = dados.arena;
  const n = c.rivais.length;
  const fator = Math.pow((n - 1 - i) / (n - 1), c.curva);
  return Math.round(c.pontosBase + (c.pontosTopo - c.pontosBase) * fator + c.pontosPorDia * Math.min(dias, c.diasMax));
}

export function pontosDoRival(arena, i, dias, dados) {
  return Math.max(0, pontosBase(i, dias, dados) + ((arena.ajustes || {})[i] || 0));
}

// Chance de vitória pela diferença de pontos (0 a 1)
export function chanceElo(meus, deles) {
  return 1 / (1 + Math.pow(10, (deles - meus) / 400));
}

// Pontos que "meus" ganha (positivo) ou perde (negativo) contra "deles"
export function variacaoElo(meus, deles, venceu, k) {
  const v = Math.round(k * ((venceu ? 1 : 0) - chanceElo(meus, deles)));
  return venceu ? Math.max(1, v) : Math.min(-1, v);
}

// Ranking completo, do mais pontuado pro menos: [{ id, pontos }] (id === VOCE é você)
export function ranking(arena, dias, dados) {
  const lista = dados.arena.rivais.map((_, id) => ({ id, pontos: pontosDoRival(arena, id, dias, dados) }));
  lista.push({ id: VOCE, pontos: arena.pontos });
  // empate: você fica atrás do rival
  return lista.sort((x, y) => y.pontos - x.pontos || (x.id === VOCE ? 1 : y.id === VOCE ? -1 : x.id - y.id));
}

// Nível das plantas do rival: o 1º do ranking inicial é o mais forte; todos crescem com os dias.
export function nivelDoRival(i, dias, dados) {
  const c = dados.arena;
  const n = c.rivais.length;
  const fator = Math.pow((n - 1 - i) / (n - 1), c.curva);
  const base = c.nivelBase + (c.nivelTopo - c.nivelBase) * fator;
  return Math.max(1, Math.round(base + c.nivelPorDia * Math.min(dias, c.diasMax)));
}

function registroDoRival(nivel, dados) {
  const cfg = dados.config.evolucao;
  const estrelas = Math.max(1, Math.min(cfg.estrelasMax, Math.ceil(nivel / cfg.niveisPorEstrela)));
  const ascensao = nivel > 50 ? Math.min(5, Math.ceil((nivel - 50) / cfg.niveisPorRank)) : 0;
  const equip = Math.min(3, Math.floor(nivel / 20));
  return {
    nivel, xp: 0, estrelas, ascensao, talentos: {}, copias: 0,
    equip: { vaso: equip, adubo: equip, regador: equip },
  };
}

function pontosDoEstilo(p, estilo) {
  if (estilo === 'tanque') return p.vida * 0.5 + p.def * 3;
  if (estilo === 'dano') return p.atq * 3 + p.vel;
  return p.vida * 0.2 + p.atq + p.def;
}

// Time, nível e plantas do rival (sempre o mesmo pro mesmo dia)
export function rivalDoRanking(i, dias, dados) {
  const c = dados.arena;
  const def = c.rivais[i];
  const nivel = nivelDoRival(i, dias, dados);
  const rng = criarRng(numeroDoTexto(`arena-${i}-${Math.floor(dias / 7)}`));
  const tamanho = c.vagasPorNivel.filter(([n]) => nivel >= n).pop()[1];
  const pool = dados.plantas.filter((p) => !p.hibrida || nivel >= c.hibridasDesdeNivel);
  const sorteadas = pool
    .map((p) => ({ p, pontos: pontosDoEstilo(p, def.estilo) * (0.7 + 0.6 * rng()) }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, tamanho)
    .map((x) => x.p);
  // quem bate de perto ou aguenta mais vai na frente (col 0); o resto atrás (col 1)
  const frente = [...sorteadas].sort((a, b) => (b.alcance === 'perto') - (a.alcance === 'perto') || (b.vida + b.def * 6) - (a.vida + a.def * 6));
  const ordemLinhas = [1, 0, 2];
  const time = [];
  frente.forEach((p, k) => {
    const naFrente = k < Math.ceil(tamanho / 2);
    const idx = naFrente ? k : k - Math.ceil(tamanho / 2);
    time.push({ planta: p.id, col: naFrente ? 0 : 1, linha: ordemLinhas[idx] });
  });
  const colecao = {};
  for (const m of time) colecao[m.planta] = registroDoRival(nivel, dados);
  return { id: i, nome: def.nome, emoji: def.emoji, estilo: def.estilo, nivel, time, colecao };
}

// Quanto cada rival rende numa vitória
function premioDaVitoria(rival, dados) {
  const v = dados.arena.vitoria;
  return {
    moedas: v.moedasBase + v.moedasPorNivel * rival.nivel,
    xp: v.xpBase + v.xpPorNivel * rival.nivel,
    orvalho: 0,
  };
}

// Batalha contra o time do rival (mesmo formato das outras batalhas)
export function batalhaArena(rival, dados) {
  return {
    id: `arena-${rival.id}`,
    tipo: 'arena',
    nome: `Arena · ${rival.nome}`,
    nivel: rival.nivel,
    folego: 0,
    podePular: true,
    maxRodadas: dados.arena.maxRodadas,
    rival,
    inimigos: [],
    recompensa: premioDaVitoria(rival, dados),
    cartas: dados.arena.cartas,
  };
}

export function premioDiario(posicao, dados) {
  const faixa = dados.arena.premiosDiarios.find((f) => posicao <= f.ate);
  return structuredClone(faixa.premio);
}

// Rivais que você pode desafiar: até "alcanceAcima" posições acima e "alcanceAbaixo" abaixo de você
export function desafiaveis(rank, dados) {
  const eu = rank.findIndex((x) => x.id === VOCE);
  const c = dados.arena;
  return rank.slice(Math.max(0, eu - c.alcanceAcima), eu + 1 + c.alcanceAbaixo)
    .filter((x) => x.id !== VOCE).map((x) => ({ ...x, pos: rank.indexOf(x) + 1 }));
}

// Enquanto o jogo estava fechado: rivais abaixo de você tentam te passar.
// Devolve os pontos e ajustes novos e os recados do mural (a defesa é o time que você deixou montado).
export function ausencia(arena, estado, dados, hojeTexto) {
  const c = dados.arena;
  const dias = Math.min(c.ausenciaDiasMax, Math.max(0, diasEntre(arena.vistoEm, hojeTexto)));
  const novo = { pontos: arena.pontos, ajustes: { ...(arena.ajustes || {}) } };
  const mural = [];
  if (!estado.time.length) return { ...novo, mural };
  const dd = diasEntre(arena.inicio, hojeTexto);
  for (let d = 1; d <= dias; d++) {
    const rng = criarRng(numeroDoTexto(`ausencia-${arena.vistoEm}-${d}-${novo.pontos}`));
    const ataques = 1 + Math.floor(rng() * c.ataquesPorDia);
    for (let a = 0; a < ataques; a++) {
      const rank = ranking(novo, dd, dados);
      const eu = rank.findIndex((x) => x.id === VOCE);
      const abaixo = rank.slice(eu + 1, eu + 1 + c.alcanceAbaixo);
      if (!abaixo.length) break;
      const atacante = abaixo[Math.floor(rng() * abaixo.length)];
      const rival = rivalDoRanking(atacante.id, dd, dados);
      const unidades = prepararBatalha(batalhaArena(rival, dados), estado.time, dados, estado.colecao);
      const r = simular(structuredClone(unidades), { ...dados.config.batalha, maxRodadas: c.maxRodadas }, numeroDoTexto(`defesa-${arena.vistoEm}-${d}-${a}`));
      const venceu = r.vitoria; // sua defesa venceu
      // quem ataca arrisca como no desafio normal; a defesa ganha ou perde com peso menor
      const doAtacante = variacaoElo(atacante.pontos, novo.pontos, !venceu, c.k);
      const seu = Math.round(-doAtacante * c.pesoDefesa);
      novo.pontos = Math.max(0, novo.pontos + seu);
      novo.ajustes[atacante.id] = Math.max(-c.ajusteMax, Math.min(c.ajusteMax, (novo.ajustes[atacante.id] || 0) + doAtacante));
      const frases = c.recados[venceu ? 'venceu' : 'perdeu'];
      const texto = frases[Math.floor(rng() * frases.length)].replace('{nome}', c.rivais[atacante.id].nome);
      mural.push({ dia: hojeTexto, rival: atacante.id, venceu, pontos: seu, texto });
    }
  }
  return { ...novo, mural };
}

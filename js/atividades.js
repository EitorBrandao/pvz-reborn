// Atividades fora da campanha: Torre das Pragas, Desafio do Dia e Horta de Treino.
// Só monta as batalhas (mesmo formato das fases da campanha) e confere as regras.
// Não desenha nada e não mexe no save.

import { criarRng } from './batalha.js';

// Ordem em que as pragas ocupam os espaços: frente primeiro, meio antes das pontas.
const ESPACOS = [[0, 1], [0, 0], [0, 2], [1, 1], [1, 0], [1, 2]];

function posicionar(ids, nivel) {
  return ids.map((praga, i) => ({ praga, col: ESPACOS[i][0], linha: ESPACOS[i][1], nivel }));
}

function sortearDe(lista, rng) {
  return lista[Math.floor(rng() * lista.length)];
}

// "2026-11-20" no horário do celular
export function hoje(data = new Date()) {
  const d = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${d(data.getMonth() + 1)}-${d(data.getDate())}`;
}

function numeroDoTexto(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// ---------- Torre das Pragas ----------

export function gerarAndar(andar, dados) {
  const c = dados.atividades.torre;
  const rng = criarRng(numeroDoTexto(`torre-${andar}`));
  const comuns = dados.pragas.filter((p) => !p.chefe);
  const chefes = dados.pragas.filter((p) => p.chefe);
  // pragas novas vão aparecendo conforme sobe
  const qtdPool = Math.min(comuns.length, c.pragasIniciais + Math.floor((andar - 1) / c.andaresPorPragaNova));
  const pool = comuns.slice(0, qtdPool);
  const nivel = 1 + Math.floor((andar - 1) * c.nivelPorAndar);
  const qtd = Math.min(c.maxInimigos, c.inimigosBase + Math.floor((andar - 1) / c.andaresPorInimigo));
  const chefe = andar % c.chefeACada === 0;
  const ids = [];
  if (chefe) ids.push(chefes[(andar / c.chefeACada - 1) % chefes.length].id);
  while (ids.length < qtd) ids.push(sortearDe(pool, rng).id);
  return {
    id: `torre-${andar}`,
    tipo: 'torre',
    andar,
    nome: `Torre · Andar ${andar}`,
    nivel,
    folego: 0,
    chefe,
    inimigos: posicionar(ids, nivel),
    recompensa: {
      moedas: c.moedasBase + c.moedasPorAndar * andar,
      xp: c.xpBase + c.xpPorAndar * andar,
      orvalho: chefe ? c.orvalhoChefe : 0,
    },
    cartas: chefe ? c.cartasChefe : c.cartas,
  };
}

// ---------- Pragas que o jogador já enfrentou na campanha ----------

export function pragasConhecidas(dados, estado) {
  const ids = new Set();
  for (const mapa of dados.campanha.mapas) {
    for (const fase of mapa.fases) {
      if (estado.vencidas.includes(fase.id)) fase.inimigos.forEach((i) => ids.add(i.praga));
    }
  }
  // sem nada vencido ainda: as pragas da primeira fase
  if (!ids.size) dados.campanha.mapas[0].fases[0].inimigos.forEach((i) => ids.add(i.praga));
  return dados.pragas.filter((p) => ids.has(p.id));
}

// Nível das pragas pensado pro time do jogador: média das 5 plantas mais fortes
export function nivelDoJogador(estado) {
  const niveis = Object.values(estado.colecao).map((r) => r.nivel).sort((a, b) => b - a).slice(0, 5);
  return niveis.length ? Math.round(niveis.reduce((s, n) => s + n, 0) / niveis.length) : 1;
}

// ---------- Desafio do Dia ----------

export function desafioDoDia(dados, estado, data = new Date()) {
  const c = dados.atividades.desafio;
  const dia = hoje(data);
  const rng = criarRng(numeroDoTexto(`desafio-${dia}`));

  // facção só entra se o jogador tiver planta dela
  const faccoesDoJogador = dados.faccoes.faccoes.filter((f) =>
    dados.plantas.some((p) => p.faccao === f.id && estado.colecao[p.id]));
  const regras = c.regras.filter((r) => r.id !== 'faccao' || faccoesDoJogador.length);
  const modelo = sortearDe(regras, rng);
  const faccao = modelo.id === 'faccao' ? sortearDe(faccoesDoJogador, rng) : null;
  const multPct = modelo.mult ? Math.round((Object.values(modelo.mult)[0] - 1) * 100) : 0;
  const valores = { emoji: faccao?.emoji, faccao: faccao?.nome, max: modelo.max, pct: multPct };
  const preencher = (t) => t.replace(/\{(\w+)\}/g, (_, k) => valores[k] ?? '');
  const regra = { id: modelo.id, nome: preencher(modelo.nome), texto: preencher(modelo.texto) };

  const pool = pragasConhecidas(dados, estado).filter((p) => !p.chefe);
  const ids = [];
  for (let i = 0; i < c.inimigos; i++) ids.push(sortearDe(pool, rng).id);
  const nivel = nivelDoJogador(estado) + c.nivelExtra;
  const feito = estado.desafio.dia === dia && estado.desafio.vencido;

  return {
    id: `desafio-${dia}`,
    tipo: 'desafio',
    dia,
    feito,
    nome: `Desafio · ${regra.nome}`,
    nivel,
    folego: 0,
    regra,
    faccao: faccao?.id || null,
    timeMax: modelo.max || null,
    multPragas: modelo.mult || null,
    inimigos: posicionar(ids, nivel),
    recompensa: feito
      ? { moedas: 0, xp: 0, orvalho: 0 }
      : { moedas: c.moedasPorNivel * nivel, xp: c.xpPorNivel * nivel, orvalho: c.orvalho },
    cartas: feito ? [] : c.cartas,
  };
}

// ---------- Horta de Treino ----------

export function batalhaTreino(idsPragas, nivel) {
  return {
    id: 'treino',
    tipo: 'treino',
    nome: 'Horta de Treino',
    nivel,
    folego: 0,
    podePular: true,
    inimigos: posicionar(idsPragas, nivel),
    recompensa: { moedas: 0, xp: 0, orvalho: 0 },
    cartas: [],
  };
}

// ---------- Regras do time ----------
// Devolve { erro: 'chave do texto', ... } se o time não vale pra essa batalha.

export function checarTime(batalha, time, dados) {
  if (batalha.timeMax && time.length > batalha.timeMax) return { erro: 'regraTimeMax', max: batalha.timeMax };
  if (batalha.faccao) {
    const fora = time.some((m) => dados.plantas.find((p) => p.id === m.planta)?.faccao !== batalha.faccao);
    if (fora) {
      const f = dados.faccoes.faccoes.find((x) => x.id === batalha.faccao);
      return { erro: 'regraFaccao', emoji: f.emoji, faccao: f.nome };
    }
  }
  return null;
}

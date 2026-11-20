// Invasão de Chefe, Feira e Herbário: só contas e montagem (não desenha e não mexe no save).

import { criarRng } from './batalha.js';
import { hoje, pragasConhecidas, nivelDoJogador } from './atividades.js';

function numeroDoTexto(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// Número do dia no calendário do celular (muda à meia-noite local)
function diaIndice(data) {
  return Math.floor(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()) / 86400000);
}

function meiaNoite(indice) {
  const d = new Date(indice * 86400000);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()).getTime();
}

// ---------- Invasão de Chefe ----------

export function cicloAtual(dados, agora = Date.now()) {
  const dias = dados.invasao.diasPorChefe;
  const ciclo = Math.floor(diaIndice(new Date(agora)) / dias);
  return { ciclo, inicio: meiaNoite(ciclo * dias), fim: meiaNoite((ciclo + 1) * dias) };
}

export function chefeDoCiclo(ciclo, dados) {
  const chefes = dados.pragas.filter((p) => p.chefe);
  return chefes[ciclo % chefes.length];
}

// Vida de UM chefe normal nesse nível (a invasão tem várias dessas)
export function vidaDeUmChefe(chefe, nivel, dados) {
  return Math.round(chefe.vida * (1 + dados.config.batalha.crescimentoPorNivel * (nivel - 1)));
}

// Horas em que os vizinhos jogam (de madrugada ninguém ataca)
function horasAtivas(inicio, ate, [dorme, acorda]) {
  let horas = 0;
  for (let t = inicio; t < ate; t += 3600000) {
    const h = new Date(t).getHours();
    if (h < dorme || h >= acorda) horas += Math.min(1, (ate - t) / 3600000);
  }
  return horas;
}

function danoDosBots(dados, ciclo, inicio, ate, vidaUm) {
  const c = dados.invasao;
  const soma = c.bots.reduce((s, b) => s + b.peso, 0);
  const horas = horasAtivas(inicio, ate, c.madrugada);
  return c.bots.map((b, i) => {
    const fator = 0.6 + 0.8 * criarRng(numeroDoTexto(`invasao-${ciclo}-${i}`))();
    return { nome: b.nome, emoji: b.emoji, dano: Math.round(horas * c.danoBotsPorHora * vidaUm * (b.peso / soma) * fator) };
  });
}

// Como está a invasão guardada no save (inv) no momento "agora".
export function situacaoInvasao(inv, dados, agora = Date.now()) {
  const c = dados.invasao;
  const dias = c.diasPorChefe;
  const inicio = meiaNoite(inv.ciclo * dias);
  const fim = meiaNoite((inv.ciclo + 1) * dias);
  const chefe = chefeDoCiclo(inv.ciclo, dados);
  const vidaUm = vidaDeUmChefe(chefe, inv.nivel, dados);
  const vidaTotal = vidaUm * c.multVida;
  let ate = Math.min(agora, fim);
  const total = (t) => danoDosBots(dados, inv.ciclo, inicio, t, vidaUm).reduce((s, b) => s + b.dano, 0) + inv.dano;
  let derrotado = total(ate) >= vidaTotal;
  if (derrotado) {
    // os vizinhos param de bater quando o chefe cai
    let a = inicio;
    let b = ate;
    for (let k = 0; k < 30; k++) {
      const m = (a + b) / 2;
      if (total(m) >= vidaTotal) b = m; else a = m;
    }
    ate = b;
  }
  const bots = danoDosBots(dados, inv.ciclo, inicio, ate, vidaUm);
  const ranking = [...bots, { nome: 'Você', emoji: '🌱', dano: inv.dano, voce: true }]
    .sort((x, y) => y.dano - x.dano);
  const danoTotal = ranking.reduce((s, r) => s + r.dano, 0);
  derrotado = danoTotal >= vidaTotal;
  return {
    chefe, nivel: inv.nivel, vidaUm, vidaTotal,
    restante: Math.max(0, vidaTotal - danoTotal),
    derrotado, terminou: agora >= fim, fim, ranking,
    posicao: ranking.findIndex((r) => r.voce) + 1,
  };
}

export function premioDoRanking(posicao, derrotado, dados) {
  const c = dados.invasao;
  const faixa = c.premiosRanking.find((f) => posicao <= f.ate);
  const premio = structuredClone(faixa.premio);
  if (derrotado) {
    for (const [k, v] of Object.entries(c.premioDerrotado)) premio[k] = (premio[k] || 0) + v;
  }
  return premio;
}

export function novoCicloInvasao(dados, estado, agora = Date.now()) {
  return {
    ciclo: cicloAtual(dados, agora).ciclo,
    nivel: nivelDoJogador(estado) + dados.invasao.nivelExtra,
    dano: 0, dia: '', ataques: 0, premioPego: false,
  };
}

export function batalhaInvasao(sit, ciclo, dados) {
  const c = dados.invasao;
  const rng = criarRng(numeroDoTexto(`lacaios-${ciclo}`));
  const comuns = pragasConhecidas(dados, { vencidas: dados.campanha.mapas.flatMap((m) => m.fases.map((f) => f.id)) })
    .filter((p) => !p.chefe && p.categoria === sit.chefe.categoria);
  const inimigos = [{ praga: sit.chefe.id, col: 0, linha: 1, nivel: sit.nivel, vida: sit.restante, vidaMax: sit.vidaTotal, mult: c.multChefe }];
  [[0, 0], [0, 2], [1, 1]].slice(0, c.lacaios).forEach(([col, linha]) => {
    const p = comuns[Math.floor(rng() * comuns.length)];
    if (p) inimigos.push({ praga: p.id, col, linha, nivel: sit.nivel });
  });
  return {
    id: `invasao-${ciclo}`,
    tipo: 'invasao',
    nome: `Invasão · ${sit.chefe.nome}`,
    nivel: sit.nivel,
    folego: 0,
    chefe: true,
    podePular: true,
    musica: 'invasao',
    idChefe: sit.chefe.id,
    vidaUm: sit.vidaUm,
    inimigos,
    recompensa: { moedas: 0, xp: c.xpBase + c.xpPorNivel * sit.nivel, orvalho: 0 },
    cartas: c.cartasAtaque,
  };
}

// ---------- Feira ----------

export function ofertasDoDia(dados, dia = hoje()) {
  const rng = criarRng(numeroDoTexto(`feira-${dia}`));
  const lista = [...dados.feira.ofertas];
  const escolhidas = [];
  while (escolhidas.length < dados.feira.ofertasPorDia && lista.length) {
    escolhidas.push(lista.splice(Math.floor(rng() * lista.length), 1)[0]);
  }
  return escolhidas;
}

// ---------- Herbário ----------

// Páginas: uma por facção (plantas) e uma por mapa (pragas que aparecem nele).
export function paginasHerbario(dados, estado) {
  const h = dados.herbario;
  const vistas = new Set(pragasConhecidas(dados, estado).map((p) => p.id));
  if (!estado.vencidas.length) vistas.clear();
  const paginas = dados.faccoes.faccoes.map((f) => {
    const itens = dados.plantas.filter((p) => p.faccao === f.id)
      .map((p) => ({ emoji: p.emoji, nome: p.nome, visto: !!estado.colecao[p.id] }));
    return { id: `faccao-${f.id}`, titulo: `${f.emoji} ${h.titulos[f.id]}`, itens, premio: h.premioFaccao };
  });
  dados.campanha.mapas.forEach((m, i) => {
    const ids = [...new Set(m.fases.flatMap((f) => f.inimigos.map((x) => x.praga)))];
    const itens = ids.map((id) => dados.pragas.find((p) => p.id === id)).filter(Boolean)
      .map((p) => ({ emoji: p.emoji, nome: p.nome, visto: vistas.has(p.id), chefe: !!p.chefe }));
    paginas.push({ id: `mapa-${m.id}`, titulo: `${m.emoji} ${h.titulos[m.id]}`, itens, premio: h.premioMapa[i] || h.premioMapa[h.premioMapa.length - 1] });
  });
  for (const p of paginas) {
    p.completa = p.itens.every((x) => x.visto);
    p.pega = estado.herbario.pegas.includes(p.id);
  }
  return paginas;
}

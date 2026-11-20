// Regras do Labirinto das Raízes: portas, batalhas e prêmio. Só cálculos, não mexe no save.
// Os números ficam em data/labirinto.json.

import { atributos, poder } from './evolucao.js';

const ESPACOS = [[0, 1], [0, 0], [0, 2], [1, 1], [1, 0], [1, 2]];

function sortearDe(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function embaralhar(lista) {
  return [...lista].sort(() => Math.random() - 0.5);
}

// Tanques ficam na frente, o resto atrás.
export function posicionarTime(ids, dados) {
  const funcao = (id) => dados.plantas.find((p) => p.id === id)?.funcao;
  const ordem = [...ids].sort((a, b) => Number(funcao(b) === 'Tanque') - Number(funcao(a) === 'Tanque'));
  return ordem.map((planta, i) => ({ planta, col: ESPACOS[i][0], linha: ESPACOS[i][1] }));
}

// Poder das plantas vivas do time (a dificuldade das salas acompanha isso)
export function poderDoTime(run, dados, colecao) {
  let total = 0;
  for (const m of run.time) {
    if ((run.vidas[m.planta] ?? 1) <= 0) continue;
    const base = dados.plantas.find((p) => p.id === m.planta);
    if (base && colecao[m.planta]) total += poder(atributos(base, colecao[m.planta], dados), dados);
  }
  return total;
}

// Multiplicador do prêmio: time mais forte rende mais (e time fraquinho rende menos)
export function multPremio(poderTime, dados) {
  const c = dados.labirinto;
  const m = poderTime / c.referenciaPoder;
  return Math.max(c.multPremio.min, Math.min(c.multPremio.max, m));
}

// Soma os efeitos das bênçãos do caminho: { vida, atq, def, vel, seivaInicial, seivaTurno, critico, sementes }
export function bonusDoRun(run, dados) {
  const c = dados.labirinto;
  const todas = [...c.bencaos, ...c.malditas];
  const b = { vida: 0, atq: 0, def: 0, vel: 0, seivaInicial: 0, seivaTurno: 0, critico: 0, sementes: 0 };
  for (const id of run.bencaos) {
    const item = todas.find((x) => x.id === id);
    if (item) for (const [k, v] of Object.entries(item.efeito)) b[k] += v;
  }
  return b;
}

// Três portas pro andar
export function gerarPortas(andar, run, dados, colecao, emViagem = () => false) {
  const c = dados.labirinto;
  if (c.chefes.includes(andar + 1)) return [{ t: 'chefe' }];
  const livres = Object.keys(colecao).filter((id) => !run.time.some((m) => m.planta === id) && !emViagem(id));
  const pool = c.portas.filter((p) => (p.desdeAndar || 0) <= andar + 1 && (p.t !== 'recruta' || (run.time.length < c.plantasMax && livres.length)));
  const escolhidas = [];
  const tentativas = [...pool];
  while (escolhidas.length < 3 && tentativas.length) {
    const total = tentativas.reduce((s, p) => s + p.peso, 0);
    let r = Math.random() * total;
    const i = tentativas.findIndex((p) => (r -= p.peso) < 0);
    const [p] = tentativas.splice(i < 0 ? 0 : i, 1);
    escolhidas.push({ t: p.t });
  }
  if (!escolhidas.some((p) => p.t === 'batalha' || p.t === 'elite')) escolhidas[0] = { t: 'batalha' };
  return escolhidas;
}

export function opcoesBencao(run, dados, maldita) {
  const c = dados.labirinto;
  const normais = c.bencaos.filter((b) => !run.bencaos.includes(b.id));
  if (maldita) return embaralhar(c.malditas.filter((m) => !run.bencaos.includes(m.id))).slice(0, 2).map((m) => m.id).concat(embaralhar(normais).slice(0, 1).map((b) => b.id));
  return embaralhar(normais).slice(0, 3).map((b) => b.id);
}

export function opcoesRecruta(run, dados, colecao, emViagem = () => false) {
  const livres = Object.keys(colecao).filter((id) => !run.time.some((m) => m.planta === id) && !emViagem(id));
  return embaralhar(livres).slice(0, 3);
}

// Monta a batalha de uma sala. As pragas têm nível pensado pro poder do time naquele momento.
export function gerarBatalha(run, tipo, dados, colecao) {
  const c = dados.labirinto;
  const andar = run.andar;
  const alvoBase = poderDoTime(run, dados, colecao) * c.fator[Math.min(andar, c.fator.length - 1)] * (tipo === 'elite' ? c.fatorElite : 1);
  const comuns = dados.pragas.filter((p) => !p.chefe);
  const pool = comuns.slice(0, Math.min(comuns.length, c.poolInicial + andar));
  const chefes = dados.pragas.filter((p) => p.chefe);
  const ids = [];
  let qtd = c.inimigosPorAndar[Math.min(andar, c.inimigosPorAndar.length - 1)];
  if (tipo === 'chefe') {
    const n = c.chefes.indexOf(andar + 1);
    ids.push(chefes[(n < 0 ? 0 : n) % chefes.length].id);
    qtd = 1 + c.chefeAjudantes[Math.max(0, n)];
  } else if (tipo === 'elite') qtd = Math.min(5, qtd + 1);
  while (ids.length < qtd) ids.push(sortearDe(pool).id);

  // nível pra que a soma do poder das pragas fique perto do alvo
  const base1 = ids.reduce((s, id) => {
    const p = dados.pragas.find((x) => x.id === id);
    return s + poder({ vida: p.vida, atq: p.atq, def: p.def, vel: p.vel }, dados);
  }, 0);
  const cr = dados.config.batalha.crescimentoPorNivel;
  const nivel = Math.max(1, Math.round(1 + (alvoBase / base1 - 1) / cr));

  const inimigos = ids.map((praga, i) => ({ praga, col: ESPACOS[i][0], linha: ESPACOS[i][1], nivel }));
  const nomes = { batalha: 'Batalha', elite: '💀 Elite', chefe: '👑 Chefe' };
  return {
    id: `labirinto-${andar + 1}-${tipo}`,
    tipo: 'labirinto',
    sala: tipo,
    andar: andar + 1,
    nome: `Labirinto · Andar ${andar + 1} · ${nomes[tipo]}`,
    nivel,
    folego: 0,
    chefe: tipo === 'chefe',
    podePular: true,
    time: run.time,
    labirinto: { vidas: { ...run.vidas }, mods: bonusDoRun(run, dados) },
    inimigos,
    recompensa: { moedas: 0, xp: 0, orvalho: 0 },
    cartas: [],
  };
}

// Prêmio final da corrida
export function premioFinal(run, dados, colecao) {
  const c = dados.labirinto;
  const mult = multPremio(run.poderMedio || poderDoTime(run, dados, colecao), dados);
  const bonus = 1 + bonusDoRun(run, dados).sementes;
  let sementes = run.sementesExtra || 0;
  for (let i = 0; i < run.andaresVencidos; i++) sementes += c.sementesPorAndar[Math.min(i, c.sementesPorAndar.length - 1)];
  if (run.venceu) sementes += c.sementesVitoria;
  sementes = Math.round(sementes * mult * bonus);
  const pontos = Math.floor(run.andaresVencidos / c.andaresPorPonto) + (run.venceu ? c.pontosVitoria : 0);
  return { sementes, pontos, moedas: Math.round(run.moedas * mult), mult };
}

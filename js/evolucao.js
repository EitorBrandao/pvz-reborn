// Regras de evolução das plantas: nível, estrelas, equipamentos e pacote de sementes.
// Só cálculos: quem salva é o estado.js.

export function registroNovo() {
  return { nivel: 1, xp: 0, estrelas: 1, ascensao: 0, talentos: {}, copias: 0, equip: { vaso: 0, adubo: 0, regador: 0 } };
}

export function xpParaProximo(nivel, cfg) {
  return cfg.xpBase + (nivel - 1) * cfg.xpPorNivel;
}

export function nivelMaximo(estrelas, cfg, ascensao = 0) {
  return estrelas * cfg.niveisPorEstrela + ascensao * cfg.niveisPorRank;
}

// ---------- Talentos ----------
export function pontosTalento(registro, dados) {
  const t = dados.talentos;
  return Math.floor(registro.nivel / t.niveisPorPonto) + (registro.ascensao || 0) * t.pontosPorRank + (registro.talentosExtra || 0);
}

export function pontosGastos(registro) {
  return Object.values(registro.talentos || {}).reduce((a, b) => a + b, 0);
}

// Classe de talentos da planta (pela função dela: Tanque, Dano, Apoio, Controle)
export function classeTalento(dados, base) {
  const t = dados.talentos;
  return t.classes[t.funcoes[base.funcao]] || t.classes.dano;
}

export function noTalento(dados, base, idNo) {
  for (const ramo of classeTalento(dados, base).ramos) {
    const no = ramo.nos.find((n) => n.id === idNo);
    if (no) return no;
  }
  return null;
}

// Soma os bônus dos talentos: { vida, atq, def, vel, critico, critDano, potencia, seivaInicial, seivaTurno }
export function bonusTalentos(registro, dados, base) {
  const b = { vida: 0, atq: 0, def: 0, vel: 0, critico: 0, critDano: 0, potencia: 0, seivaInicial: 0, seivaTurno: 0 };
  if (!dados.talentos) return b;
  for (const [id, n] of Object.entries(registro.talentos || {})) {
    const no = noTalento(dados, base, id);
    if (no) b[no.efeito] += no.porPonto * n;
  }
  return b;
}

// Ascensão: planta no nível máximo com todas as estrelas volta ao nível 1 e ganha um rank.
export function custoAscensao(registro, dados) {
  const rank = registro.ascensao || 0;
  return rank >= dados.ascensao.rankMax ? null : dados.ascensao.custos[rank];
}

export function podeAscender(registro, cfg) {
  return registro.estrelas >= cfg.estrelasMax && registro.nivel >= nivelMaximo(registro.estrelas, cfg, registro.ascensao || 0);
}

// Atributos finais de uma planta. "mudanca" permite prever como fica depois de evoluir.
export function atributos(base, registro, dados, mudanca = {}) {
  const r = { ...registro, ...mudanca, equip: { ...registro.equip, ...(mudanca.equip || {}) } };
  const fNivel = 1 + dados.config.batalha.crescimentoPorNivel * (r.nivel - 1);
  const fEstrela = 1 + dados.config.evolucao.bonusEstrela * (r.estrelas - 1);
  const fRank = 1 + dados.config.evolucao.bonusRank * (r.ascensao || 0);
  const bonus = { vida: 0, atq: 0, def: 0, vel: 0 };
  const tal = bonusTalentos(r, dados, base);
  bonus.vida += tal.vida; bonus.atq += tal.atq; bonus.def += tal.def;
  for (const espaco of dados.equipamentos.espacos) {
    const n = r.equip[espaco.id] || 0;
    if (n > 0) bonus[espaco.atributo] += dados.equipamentos.niveis[n - 1].bonus;
  }
  const calc = (attr) => Math.round(base[attr] * fNivel * fEstrela * fRank * (1 + bonus[attr]));
  return { vida: calc('vida'), atq: calc('atq'), def: calc('def'), vel: base.vel + tal.vel };
}

// Poder: um número só pra comparar plantas (e pragas). Soma os atributos finais
// com os pesos do config. Habilidades ainda não contam.
export function poder(stats, dados) {
  const pesos = dados.config.poder.pesos;
  return Math.round(Object.entries(pesos).reduce((soma, [attr, peso]) => soma + (stats[attr] || 0) * peso, 0));
}

// Habilidade com o bônus das estrelas. Cada estrela acima da 1ª soma "porEstrela".
// Campos inteiros (golpes, alvos, turnos) são arredondados.
const INTEIROS = ['golpes', 'alvos', 'turnos', 'seiva'];
export function habilidadeComEstrelas(hab, estrelas = 1) {
  const h = { ...hab };
  const extra = Math.max(0, estrelas - 1);
  for (const [campo, passo] of Object.entries(hab.porEstrela || {})) {
    if (campo === 'aplica') { h.aplica = habilidadeComEstrelas({ ...hab.aplica, porEstrela: passo }, estrelas); continue; }
    const v = (hab[campo] || 0) + passo * extra;
    h[campo] = INTEIROS.includes(campo) ? Math.round(v) : Math.round(v * 100) / 100;
  }
  return h;
}

// Dá XP e sobe de nível. Devolve quantos níveis subiu.
export function darXp(registro, xp, cfg) {
  const max = nivelMaximo(registro.estrelas, cfg, registro.ascensao || 0);
  if (registro.nivel >= max) { registro.xp = 0; return 0; }
  registro.xp += xp;
  let subiu = 0;
  while (registro.nivel < max && registro.xp >= xpParaProximo(registro.nivel, cfg)) {
    registro.xp -= xpParaProximo(registro.nivel, cfg);
    registro.nivel += 1;
    subiu += 1;
  }
  if (registro.nivel >= max) registro.xp = 0;
  return subiu;
}

export function custoEstrela(registro, cfg) {
  if (registro.estrelas >= cfg.estrelasMax) return null;
  return { copias: cfg.copiasPorEstrela[registro.estrelas], moedas: cfg.moedasPorEstrela[registro.estrelas] };
}

// Quantas cópias a planta ainda vai gastar até chegar ao máximo de estrelas
export function copiasAteMaximo(registro, cfg) {
  let total = 0;
  for (let i = registro.estrelas; i < cfg.estrelasMax; i++) total += cfg.copiasPorEstrela[i];
  return total;
}

export function custoEquip(registro, espacoId, dados) {
  const n = registro.equip[espacoId] || 0;
  const nivel = dados.equipamentos.niveis[n];
  return nivel ? nivel.custo : null;
}

export function temCartas(inventario, cartas) {
  return Object.entries(cartas).every(([id, qtd]) => (inventario[id] || 0) >= qtd);
}

export function gastarCartas(inventario, cartas) {
  for (const [id, qtd] of Object.entries(cartas)) inventario[id] -= qtd;
}

// Sorteia uma planta do pacote, de acordo com os pesos.
export function sortearPlanta(pesos, rng = Math.random) {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  let sorteio = rng() * total;
  for (const [id, peso] of Object.entries(pesos)) {
    sorteio -= peso;
    if (sorteio < 0) return id;
  }
  return Object.keys(pesos)[0];
}

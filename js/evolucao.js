// Regras de evolução das plantas: nível, estrelas, equipamentos e pacote de sementes.
// Só cálculos: quem salva é o estado.js.

export function registroNovo() {
  return { nivel: 1, xp: 0, estrelas: 1, copias: 0, equip: { vaso: 0, adubo: 0, regador: 0 } };
}

export function xpParaProximo(nivel, cfg) {
  return cfg.xpBase + (nivel - 1) * cfg.xpPorNivel;
}

export function nivelMaximo(estrelas, cfg) {
  return estrelas * cfg.niveisPorEstrela;
}

// Atributos finais de uma planta. "mudanca" permite prever como fica depois de evoluir.
export function atributos(base, registro, dados, mudanca = {}) {
  const r = { ...registro, ...mudanca, equip: { ...registro.equip, ...(mudanca.equip || {}) } };
  const fNivel = 1 + dados.config.batalha.crescimentoPorNivel * (r.nivel - 1);
  const fEstrela = 1 + dados.config.evolucao.bonusEstrela * (r.estrelas - 1);
  const bonus = { vida: 0, atq: 0, def: 0, vel: 0 };
  for (const espaco of dados.equipamentos.espacos) {
    const n = r.equip[espaco.id] || 0;
    if (n > 0) bonus[espaco.atributo] += dados.equipamentos.niveis[n - 1].bonus;
  }
  const calc = (attr) => Math.round(base[attr] * fNivel * fEstrela * (1 + bonus[attr]));
  return { vida: calc('vida'), atq: calc('atq'), def: calc('def'), vel: base.vel };
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
  const max = nivelMaximo(registro.estrelas, cfg);
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

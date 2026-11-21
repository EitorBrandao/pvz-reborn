// Animação das plantas por partes: como cada peça se mexe (o desenho das peças fica em js/arte.js).
// Cada função recebe o estado s da planta e devolve o movimento da peça em volta do pivô dela:
//   r (giro, radianos), sx/sy (escala), dx/dy (deslocamento, em unidades do desenho 0..100), a (opacidade).
// s.t: tempo (s) · s.carga: 0..1 enquanto carrega o tiro · s.tiro: pulso logo depois do disparo
// s.tiros[i]: pulso do disparo i (Bromélia) · s.mA/s.mB: molas rápida e lenta (balanço atrasado)
// s.pisca: 1 aberto, ~0 piscando · s.mira: 0..1 apontando pro alvo · s.alvoAng: ângulo do alvo (rad)

const sn = Math.sin;
const respira = (s, k = 1) => ({ sy: 1 + sn(s.t * 3.2) * 0.03 * k - s.carga * 0.07 + s.tiro * 0.07, sx: 1 - sn(s.t * 3.2) * 0.03 * k + s.carga * 0.05 - s.tiro * 0.04 });
const balanca = (s, fase, amp = 0.06, mola = 0, lado = 1) => ({ r: lado * (sn(s.t * 2.2 + fase) * amp + mola) });
const PADRAO = {
  corpo: (s) => respira(s),
  olhos: (s) => ({ sy: s.pisca }),
  bochechas: (s) => ({ sx: 1 + s.carga * 0.5, sy: 1 + s.carga * 0.45 }),
  boca: (s) => ({ sx: 1 + s.tiro * 0.3, sy: 1 + s.tiro * 0.3 }),
};
const petalas = (s, lado, abre = 0.45) => ({ r: lado * (sn(s.t * 1.5) * 0.05 + s.carga * 0.25 - s.tiro * abre - s.mB * 0.2) });
// cada folha de fora se afasta do centro na sua direção (ângulo da fatia), com balanço próprio
function foraCouve(abre) {
  const o = {};
  for (let i = 0; i < 6; i++) {
    const a = (-60 + i * 60) * Math.PI / 180, lado = i % 2 ? 1 : -1;
    o['folhaFora' + i] = (s) => {
      const d = 3.2 + sn(s.t * 2.2 + i * 1.1) * 0.9 - s.carga * 3 + s.tiro * abre + s.mB * 1.5 * lado;
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, r: sn(s.t * 1.8 + i * 1.3) * 0.05 + s.mA * 0.08 * lado };
    };
  }
  return o;
}
const MOV = {
  pimentao: {
    pavio: (s) => ({ r: sn(s.t * 3) * 0.08 - s.carga * 0.35 + s.mB * 0.6 }),
    faisca: (s) => { const k = 1 + 0.15 * sn(s.t * 14) + s.carga * 0.7 + s.tiro * 0.5; return { sx: k, sy: k, r: s.t * 2 }; },
    calice: (s) => ({ r: s.mA * 0.15, sx: 1 + s.carga * 0.08 }),
  },
  cacto: {
    // o braço direito gira até apontar pra praga e segura a mira enquanto atira
    bracoD: (s) => ({ r: sn(s.t * 2) * 0.06 * (1 - s.mira) + s.mira * (1.45 + s.alvoAng) - s.tiro * 0.22 + s.mA * 0.12 }),
    bracoE: (s) => ({ r: -sn(s.t * 2 + 1) * 0.06 - s.carga * 0.25 + s.mB * 0.25 }),
    flor: (s) => ({ r: sn(s.t * 3) * 0.1 + s.mB * 0.6, sx: 1 + s.tiro * 0.25, sy: 1 + s.tiro * 0.25 }),
    olhos: (s) => ({ sy: s.pisca, dx: s.mira * 1.5 }),
    boca: (s) => ({ sx: 1 + s.carga * 0.2, sy: 1 + s.carga * 0.2 + s.tiro * 0.2 }),
  },
  milho: {
    corpo: (s) => ({ r: -s.carga * 0.12 + s.mA * 0.14, ...respira(s) }),
    folhaTrasE: (s) => ({ r: sn(s.t * 2.2) * 0.06 + s.carga * 0.18 - s.mB * 0.45 }),
    folhaTrasD: (s) => ({ r: -sn(s.t * 2.2 + 0.6) * 0.06 - s.carga * 0.18 + s.mB * 0.45 }),
    folhaE: (s) => ({ r: sn(s.t * 2.6 + 1) * 0.07 - s.mA * 0.4 }),
    folhaD: (s) => ({ r: -sn(s.t * 2.6 + 1.6) * 0.07 + s.mA * 0.4 }),
    bochechas: (s) => ({ sx: 1 + s.carga * 0.6, sy: 1 + s.carga * 0.5 }),
    boca: (s) => ({ sx: 1 + s.tiro * 0.35 - s.carga * 0.3, sy: 1 + s.tiro * 0.35 - s.carga * 0.3 }),
  },
  babosa: {
    folhaE1: (s) => balanca(s, 0, 0.05, -s.mB * 0.2),
    folhaE2: (s) => balanca(s, 0.8, 0.05, -s.mB * 0.15),
    folhaC: (s) => balanca(s, 1.6, 0.04, s.mA * 0.1),
    folhaD2: (s) => balanca(s, 2.4, 0.05, s.mB * 0.15),
    folhaD1: (s) => ({ r: sn(s.t * 2.2 + 3) * 0.05 - s.carga * 0.3 + s.tiro * 0.35 + s.mA * 0.3 }),
    gota: (s) => { const k = Math.max(0.3, 1 + s.carga * 0.6 - s.tiro * 0.7); return { sx: k, sy: k }; },
    orvalho: (s) => ({ dy: sn(s.t * 1.5) * 1 }),
  },
  // couve: 6 folhas de fora soltas e espaçadas; fecham abraçando o miolo e se abrem em leque no disparo
  couve: { corpo: (s) => ({ r: -s.carga * 0.06 + s.mA * 0.08, ...respira(s) }), ...foraCouve(6) },
  bambu: {
    corpo: (s) => ({ r: -s.carga * 0.06 + s.mA * 0.08, ...respira(s, 0.6) }),
    // a lança (haste de trás) recua, gira até apontar pra praga e é arremessada
    lanca: (s) => ({ r: sn(s.t * 1.7) * 0.04 * (1 - s.mira) + s.mira * (1.15 + s.alvoAng) + s.mA * 0.1, dx: -s.carga * 4 + s.tiro * 5 }),
    folhaTras: (s) => balanca(s, 1, 0.12, s.mB * 0.3),
    folhaE: (s) => balanca(s, 0.4, 0.1, -s.mA * 0.5),
  },
  cogumelo: {
    // o cogumelo puxa o ar inclinando pra trás, bochecha a boca e cospe os esporos
    corpo: (s) => ({ r: -s.carga * 0.1 + s.mA * 0.12, ...respira(s) }),
    chapeu: (s) => ({ sy: 1 - s.carga * 0.1 + s.tiro * 0.12 + sn(s.t * 2.4) * 0.02, sx: 1 + s.carga * 0.06, r: -s.carga * 0.05 + s.mB * 0.2 }),
    boca: (s) => { const k = 1 - s.carga * 0.35 + s.tiro * 0.6; return { sx: k, sy: k }; },
    esporos: (s) => ({ dy: sn(s.t * 2) * 2 - s.tiro * 4, sx: 1 + s.tiro * 0.3, sy: 1 + s.tiro * 0.3 }),
  },
  trepadeira: {
    caule: (s) => ({ r: sn(s.t * 1.6) * 0.04 - s.carga * 0.06 + s.mB * 0.08 }),
    corpo: (s) => ({ r: sn(s.t * 2.2) * 0.06 - s.carga * 0.1 + s.mA * 0.15 }),
    gavinha: (s) => ({ r: sn(s.t * 2) * 0.08 - s.carga * 0.6 + s.tiro * 0.5 + s.mA * 0.5 }),
    folhaE: (s) => balanca(s, 0.3, 0.1, -s.mB * 0.3),
    folhaD: (s) => balanca(s, 1.3, 0.1, s.mB * 0.3),
    folhaM: (s) => balanca(s, 2.1, 0.1, -s.mA * 0.3),
  },
  agave: {
    // o arpão inclina até apontar pra praga, recua ao carregar e estoca no disparo
    arpao: (s) => ({ r: sn(s.t * 1.8) * 0.04 * (1 - s.mira) + s.mira * (1.2 + s.alvoAng) + s.mA * 0.1, dy: s.carga * 5 - s.tiro * 6 }),
    folhasE: (s) => balanca(s, 0, 0.04, -s.mB * 0.2),
    folhasD: (s) => balanca(s, 0.9, 0.04, s.mB * 0.2),
    folhaBaixaE: (s) => balanca(s, 1.7, 0.04, -s.mA * 0.15),
    folhaBaixaD: (s) => balanca(s, 2.5, 0.04, s.mA * 0.15),
  },
  bromelia: {
    folhaBaixoE: (s) => balanca(s, 0, 0.05, -s.mB * 0.3),
    folhaBaixoD: (s) => balanca(s, 0.7, 0.05, s.mB * 0.3),
    folhaMeioE: (s) => balanca(s, 1, 0.06, -s.mA * 0.35),
    folhaMeioD: (s) => balanca(s, 1.5, 0.06, s.mA * 0.35),
    aura: (s) => { const k = 1 + s.carga * 0.4 + sn(s.t * 2) * 0.05 + s.tiro * 0.3; return { sx: k, sy: k, a: 0.7 + s.carga * 0.3 }; },
    // cada uma das 3 pétalas lança um brilho: esquerda, meio, direita
    petalaE: (s) => ({ r: sn(s.t * 1.5) * 0.05 + s.carga * 0.25 - s.tiros[0] * 0.55 - s.mB * 0.15 }),
    petalaC: (s) => ({ sy: 1 - s.carga * 0.18 + s.tiros[1] * 0.35, sx: 1 + s.carga * 0.1 - s.tiros[1] * 0.1 }),
    petalaD: (s) => ({ r: -sn(s.t * 1.5) * 0.05 - s.carga * 0.25 + s.tiros[2] * 0.55 + s.mB * 0.15 }),
    brilhos: (s) => { const k = 1 + sn(s.t * 4) * 0.08 + s.tiro * 0.35; return { sx: k, sy: k, a: 0.6 + 0.4 * Math.abs(sn(s.t * 3)) }; },
    bochechas: (s) => ({ sx: 1 + s.carga * 0.3, sy: 1 + s.carga * 0.3 }),
  },
  vitoria: {
    // a borda esquerda sobe juntando a água e desce de uma vez, empurrando a onda pra frente
    folhaVit: (s) => ({ dy: sn(s.t * 1.6) * 1.5, r: sn(s.t * 1.2) * 0.03 + s.carga * 0.12 - s.tiro * 0.16 + s.mB * 0.08 }),
    petalaE1: (s) => petalas(s, 1, 0.3), petalaD1: (s) => petalas(s, -1, 0.3),
    petalaE2: (s) => petalas(s, 1, 0.45), petalaD2: (s) => petalas(s, -1, 0.45),
    petalaC: (s) => ({ sy: 1 - s.carga * 0.15 + s.tiro * 0.25 }),
  },
  // jarro: o corpo incha, um bolo sobe de baixo até a boca e sai num cuspe só
  jarro: {
    corpo: (s) => ({ sx: 1 + s.carga * 0.12 - s.tiro * 0.14 + sn(s.t * 2.5) * 0.02, sy: 1 - s.carga * 0.05 + s.tiro * 0.12 - sn(s.t * 2.5) * 0.02 }),
    bolo: (s) => { const k = s.carga > 0.02 ? 1 : 0; return { dy: -s.carga * 40, sx: k * (0.85 + s.carga * 0.2), sy: k }; },
    tampa: (s) => ({ r: sn(s.t * 30) * 0.05 * s.carga - s.tiro * 0.9 - Math.max(0, s.mB) * 0.4 }),
    bocaJarro: (s) => ({ sx: 1 + s.tiro * 0.2 }),
  },
  cacto_vulcao: {
    chama: (s) => ({ sy: 1 + sn(s.t * 9) * 0.08 + s.carga * 0.6 + s.tiro * 0.5, sx: 1 + sn(s.t * 7) * 0.05 }),
    cratera: (s) => ({ sx: 1 + s.carga * 0.15 }),
    brasas: (s) => ({ dy: -s.carga * 4 + sn(s.t * 3) * 2, sx: 1 + s.tiro * 0.4, sy: 1 + s.tiro * 0.4 }),
    bracoE: (s) => ({ r: sn(s.t * 25) * 0.05 * s.carga - s.carga * 0.2 + s.mB * 0.2 }),
    bracoD: (s) => ({ r: sn(s.t * 25 + 1) * 0.05 * s.carga + s.carga * 0.2 - s.mB * 0.2 }),
  },
  lirio_curativo: {
    folhaBaixoE: (s) => balanca(s, 0, 0.05, -s.mB * 0.25),
    folhaBaixoD: (s) => balanca(s, 0.8, 0.05, s.mB * 0.25),
    caule: (s) => ({ r: sn(s.t * 1.5) * 0.03 + s.mA * 0.05 }),
    petalaE1: (s) => petalas(s, 1, 0.35), petalaD1: (s) => petalas(s, -1, 0.35),
    petalaE2: (s) => petalas(s, 1, 0.5), petalaD2: (s) => petalas(s, -1, 0.5),
    corpo: (s) => ({ r: s.mA * 0.1, sx: 1 + s.carga * 0.14 - s.tiro * 0.12 + sn(s.t * 3.2) * 0.03, sy: 1 + s.carga * 0.1 + s.tiro * 0.15 - sn(s.t * 3.2) * 0.03 }),
    cruzes: (s) => { const k = 1 + sn(s.t * 3) * 0.08 + s.tiro * 0.35; return { sx: k, sy: k }; },
  },
  couve_escudeira: {
    coroa: (s) => ({ sx: 1 - s.carga * 0.25 + s.tiro * 0.35, r: s.mB * 0.2 }),
    ...foraCouve(5),
    escudo: (s) => ({ dy: sn(s.t * 2) * 1, r: sn(s.t * 1.5) * 0.04 + s.mA * 0.1 }),
    brilhos: (s) => { const k = 1 + sn(s.t * 4) * 0.08 + s.tiro * 0.3; return { sx: k, sy: k }; },
  },
  bambu_pipoca: {
    pipocaTopo: (s) => ({ sy: 1 - s.carga * 0.2 + s.tiro * 0.35, sx: 1 + s.carga * 0.15 - s.tiro * 0.1, r: s.mA * 0.15 }),
    folhaE: (s) => balanca(s, 0, 0.07, -s.mB * 0.35),
    folhaD: (s) => balanca(s, 0.9, 0.07, s.mB * 0.35),
    pipocasSoltas: (s) => ({ dy: sn(s.t * 2.5) * 2, sx: 1 + s.tiro * 0.25, sy: 1 + s.tiro * 0.25 }),
  },
};
MOV.teia_esporenta = MOV.cogumelo;
MOV.jarro_peconhento = { ...MOV.jarro, veneno: (s) => { const k = 1 + sn(s.t * 3) * 0.06 + s.carga * 0.2; return { sx: k, sy: k }; } };
export const movDe = (id, nome) => (MOV[id] && MOV[id][nome]) || PADRAO[nome] || null;

// Peso do projétil (0 = leve e rápido, 1 = grande e lento): decide o quanto a planta carrega antes de atirar.
export function pesoDe(tiro, cfg) {
  const t = tiro || {};
  return Math.max(0, Math.min(1, ((t.tam || 1) / (t.vel || 1) - cfg.pesoBase) / cfg.pesoFaixa));
}

// Valores da animação do tiro a partir do peso (cada item do config é [mínimo, a mais no peso máximo]).
export function animDoPeso(tiro, cfg) {
  const p = pesoDe(tiro, cfg);
  const v = (k) => cfg[k][0] + cfg[k][1] * p;
  return {
    carga: Math.max((tiro && tiro.carga) || 0, cfg.cargaMinima, v('carga')),
    inclina: -v('inclina'), agacha: v('agacha'), coice: v('coice'), estica: v('estica'),
    chicote: v('chicote'), baforada: Math.round(v('baforada')), anel: v('anel'), brilho: v('brilho'),
  };
}

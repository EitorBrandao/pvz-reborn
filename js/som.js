// Sons da batalha, criados na hora pelo navegador (Web Audio). Não precisa de arquivo de áudio.

let cfg = { volume: 0.5, volumeMusica: 0.25 };
let ac = null;
let mestre = null;
let ligado = true;
let musica = null;
const ultimo = {};

export function configurarSom(config) {
  if (config) cfg = { ...cfg, ...config };
}

// Precisa ser chamado depois de um toque do jogador (regra dos navegadores).
export function acordar() {
  if (!ac) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ac = new Ctx();
    mestre = ac.createGain();
    mestre.gain.value = ligado ? cfg.volume : 0;
    mestre.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  if (desejada && !musica) tocarMusica(desejada);
}

export function ligarSom(sim) {
  ligado = sim;
  if (mestre) mestre.gain.setTargetAtTime(sim ? cfg.volume : 0, ac.currentTime, 0.02);
}

// Evita barulho embolado quando muitos golpes acontecem juntos.
function liberado(nome, ms) {
  if (!ac || !ligado) return false;
  const t = performance.now();
  if (ultimo[nome] && t - ultimo[nome] < ms) return false;
  ultimo[nome] = t;
  return true;
}

function nota(freq, dur, { tipo = 'sine', vol = 0.3, ate = null, atraso = 0, destino = mestre } = {}) {
  const t = ac.currentTime + atraso;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(destino);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function chiado(dur, { vol = 0.3, corte = 1200, atraso = 0 } = {}) {
  const t = ac.currentTime + atraso;
  const tam = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, tam, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < tam; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / tam);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filtro = ac.createBiquadFilter();
  filtro.type = 'lowpass';
  filtro.frequency.value = corte;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filtro).connect(g).connect(mestre);
  src.start(t);
}

const SONS = {
  tiro() { nota(700, 0.09, { tipo: 'square', vol: 0.06, ate: 350 }); },
  golpe() { chiado(0.12, { vol: 0.35, corte: 900 }); nota(160, 0.1, { tipo: 'triangle', vol: 0.25, ate: 70 }); },
  critico() {
    chiado(0.25, { vol: 0.5, corte: 2500 });
    nota(110, 0.3, { tipo: 'sawtooth', vol: 0.25, ate: 40 });
    nota(1200, 0.12, { tipo: 'square', vol: 0.06, ate: 1800 });
  },
  morte() { nota(500, 0.45, { tipo: 'triangle', vol: 0.25, ate: 80 }); chiado(0.3, { vol: 0.2, corte: 600, atraso: 0.05 }); },
  cura() { [660, 880, 1100].forEach((f, i) => nota(f, 0.18, { vol: 0.12, atraso: i * 0.06 })); },
  escudo() { nota(500, 0.3, { tipo: 'triangle', vol: 0.15, ate: 1000 }); nota(750, 0.3, { vol: 0.08, ate: 1500 }); },
  especial() { chiado(0.35, { vol: 0.15, corte: 3000 }); nota(300, 0.35, { tipo: 'sawtooth', vol: 0.1, ate: 1200 }); },
  sono() { nota(400, 0.4, { vol: 0.12, ate: 200 }); },
  atordoado() { [0, 0.08, 0.16].forEach((a, i) => nota(1200 - i * 150, 0.1, { tipo: 'triangle', vol: 0.1, atraso: a })); chiado(0.1, { vol: 0.3, corte: 1200 }); },

  // Especial de planta com som próprio (hab_<id da planta>). As outras usam "especial".
  hab_bambu_pipoca() { [0, 0.06, 0.11, 0.17, 0.22].forEach((a, i) => { chiado(0.05, { vol: 0.35, corte: 6000, atraso: a }); nota(900 + i * 120, 0.05, { tipo: 'square', vol: 0.05, atraso: a }); }); },
  hab_coco_raizao() { nota(90, 0.35, { tipo: 'sawtooth', vol: 0.2, ate: 50 }); chiado(0.3, { vol: 0.4, corte: 700 }); nota(180, 0.2, { tipo: 'triangle', vol: 0.2, ate: 60, atraso: 0.15 }); },
  hab_melancia_sonolenta() { [784, 659, 523, 392].forEach((f, i) => nota(f, 0.3, { tipo: 'triangle', vol: 0.12, atraso: i * 0.14 })); },
  lento() { nota(300, 0.35, { tipo: 'triangle', vol: 0.15, ate: 150 }); },
  espinhos() { nota(1500, 0.06, { tipo: 'square', vol: 0.05 }); nota(1700, 0.06, { tipo: 'square', vol: 0.05, atraso: 0.05 }); },
  reflexo() { nota(900, 0.1, { tipo: 'square', vol: 0.06, ate: 600 }); },
  seiva() { nota(800, 0.12, { tipo: 'triangle', vol: 0.12, ate: 1600 }); },

  // Efeitos de status: um som quando o efeito pega e outro a cada rodada que ele age.
  status_veneno() { [0, 0.07, 0.14].forEach((a, i) => nota(300 + i * 90, 0.08, { vol: 0.12, ate: 500 + i * 90, atraso: a })); },
  status_queimadura() { chiado(0.35, { vol: 0.25, corte: 4000 }); nota(200, 0.3, { tipo: 'sawtooth', vol: 0.08, ate: 600 }); },
  status_regeneracao() { [523, 659, 784].forEach((f, i) => nota(f, 0.25, { tipo: 'triangle', vol: 0.12, atraso: i * 0.08 })); },
  status_fraqueza() { nota(500, 0.4, { tipo: 'sawtooth', vol: 0.08, ate: 180 }); },
  status_casca() { chiado(0.08, { vol: 0.4, corte: 5000 }); chiado(0.08, { vol: 0.3, corte: 3000, atraso: 0.07 }); nota(220, 0.12, { tipo: 'square', vol: 0.08, ate: 110 }); },
  status_outro() { nota(600, 0.15, { tipo: 'triangle', vol: 0.12, ate: 400 }); nota(400, 0.15, { tipo: 'triangle', vol: 0.1, atraso: 0.1 }); },
  tick_veneno() { nota(250, 0.12, { vol: 0.12, ate: 400 }); nota(330, 0.1, { vol: 0.1, ate: 500, atraso: 0.08 }); },
  tick_queimadura() { chiado(0.2, { vol: 0.22, corte: 3500 }); },
  tick_regeneracao() { nota(880, 0.2, { tipo: 'triangle', vol: 0.1 }); },

  // Fora da batalha: pacotes e evolução
  pacote() { chiado(0.25, { vol: 0.25, corte: 2500 }); [523, 659, 784].forEach((f, i) => nota(f, 0.15, { tipo: 'triangle', vol: 0.15, atraso: 0.2 + i * 0.07 })); },
  pacoteNovo() { [784, 988, 1175, 1568].forEach((f, i) => nota(f, i === 3 ? 0.5 : 0.15, { tipo: 'triangle', vol: 0.18, atraso: 0.45 + i * 0.08 })); nota(2093, 0.4, { vol: 0.06, atraso: 0.75 }); },
  treino() { nota(660, 0.1, { tipo: 'triangle', vol: 0.14, ate: 990 }); },
  nivel() { [523, 659, 784, 1047].forEach((f, i) => nota(f, 0.14, { tipo: 'square', vol: 0.07, atraso: i * 0.07 })); },
  estrela() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => nota(f, i === 4 ? 0.7 : 0.16, { tipo: 'triangle', vol: 0.2, atraso: i * 0.09 }));
    [1568, 2093].forEach((f, i) => nota(f, 0.5, { vol: 0.06, atraso: 0.45 + i * 0.1 }));
  },
  equip() {
    nota(1800, 0.15, { tipo: 'square', vol: 0.05 }); nota(2400, 0.2, { tipo: 'triangle', vol: 0.08, atraso: 0.05 });
    nota(440, 0.3, { tipo: 'triangle', vol: 0.15, ate: 880, atraso: 0.12 });
  },

  // Ronda da Horta: palha da cesta mexendo e moedinhas caindo
  ronda() {
    chiado(0.18, { vol: 0.25, corte: 1800 }); chiado(0.14, { vol: 0.2, corte: 2400, atraso: 0.12 });
    [784, 988, 1175, 988, 1319].forEach((f, i) => nota(f, 0.1, { tipo: 'square', vol: 0.05, atraso: 0.3 + i * 0.08 }));
    nota(523, 0.45, { tipo: 'triangle', vol: 0.15, atraso: 0.3 });
  },

  vitoria() { [523, 659, 784, 1047].forEach((f, i) => nota(f, i === 3 ? 0.6 : 0.18, { tipo: 'triangle', vol: 0.22, atraso: i * 0.13 })); },
  derrota() { [392, 330, 262, 196].forEach((f, i) => nota(f, i === 3 ? 0.7 : 0.25, { tipo: 'triangle', vol: 0.2, atraso: i * 0.2 })); },
};

const INTERVALO = { tiro: 60, golpe: 50, critico: 80, cura: 80, escudo: 80, espinhos: 80, reflexo: 60 };

// Som de um efeito de status. Status novo sem som próprio usa um som genérico.
export function tocarStatus(nome, rodada = false) {
  const chave = `${rodada ? 'tick' : 'status'}_${nome}`;
  tocarSom(SONS[chave] ? chave : (rodada ? 'golpe' : 'status_outro'));
}

export function tocarEspecial(idPlanta) {
  const chave = `hab_${idPlanta}`;
  tocarSom(SONS[chave] ? chave : 'especial');
}

export function tocarSom(nome) {
  if (!SONS[nome] || !liberado(nome, INTERVALO[nome] || 30)) return;
  SONS[nome]();
}

// ---------- Músicas de fundo ----------
// Cada modo do jogo tem a sua música. Qual tela toca qual música fica em data/config.json (som.musicaPorTela).

const MUSICAS = {
  // Horta (menus, mapa, plantas...): calma, notas suaves.
  horta: {
    passo: 0.32,
    baixo: { notas: [131, 196, 175, 131, 147, 196, 165, 131], cada: 4, timbre: 'sine', vol: 0.3 },
    melodia: {
      timbre: 'triangle', vol: 0.11,
      notas: [659, 0, 784, 0, 880, 784, 659, 0, 587, 0, 659, 0, 523, 0, 0, 0,
        659, 0, 784, 0, 1047, 0, 880, 784, 659, 0, 587, 659, 523, 0, 0, 0],
    },
  },
  // Batalha: mais rápida e agitada.
  batalha: {
    passo: 0.22,
    baixo: { notas: [131, 131, 175, 175, 196, 196, 165, 165], cada: 4, timbre: 'triangle', vol: 0.3 },
    melodia: {
      timbre: 'square', vol: 0.05,
      notas: [523, 0, 659, 587, 523, 0, 440, 0, 587, 0, 698, 659, 587, 0, 494, 0,
        523, 0, 659, 784, 880, 0, 784, 659, 587, 523, 494, 0, 523, 0, 0, 0],
    },
  },
  // Desafios (torre, desafio do dia, treino): marchinha animada, de quem vai encarar.
  desafios: {
    passo: 0.26,
    baixo: { notas: [147, 220, 196, 147, 165, 220, 196, 147], cada: 4, timbre: 'triangle', vol: 0.28 },
    melodia: {
      timbre: 'triangle', vol: 0.1,
      notas: [587, 0, 587, 659, 740, 0, 659, 0, 587, 0, 494, 0, 440, 0, 0, 0,
        494, 0, 587, 0, 659, 740, 880, 0, 740, 659, 587, 0, 587, 0, 0, 0],
    },
  },
  // Invasão de Chefe: grave e ameaçadora, em tom menor.
  invasao: {
    passo: 0.24,
    baixo: { notas: [110, 110, 131, 123, 110, 110, 98, 104], cada: 4, timbre: 'sawtooth', vol: 0.16 },
    melodia: {
      timbre: 'square', vol: 0.045,
      notas: [440, 0, 523, 0, 494, 0, 440, 415, 440, 0, 0, 0, 330, 0, 0, 0,
        440, 0, 523, 587, 659, 0, 587, 523, 494, 0, 415, 0, 440, 0, 0, 0],
    },
  },
  // Arena: duelo animado, com baixo marchando e melodia de fanfarra.
  arena: {
    passo: 0.2,
    baixo: { notas: [165, 165, 247, 165, 196, 196, 294, 196], cada: 2, timbre: 'square', vol: 0.14 },
    melodia: {
      timbre: 'sawtooth', vol: 0.05,
      notas: [659, 0, 659, 784, 988, 0, 784, 0, 880, 0, 784, 659, 740, 0, 0, 0,
        659, 0, 784, 0, 988, 1175, 988, 0, 880, 784, 740, 0, 659, 0, 0, 0],
    },
  },
  // Feira: alegre e saltitante, de mercado.
  feira: {
    passo: 0.2,
    baixo: { notas: [175, 262, 220, 262, 196, 294, 233, 294], cada: 2, timbre: 'triangle', vol: 0.24 },
    melodia: {
      timbre: 'sine', vol: 0.12,
      notas: [698, 880, 1047, 0, 880, 0, 698, 0, 784, 932, 1175, 0, 932, 0, 784, 0,
        698, 0, 880, 0, 1047, 1175, 1047, 880, 784, 0, 659, 0, 698, 0, 0, 0],
    },
  },
  // Labirinto das Raízes: misteriosa, de passos curiosos e notas que pingam.
  labirinto: {
    passo: 0.28,
    baixo: { notas: [110, 131, 147, 131, 110, 123, 147, 165], cada: 4, timbre: 'triangle', vol: 0.22 },
    melodia: {
      timbre: 'sine', vol: 0.11,
      notas: [0, 587, 0, 0, 523, 0, 659, 0, 0, 494, 0, 0, 440, 0, 0, 0,
        0, 587, 0, 0, 659, 0, 784, 0, 0, 698, 0, 659, 587, 0, 0, 0],
    },
  },
  // Pesadelo: grave, lenta e sombria, em tom menor.
  pesadelo: {
    passo: 0.3,
    baixo: { notas: [98, 98, 104, 93, 98, 98, 87, 93], cada: 4, timbre: 'sawtooth', vol: 0.15 },
    melodia: {
      timbre: 'square', vol: 0.04,
      notas: [392, 0, 0, 370, 392, 0, 311, 0, 330, 0, 0, 0, 294, 0, 0, 0,
        392, 0, 466, 0, 440, 0, 392, 370, 349, 0, 311, 0, 294, 0, 0, 0],
    },
  },
  // Herbário: lenta e delicada, de folhear um álbum.
  herbario: {
    passo: 0.42,
    baixo: { notas: [196, 165, 175, 131], cada: 8, timbre: 'sine', vol: 0.26 },
    melodia: {
      timbre: 'sine', vol: 0.1,
      notas: [784, 0, 659, 0, 587, 0, 523, 0, 659, 0, 0, 0, 587, 0, 0, 0,
        698, 0, 587, 0, 523, 0, 494, 0, 523, 0, 0, 0, 0, 0, 0, 0],
    },
  },
};

let desejada = null; // música que deveria estar tocando (mesmo antes do primeiro toque na tela)

export function tocarMusica(nome) {
  desejada = MUSICAS[nome] ? nome : null;
  if (musica && musica.nome === desejada) return;
  pararMusica(false);
  if (!ac || !desejada) return;
  const m = MUSICAS[desejada];
  const saida = ac.createGain();
  saida.gain.value = cfg.volumeMusica;
  saida.connect(mestre);
  let i = 0;
  let proximo = ac.currentTime + 0.1;
  const id = setInterval(() => {
    while (proximo < ac.currentTime + 0.5) {
      const atraso = proximo - ac.currentTime;
      const b = m.baixo;
      if (i % b.cada === 0) nota(b.notas[(i / b.cada) % b.notas.length], m.passo * (b.cada - 0.5), { tipo: b.timbre, vol: b.vol, atraso, destino: saida });
      const f = m.melodia.notas[i % m.melodia.notas.length];
      if (f) nota(f, m.passo * 0.9, { tipo: m.melodia.timbre, vol: m.melodia.vol, atraso, destino: saida });
      i++;
      proximo += m.passo;
    }
  }, 120);
  musica = { nome: desejada, id, saida };
}

// Troca a música conforme a tela que abriu.
export function musicaDaTela(idTela) {
  const mapa = cfg.musicaPorTela || {};
  tocarMusica(idTela in mapa ? mapa[idTela] : cfg.musicaPadrao);
}

export function comecarMusica() { tocarMusica('batalha'); }

// esquecer = true: não volta a tocar sozinha depois do primeiro toque na tela.
export function pararMusica(esquecer = true) {
  if (esquecer) desejada = null;
  if (!musica) return;
  clearInterval(musica.id);
  musica.saida.gain.setTargetAtTime(0, ac.currentTime, 0.1);
  const s = musica.saida;
  setTimeout(() => s.disconnect(), 800);
  musica = null;
}

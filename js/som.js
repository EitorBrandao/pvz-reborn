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
  lento() { nota(300, 0.35, { tipo: 'triangle', vol: 0.15, ate: 150 }); },
  espinhos() { nota(1500, 0.06, { tipo: 'square', vol: 0.05 }); nota(1700, 0.06, { tipo: 'square', vol: 0.05, atraso: 0.05 }); },
  reflexo() { nota(900, 0.1, { tipo: 'square', vol: 0.06, ate: 600 }); },
  vitoria() { [523, 659, 784, 1047].forEach((f, i) => nota(f, i === 3 ? 0.6 : 0.18, { tipo: 'triangle', vol: 0.22, atraso: i * 0.13 })); },
  derrota() { [392, 330, 262, 196].forEach((f, i) => nota(f, i === 3 ? 0.7 : 0.25, { tipo: 'triangle', vol: 0.2, atraso: i * 0.2 })); },
};

const INTERVALO = { tiro: 60, golpe: 50, critico: 80, cura: 80, escudo: 80, espinhos: 80, reflexo: 60 };

export function tocarSom(nome) {
  if (!SONS[nome] || !liberado(nome, INTERVALO[nome] || 30)) return;
  SONS[nome]();
}

// ---------- Música de fundo (um laço curto e calmo) ----------

const BAIXO = [131, 131, 175, 175, 196, 196, 165, 165];
const MELODIA = [523, 0, 659, 587, 523, 0, 440, 0, 587, 0, 698, 659, 587, 0, 494, 0,
  523, 0, 659, 784, 880, 0, 784, 659, 587, 523, 494, 0, 523, 0, 0, 0];

export function comecarMusica() {
  if (!ac || musica) return;
  const saida = ac.createGain();
  saida.gain.value = cfg.volumeMusica;
  saida.connect(mestre);
  const passo = 0.22;
  let i = 0;
  let proximo = ac.currentTime + 0.1;
  const id = setInterval(() => {
    while (proximo < ac.currentTime + 0.5) {
      const atraso = proximo - ac.currentTime;
      if (i % 4 === 0) nota(BAIXO[(i / 4) % BAIXO.length], passo * 3.5, { tipo: 'triangle', vol: 0.3, atraso, destino: saida });
      const f = MELODIA[i % MELODIA.length];
      if (f) nota(f, passo * 0.9, { tipo: 'square', vol: 0.05, atraso, destino: saida });
      i++;
      proximo += passo;
    }
  }, 120);
  musica = { id, saida };
}

export function pararMusica() {
  if (!musica) return;
  clearInterval(musica.id);
  musica.saida.gain.setTargetAtTime(0, ac.currentTime, 0.1);
  const s = musica.saida;
  setTimeout(() => s.disconnect(), 800);
  musica = null;
}

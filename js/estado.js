// Todo o estado do jogo mora aqui. Só este arquivo fala com o save.

import * as save from './save.js';

let config = null;
export let estado = null;

export function iniciar(cfg) {
  config = cfg;
  // Completa saves antigos com os campos novos (ex.: quem jogou a versão 0.1)
  estado = Object.assign(novoEstado(), save.carregar() || {});
  salvarAgora();
  setInterval(salvarAgora, config.save.intervaloSegundos * 1000);
  // Salva também quando o jogador sai do app ou troca de aba
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') salvarAgora();
  });
  window.addEventListener('pagehide', salvarAgora);
  return estado;
}

export function novoEstado() {
  return {
    jogo: 'horta-selvagem',
    versao: save.VERSAO_SAVE,
    criadoEm: Date.now(),
    ultimaSessao: Date.now(),
    moedas: config.inicio.moedas,
    orvalho: config.inicio.orvalho,
    nivel: config.inicio.nivel,
    broto: { regas: 0 },
    time: structuredClone(config.timeInicial),
    inventario: {},
    vencidas: [],
    velocidadeBatalha: 1,
  };
}

export function salvarAgora() {
  return save.salvar(estado);
}

export function substituir(novo) {
  estado = Object.assign(novoEstado(), novo);
  salvarAgora();
}

export function recomecar() {
  save.apagar();
  estado = novoEstado();
  salvarAgora();
}

// Rega o broto. Devolve as moedas ganhas se ele mudou de estágio.
export function regarBroto() {
  estado.broto.regas += 1;
  const porEstagio = config.broto.regasPorEstagio;
  const ganhou = estado.broto.regas % porEstagio === 0 ? config.broto.moedasPorEstagio : 0;
  estado.moedas += ganhou;
  salvarAgora();
  return ganhou;
}

export function estagioBroto() {
  const { regasPorEstagio, estagios } = config.broto;
  const indice = Math.floor(estado.broto.regas / regasPorEstagio) % estagios.length;
  const progresso = (estado.broto.regas % regasPorEstagio) / regasPorEstagio;
  return { emoji: estagios[indice], progresso };
}

export function definirTime(time) {
  estado.time = time;
  salvarAgora();
}

export function definirVelocidade(v) {
  estado.velocidadeBatalha = v;
  salvarAgora();
}

export function registrarVitoria(idBatalha, moedas, cartas) {
  estado.moedas += moedas;
  for (const c of cartas) estado.inventario[c] = (estado.inventario[c] || 0) + 1;
  if (!estado.vencidas.includes(idBatalha)) estado.vencidas.push(idBatalha);
  salvarAgora();
}

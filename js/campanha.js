// Regras da campanha: quais mapas e fases estão liberados, próxima fase, estrelas.

// Marca em cada fase de qual mapa ela é e a posição dela (facilita o resto do código).
export function prepararCampanha(campanha) {
  campanha.mapas.forEach((mapa, mi) => {
    mapa.fases.forEach((fase, i) => {
      fase.mapa = mapa.id;
      fase.mapaIndice = mi;
      fase.indice = i;
    });
  });
  return campanha;
}

export function concluida(estado, idFase) {
  return estado.vencidas.includes(idFase);
}

export function mapaLiberado(campanha, estado, indiceMapa) {
  if (indiceMapa === 0) return true;
  const anterior = campanha.mapas[indiceMapa - 1];
  return concluida(estado, anterior.fases[anterior.fases.length - 1].id);
}

export function faseLiberada(campanha, estado, fase) {
  if (!mapaLiberado(campanha, estado, fase.mapaIndice)) return false;
  if (fase.indice === 0) return true;
  return concluida(estado, campanha.mapas[fase.mapaIndice].fases[fase.indice - 1].id);
}

export function proximaFase(campanha, fase) {
  const mapa = campanha.mapas[fase.mapaIndice];
  if (fase.indice + 1 < mapa.fases.length) return mapa.fases[fase.indice + 1];
  const proximoMapa = campanha.mapas[fase.mapaIndice + 1];
  return proximoMapa ? proximoMapa.fases[0] : null;
}

// A primeira fase ainda não vencida (onde o jogador "está")
export function faseAtual(campanha, estado, indiceMapa) {
  const fases = campanha.mapas[indiceMapa].fases;
  return fases.find((f) => !concluida(estado, f.id)) || fases[fases.length - 1];
}

// 3 estrelas: ninguém morreu. 2: metade ou mais sobreviveu. 1: venceu.
export function calcularEstrelas(vivas, total, cfg) {
  const proporcao = total ? vivas / total : 0;
  if (proporcao >= cfg.tres) return 3;
  if (proporcao >= cfg.duas) return 2;
  return 1;
}

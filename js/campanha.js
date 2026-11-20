// Regras da campanha: quais mapas e fases estão liberados, próxima fase, estrelas.

// Marca em cada fase de qual mapa ela é e a posição dela (facilita o resto do código).
export function prepararCampanha(campanha, pesadelo) {
  campanha.mapas.forEach((mapa, mi) => {
    mapa.fases.forEach((fase, i) => {
      fase.mapa = mapa.id;
      fase.mapaIndice = mi;
      fase.indice = i;
    });
    if (pesadelo) mapa.pesadelo = { fases: mapa.fases.map((f) => fasePesadelo(f, mi, pesadelo)) };
  });
  return campanha;
}

// Versão Pesadelo de uma fase: mesmas pragas, nível bem maior, pragas mais fortes, prêmio melhor.
// Os números ficam em data/pesadelo.json.
function fasePesadelo(fase, mapaIndice, cfg) {
  const r = fase.recompensa;
  const premio = {
    moedas: Math.round((r.moedas || 0) * cfg.recompensa.moedas),
    xp: Math.round((r.xp || 0) * cfg.recompensa.xp),
  };
  premio.orvalho = Math.ceil((r.orvalho || 0) * cfg.recompensa.orvalhoMult) + cfg.recompensa.orvalhoExtra;
  return {
    ...structuredClone(fase),
    id: `${fase.id}-p`,
    nome: `${fase.nome} (Pesadelo)`,
    pesadelo: true,
    nivel: cfg.nivelBase + cfg.nivelPorMapa * mapaIndice + fase.indice,
    folego: fase.folego * cfg.folegoMult,
    multPragas: { ...cfg.mult },
    recompensa: premio,
    cartas: fase.cartas.map((c) => ({ ...c, chance: Math.min(1, Math.round(c.chance * cfg.chanceCartaMult * 100) / 100) })),
  };
}

// O Pesadelo de um mapa abre quando todas as fases dele estão com 3 estrelas.
export function pesadeloLiberado(campanha, estado, indiceMapa, cfg) {
  return campanha.mapas[indiceMapa].fases.every((f) => (estado.estrelasFases[f.id] || 0) >= cfg.estrelasParaAbrir);
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
  if (fase.pesadelo) {
    if (fase.indice === 0) return true;
    return concluida(estado, campanha.mapas[fase.mapaIndice].pesadelo.fases[fase.indice - 1].id);
  }
  if (!mapaLiberado(campanha, estado, fase.mapaIndice)) return false;
  if (fase.indice === 0) return true;
  return concluida(estado, campanha.mapas[fase.mapaIndice].fases[fase.indice - 1].id);
}

export function proximaFase(campanha, fase) {
  if (fase.pesadelo) return campanha.mapas[fase.mapaIndice].pesadelo.fases[fase.indice + 1] || null;
  const mapa = campanha.mapas[fase.mapaIndice];
  if (fase.indice + 1 < mapa.fases.length) return mapa.fases[fase.indice + 1];
  const proximoMapa = campanha.mapas[fase.mapaIndice + 1];
  return proximoMapa ? proximoMapa.fases[0] : null;
}

// A primeira fase ainda não vencida (onde o jogador "está")
export function faseAtual(campanha, estado, indiceMapa, pesadelo = false) {
  const m = campanha.mapas[indiceMapa];
  const fases = pesadelo ? m.pesadelo.fases : m.fases;
  return fases.find((f) => !concluida(estado, f.id)) || fases[fases.length - 1];
}

// 3 estrelas: ninguém morreu. 2: metade ou mais sobreviveu. 1: venceu.
export function calcularEstrelas(vivas, total, cfg) {
  const proporcao = total ? vivas / total : 0;
  if (proporcao >= cfg.tres) return 3;
  if (proporcao >= cfg.duas) return 2;
  return 1;
}

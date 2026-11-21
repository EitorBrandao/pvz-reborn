import { nivelMaximo } from './evolucao.js';

// Regras da Fusão: duas plantas 5★ e ascendidas viram uma planta híbrida nova.
// Só confere requisitos e monta o registro novo. Quem salva é o estado.js. Números em data/fusoes.json.

export function receitaDe(dados, idHibrida) {
  return dados.fusoes.receitas.find((r) => r.id === idHibrida) || null;
}

// Situação de uma receita: quem já tem, o que falta e se dá pra fundir agora.
export function situacaoFusao(receita, dados, estado) {
  const c = dados.fusoes;
  const pais = [receita.a, receita.b].map((id) => {
    const r = estado.colecao[id];
    const p = dados.plantas.find((x) => x.id === id);
    return {
      id, emoji: p.emoji, nome: p.nome, tem: !!r,
      estrelasOk: !!r && r.estrelas >= c.estrelasMin,
      rankOk: !!r && (r.ascensao || 0) >= c.rankMin,
    };
  });
  const cartas = Object.entries(c.custo.cartas).map(([id, qtd]) => ({ id, qtd, tem: estado.inventario[id] || 0 }));
  const custoOk = estado.moedas >= c.custo.moedas && estado.orvalho >= c.custo.orvalho && cartas.every((x) => x.tem >= x.qtd);
  const fundida = !!estado.colecao[receita.id];
  const paisOk = pais.every((p) => p.estrelasOk && p.rankOk);
  return { pais, cartas, custoOk, paisOk, fundida, pronta: !fundida && paisOk && custoOk };
}

// A híbrida nasce com 5★, o maior nível e o maior rank entre as duas plantas.
export function registroHibrida(receita, estado, dados) {
  const pais = [receita.a, receita.b].map((id) => estado.colecao[id]);
  const rank = Math.max(...pais.map((r) => r.ascensao || 0));
  const teto = nivelMaximo(dados.fusoes.estrelasMin, dados.config.evolucao, rank);
  const nivel = Math.min(teto, Math.max(...pais.map((r) => r.nivel || 1)));
  return {
    nivel, xp: 0, estrelas: dados.fusoes.estrelasMin, ascensao: rank, fusao: 1,
    talentos: {}, copias: 0, equip: { vaso: 0, adubo: 0, regador: 0 },
  };
}

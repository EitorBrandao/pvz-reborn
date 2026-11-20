// Pequenas ajudas usadas por todas as telas.
import * as som from '../som.js';

export const $ = (id) => document.getElementById(id);

export function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
  som.musicaDaTela(id);
}

let timerAviso;
export function avisar(texto) {
  const aviso = $('aviso');
  aviso.textContent = texto;
  aviso.classList.add('mostra');
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => aviso.classList.remove('mostra'), 2200);
}

export function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

// Troca {nome} no texto pelos valores dados
export function preencher(texto, valores) {
  return texto.replace(/\{(\w+)\}/g, (_, chave) => (chave in valores ? valores[chave] : `{${chave}}`));
}

// Selos de evolução da planta (Ascensão e, no futuro, Fusão), usados em todo cartão de planta.
// Pra ligar a Fusão: guardar o nível no registro (registro.fusao) e criar "fusao" em data/ascensao.json.
export function selosPlanta(registro, dados) {
  const rank = registro.ascensao || 0;
  const fusao = registro.fusao || 0;
  const selos = [];
  if (rank) selos.push(`<span class="selo selo-asc rank-${rank}" title="Ascensão rank ${rank}">${dados.ascensao.selos[rank]} Rank ${rank}</span>`);
  if (fusao) selos.push(`<span class="selo selo-fusao" title="Fusão">🧬 ${fusao}</span>`);
  return {
    html: selos.length ? `<span class="selos">${selos.join('')}</span>` : '',
    classe: (rank ? ` ascendida rank-${rank}` : '') + (fusao ? ' fundida' : ''),
    marca: (rank ? `<i class="marca-rank">${rank}✦</i>` : '') + (fusao ? '<i class="marca-fusao">🧬</i>' : ''),
  };
}

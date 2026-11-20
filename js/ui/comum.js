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

// Texto da habilidade (já com status e plural), igual na ficha da planta e na escolha do time.
export function textoHabilidade(hab, dados) {
  const t = dados.textos;
  const a = hab.aplica;
  const st = a && t.status[a.status];
  const status = st ? ' ' + preencher(st.texto, { valor: Math.round(a.valor * 100), turnos: a.turnos }) : '';
  const n = hab.tipo === 'cura' ? hab.alvos : hab.tipo === 'sono' ? hab.turnos : 1;
  const chave = n > 1 && t.habilidades[`${hab.tipo}_varios`] ? `${hab.tipo}_varios` : hab.tipo;
  return preencher(t.habilidades[chave] || '', {
    reflete: Math.round((hab.reflete || 0) * 100), turnos: hab.turnos, golpes: hab.golpes,
    reducao: Math.round((hab.reducao || 0) * 100), forca: Math.round((hab.mult || 0) * 100),
    alvos: hab.alvos || 1, seiva: hab.seiva,
    pctVida: Math.round((hab.pctVida || 0) * 100), limite: Math.round((hab.limite || 0) * 100),
    bonus: Math.round((hab.mult || 0) * (hab.bonus || 0) * 100),
  }) + status;
}

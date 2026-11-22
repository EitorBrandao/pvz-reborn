// Pequenas ajudas usadas por todas as telas.
import * as som from '../som.js';

export const $ = (id) => document.getElementById(id);

// Número curto: até 9.999 normal; 10.0k a 999.9k; 1.0M pra cima.
export function curto(n) {
  n = Math.round(Number(n) || 0);
  const a = Math.abs(n);
  if (a < 10000) return n.toLocaleString('pt-BR');
  if (a < 999950) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1000000).toFixed(1)}M`;
}

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

// Cartas ganhas, agrupadas: cada carta aparece uma vez, com a quantidade embaixo (×3).
// Usado nos resumos que juntam muitas vitórias (Seu Tonico, Ronda), pra janela não precisar rolar.
export function mostrarCartasAgrupadas(area, ids, dados) {
  const qtd = new Map();
  for (const id of ids) qtd.set(id, (qtd.get(id) || 0) + 1);
  area.innerHTML = '';
  [...qtd].forEach(([id, n], i) => {
    const c = dados.cartas.find((x) => x.id === id);
    if (!c) return;
    const div = document.createElement('div');
    div.className = `carta carta-grupo ${c.raridade}`;
    div.style.animationDelay = `${0.2 + i * 0.15}s`;
    div.innerHTML = `<span>${c.emoji}</span><small>${c.nome}</small><b class="carta-qtd">×${n}</b>`;
    area.appendChild(div);
  });
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
  const extra = ['coluna', 'seiva', 'perfura', 'atordoa', 'area'].find((x) => hab[x] && t.habilidades[`${hab.tipo}_${x}`]);
  const chave = extra ? `${hab.tipo}_${extra}` : n > 1 && t.habilidades[`${hab.tipo}_varios`] ? `${hab.tipo}_varios` : hab.tipo;
  return preencher(t.habilidades[chave] || '', {
    reflete: Math.round((hab.reflete || 0) * 100), turnos: hab.turnos, golpes: hab.golpes,
    reducao: Math.round((hab.reducao || 0) * 100), forca: Math.round((hab.mult || 0) * 100),
    alvos: hab.alvos || 1, seiva: Math.round((hab.seiva || 0) * (hab.pote || 1)),
    pctVida: Math.round((hab.pctVida || 0) * 100), limite: Math.round((hab.limite || 0) * 100),
    bonus: Math.round((hab.mult || 0) * (hab.bonus || 0) * 100),
  }) + status;
}

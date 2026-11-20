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

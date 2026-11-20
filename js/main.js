// Ponto de partida do jogo: carrega dados, liga botões e troca de telas.

import * as jogo from './estado.js';
import * as save from './save.js';

const $ = (id) => document.getElementById(id);
let config, textos;

async function lerJson(caminho) {
  const resposta = await fetch(caminho);
  return resposta.json();
}

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
}

let timerAviso;
function avisar(texto) {
  const aviso = $('aviso');
  aviso.textContent = texto;
  aviso.classList.add('mostra');
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => aviso.classList.remove('mostra'), 2200);
}

function sortear(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function atualizarTela() {
  const e = jogo.estado;
  $('hud-moedas').textContent = e.moedas;
  $('hud-orvalho').textContent = e.orvalho;
  $('hud-nivel').textContent = e.nivel;
  const broto = jogo.estagioBroto();
  $('broto-emoji').textContent = broto.emoji;
  $('broto-barra').style.width = `${broto.progresso * 100}%`;
  $('broto-regas').textContent = e.broto.regas;
  const data = new Date(e.ultimaSessao).toLocaleString('pt-BR');
  $('info-save').textContent = `Último save: ${data}`;
}

function ligarBotoes() {
  $('btn-jogar').addEventListener('click', () => {
    $('saudacao').textContent = sortear(textos.saudacoes);
    atualizarTela();
    mostrarTela('tela-base');
  });

  $('broto').addEventListener('click', () => {
    const ganhou = jogo.regarBroto();
    const broto = $('broto');
    broto.classList.remove('regou');
    void broto.offsetWidth; // reinicia a animação
    broto.classList.add('regou');
    if (ganhou) avisar(textos.brotoCresceu.replace('{moedas}', ganhou));
    atualizarTela();
  });

  document.querySelectorAll('[data-breve]').forEach((botao) => {
    botao.addEventListener('click', () => avisar(textos.emBreve.replace('{nome}', botao.dataset.breve)));
  });

  $('btn-opcoes').addEventListener('click', () => { atualizarTela(); mostrarTela('tela-opcoes'); });
  $('btn-voltar').addEventListener('click', () => { atualizarTela(); mostrarTela('tela-base'); });

  $('btn-exportar').addEventListener('click', () => {
    jogo.salvarAgora();
    save.exportar(jogo.estado);
    avisar(textos.saveExportado);
  });

  $('btn-importar').addEventListener('click', () => $('arquivo-importar').click());
  $('arquivo-importar').addEventListener('change', async (evento) => {
    const arquivo = evento.target.files[0];
    evento.target.value = '';
    if (!arquivo) return;
    const dados = await save.importar(arquivo);
    if (!dados) return avisar(textos.saveInvalido);
    jogo.substituir(dados);
    atualizarTela();
    avisar(textos.saveImportado);
  });

  $('btn-apagar').addEventListener('click', () => {
    if (!confirm(textos.confirmarApagar)) return;
    jogo.recomecar();
    atualizarTela();
    avisar(textos.apagado);
  });
}

// Botão "Instalar no celular" (Chrome/Android). No iPhone: Compartilhar > Adicionar à Tela de Início.
function prepararInstalacao() {
  let pedido = null;
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    pedido = evento;
    $('btn-instalar').classList.remove('escondido');
  });
  $('btn-instalar').addEventListener('click', async () => {
    if (!pedido) return;
    pedido.prompt();
    await pedido.userChoice;
    pedido = null;
    $('btn-instalar').classList.add('escondido');
  });
  window.addEventListener('appinstalled', () => $('btn-instalar').classList.add('escondido'));
}

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch((erro) => {
      console.warn('Service worker não registrou:', erro);
    });
  }
}

async function comecar() {
  [config, textos] = await Promise.all([lerJson('data/config.json'), lerJson('data/mensagens.json')]);
  jogo.iniciar(config);
  save.pedirArmazenamentoPersistente();
  $('versao').textContent = `versão ${config.versaoJogo}`;
  ligarBotoes();
  prepararInstalacao();
  registrarServiceWorker();
  atualizarTela();
}

comecar();

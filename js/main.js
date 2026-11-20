// Ponto de partida do jogo: carrega dados, liga botões e troca de telas.

import * as jogo from './estado.js';
import * as save from './save.js';
import { $, mostrarTela, avisar, sortear, preencher } from './ui/comum.js';
import { iniciarTelaTime, abrirTelaTime } from './ui/tela-time.js';
import { iniciarTelaBatalha, comecarBatalha } from './ui/tela-batalha.js';
import { iniciarTelaPlantas, abrirTelaPlantas } from './ui/tela-plantas.js';

let dados;

async function lerJson(caminho) {
  const resposta = await fetch(caminho);
  return resposta.json();
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

function irParaBase() {
  atualizarTela();
  mostrarTela('tela-base');
}

function ligarBotoes() {
  const { textos } = dados;

  $('btn-jogar').addEventListener('click', () => {
    $('saudacao').textContent = sortear(textos.saudacoes);
    irParaBase();
  });

  $('broto').addEventListener('click', () => {
    const ganhou = jogo.regarBroto();
    const broto = $('broto');
    broto.classList.remove('regou');
    void broto.offsetWidth; // reinicia a animação
    broto.classList.add('regou');
    if (ganhou) avisar(preencher(textos.brotoCresceu, { moedas: ganhou }));
    atualizarTela();
  });

  $('btn-batalha').addEventListener('click', abrirTelaTime);
  $('btn-plantas').addEventListener('click', abrirTelaPlantas);

  document.querySelectorAll('[data-breve]').forEach((botao) => {
    botao.addEventListener('click', () => avisar(preencher(textos.emBreve, { nome: botao.dataset.breve })));
  });

  $('btn-opcoes').addEventListener('click', () => { atualizarTela(); mostrarTela('tela-opcoes'); });
  $('btn-voltar').addEventListener('click', irParaBase);

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
    const novo = await save.importar(arquivo);
    if (!novo) return avisar(textos.saveInvalido);
    jogo.substituir(novo);
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

// Procura atualização ao abrir o app e sempre que ele volta pra tela.
// Se tiver versão nova: na tela inicial recarrega sozinho; no meio do jogo mostra um aviso.
async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const jaTinhaVersao = !!navigator.serviceWorker.controller;
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!jaTinhaVersao || recarregando) return;
    if ($('tela-inicio').classList.contains('ativa')) {
      recarregando = true;
      jogo.salvarAgora();
      location.reload();
    } else {
      $('aviso-atualizacao').classList.remove('escondido');
    }
  });
  $('aviso-atualizacao').addEventListener('click', () => {
    jogo.salvarAgora();
    location.reload();
  });
  try {
    const registro = await navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' });
    registro.update();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registro.update();
    });
  } catch (erro) {
    console.warn('Service worker não registrou:', erro);
  }
}

// Avisa quando o jogo foi atualizado desde a última vez
function avisarVersaoNova(config) {
  const anterior = jogo.estado.versaoVista;
  jogo.estado.versaoVista = config.versaoJogo;
  jogo.salvarAgora();
  if (anterior && anterior !== config.versaoJogo) {
    avisar(preencher(dados.textos.atualizado, { versao: config.versaoJogo }));
  }
}

async function comecar() {
  const [config, textos, plantas, pragas, cartas, batalhas, equipamentos] = await Promise.all([
    lerJson('data/config.json'),
    lerJson('data/mensagens.json'),
    lerJson('data/plantas.json'),
    lerJson('data/pragas.json'),
    lerJson('data/cartas.json'),
    lerJson('data/batalhas.json'),
    lerJson('data/equipamentos.json'),
  ]);
  dados = { config, textos, plantas, pragas, cartas, batalhas, equipamentos };

  jogo.iniciar(dados);
  save.pedirArmazenamentoPersistente();
  $('versao').textContent = `versão ${config.versaoJogo}`;

  ligarBotoes();
  iniciarTelaTime(dados, { lutar: comecarBatalha, voltar: irParaBase });
  iniciarTelaBatalha(dados, abrirTelaTime);
  iniciarTelaPlantas(dados, irParaBase);
  prepararInstalacao();
  registrarServiceWorker();
  avisarVersaoNova(config);
  atualizarTela();
}

comecar();

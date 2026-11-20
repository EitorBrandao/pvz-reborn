// Ponto de partida do jogo: carrega dados, liga botões e troca de telas.

import * as jogo from './estado.js';
import * as save from './save.js';
import { $, mostrarTela, avisar, sortear, preencher } from './ui/comum.js';
import { iniciarTelaTime, abrirTelaTime } from './ui/tela-time.js';
import { iniciarTelaBatalha, comecarBatalha } from './ui/tela-batalha.js';
import { iniciarTelaPlantas, abrirTelaPlantas } from './ui/tela-plantas.js';
import { iniciarTelaMapa, abrirTelaMapa } from './ui/tela-mapa.js';
import { iniciarMissoes, desenharMissoes } from './ui/painel-missoes.js';
import { iniciarRotina, desenharRotina, mostrarPresenca } from './ui/painel-rotina.js';
import { iniciarTelaAtividades, abrirTelaAtividades } from './ui/tela-atividades.js';
import { prepararCampanha, proximaFase, faseLiberada } from './campanha.js';
import { gerarAndar, checarTime } from './atividades.js';

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
  const xp = jogo.xpJogadorInfo();
  $('hud-xp').style.width = `${(xp.xp / xp.precisa) * 100}%`;
  atualizarFolego();
  desenharMissoes();
  desenharRotina();
  const broto = jogo.estagioBroto();
  $('broto-emoji').textContent = broto.emoji;
  $('broto-barra').style.width = `${broto.progresso * 100}%`;
  $('broto-regas').textContent = e.broto.regas;
  const data = new Date(e.ultimaSessao).toLocaleString('pt-BR');
  $('info-save').textContent = `Último save: ${data}`;
}

// Fôlego em todas as telas que mostram (atualiza a cada segundo)
function atualizarFolego() {
  const f = jogo.folego();
  const tempo = f.falta ? formatarTempo(f.falta) : '';
  document.querySelectorAll('.folego-valor').forEach((el) => { el.textContent = `${f.valor}/${f.max}`; });
  document.querySelectorAll('.folego-tempo').forEach((el) => { el.textContent = tempo; });
}

function formatarTempo(ms) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function pedirRecarga() {
  const { textos, config } = dados;
  if (jogo.folego().valor >= config.folego.max) return avisar(textos.folegoCheio);
  if (!confirm(preencher(textos.confirmarRecarga, { custo: config.folego.recargaOrvalho }))) return;
  const res = jogo.recarregarFolego();
  avisar(res.ok ? textos.folegoRecarregado : textos[res.erro]);
  atualizarTela();
}

// Toda batalha passa por aqui: confere as regras do time e gasta o fôlego antes de lutar
function lutar(fase) {
  const problema = checarTime(fase, jogo.estado.time, dados);
  if (problema) return avisar(preencher(dados.textos[problema.erro], problema));
  if (!jogo.gastarFolego(fase.folego)) {
    const { textos, config } = dados;
    return avisar(preencher(textos.semFolego, { tempo: formatarTempo(jogo.folego().falta), custo: config.folego.recargaOrvalho }));
  }
  atualizarFolego();
  comecarBatalha(fase);
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
    mostrarPresenca();
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

  $('btn-campanha').addEventListener('click', () => abrirTelaMapa());
  document.querySelectorAll('.botao-folego').forEach((b) => b.addEventListener('click', pedirRecarga));
  $('btn-plantas').addEventListener('click', abrirTelaPlantas);
  $('btn-atividades').addEventListener('click', abrirTelaAtividades);

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

// Lista de novidades na tela de Opções (mais nova primeiro, só a atual aberta)
function desenharChangelog(lista) {
  const caixa = $('changelog');
  caixa.innerHTML = '';
  lista.forEach((v, i) => {
    const bloco = document.createElement('details');
    bloco.open = i === 0;
    const titulo = document.createElement('summary');
    titulo.textContent = `Versão ${v.versao}`;
    const itens = document.createElement('ul');
    v.itens.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      itens.appendChild(li);
    });
    bloco.append(titulo, itens);
    caixa.appendChild(bloco);
  });
}

async function comecar() {
  const [config, textos, plantas, pragas, cartas, campanha, equipamentos, missoes, faccoes, atividades, changelog, rotina] = await Promise.all([
    lerJson('data/config.json'),
    lerJson('data/mensagens.json'),
    lerJson('data/plantas.json'),
    lerJson('data/pragas.json'),
    lerJson('data/cartas.json'),
    lerJson('data/campanha.json'),
    lerJson('data/equipamentos.json'),
    lerJson('data/missoes.json'),
    lerJson('data/faccoes.json'),
    lerJson('data/atividades.json'),
    lerJson('data/changelog.json'),
    lerJson('data/rotina.json'),
  ]);
  dados = { config, textos, plantas, pragas, cartas, campanha: prepararCampanha(campanha), equipamentos, missoes, faccoes, atividades, rotina };

  jogo.iniciar(dados);
  save.pedirArmazenamentoPersistente();
  $('versao').textContent = `versão ${config.versaoJogo}`;
  desenharChangelog(changelog);

  ligarBotoes();
  // Voltar de uma batalha: atividades voltam pra tela de Desafios, a campanha pro mapa
  const mapaDaFase = (fase) => (fase && fase.tipo ? abrirTelaAtividades() : abrirTelaMapa(fase ? fase.mapaIndice : undefined));
  iniciarTelaMapa(dados, { voltar: irParaBase, preparar: abrirTelaTime });
  iniciarTelaAtividades(dados, { voltar: irParaBase, preparar: abrirTelaTime });
  iniciarTelaTime(dados, { lutar, voltar: mapaDaFase });
  iniciarTelaBatalha(dados, {
    lutar,
    sair: mapaDaFase,
    proxima: (fase) => {
      if (fase.tipo === 'torre') return fase.andar < jogo.estado.torre.andar ? gerarAndar(jogo.estado.torre.andar, dados) : null;
      if (fase.tipo) return null;
      const p = proximaFase(dados.campanha, fase);
      return p && faseLiberada(dados.campanha, jogo.estado, p) ? p : null;
    },
    prepararProxima: abrirTelaTime,
  });
  iniciarTelaPlantas(dados, irParaBase);
  iniciarMissoes(dados, atualizarTela);
  iniciarRotina(dados, atualizarTela);
  setInterval(atualizarFolego, 1000);
  prepararInstalacao();
  registrarServiceWorker();
  avisarVersaoNova(config);
  atualizarTela();
}

comecar();

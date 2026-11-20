// Regras da batalha automática. Não desenha nada: só calcula o que acontece
// e devolve uma lista de eventos pra tela animar.

import { atributos, bonusTalentos, registroNovo, habilidadeComEstrelas, poder } from './evolucao.js';

// Gerador de números aleatórios com semente (mesma semente = mesma batalha).
export function criarRng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function montarUnidade(base, lado, col, linha, nivel, uid, cfg) {
  const f = 1 + cfg.crescimentoPorNivel * (nivel - 1);
  const vida = Math.round(base.vida * f);
  return {
    uid, id: base.id, nome: base.nome, emoji: base.emoji, projetil: base.projetil,
    habilidade: base.habilidade, chefe: !!base.chefe,
    faccao: base.faccao || null, categoria: base.categoria || null, forteContra: null, vantagem: 0,
    lado, col, linha, nivel,
    vidaMax: vida, vida,
    atq: Math.round(base.atq * f), def: Math.round(base.def * f), vel: base.vel,
    seiva: 0, escudo: 0, escudoTurnos: 0, reflete: 0, refleteTurnos: 0,
    sono: 0, lento: 0, lentoTurnos: 0,
    status: {}, // efeitos de status: { veneno: { valor, turnos }, ... }
  };
}

// Bônus de time: quantas plantas de cada facção e quanto cada uma ganha.
export function bonusFaccoes(time, dados) {
  const fx = dados.faccoes;
  const contagem = {};
  for (const m of time) {
    const p = dados.plantas.find((x) => x.id === m.planta);
    if (p && p.faccao) contagem[p.faccao] = (contagem[p.faccao] || 0) + 1;
  }
  return fx.faccoes
    .filter((f) => fx.bonusTime[contagem[f.id]])
    .map((f) => ({ faccao: f, qtd: contagem[f.id], bonus: fx.bonusTime[contagem[f.id]] }));
}

// Quem cada unidade vence: plantas batem forte numa categoria de praga, pragas numa facção.
function marcarVantagem(u, dados) {
  const fx = dados.faccoes;
  if (!fx) return;
  if (u.faccao) {
    u.forteContra = fx.faccoes.find((f) => f.id === u.faccao)?.forteContra || null;
    u.vantagem = fx.vantagemPlanta;
  } else if (u.categoria) {
    u.forteContra = fx.categorias.find((c) => c.id === u.categoria)?.forteContra || null;
    u.vantagem = fx.vantagemPraga;
  }
}

// Monta as unidades dos dois lados a partir do time do jogador e da batalha escolhida.
// "colecao" traz nível, estrelas e equipamentos de cada planta.
export function prepararBatalha(batalha, time, dados, colecao = {}) {
  const cfg = dados.config.batalha;
  const unidades = [];
  let n = 0;
  for (const m of time) {
    const base = dados.plantas.find((p) => p.id === m.planta);
    if (!base) continue;
    const registro = colecao[m.planta] || registroNovo();
    const u = montarUnidade(base, 'planta', m.col, m.linha, registro.nivel, `u${n++}`, cfg);
    u.rank = registro.ascensao || 0;
    u.fusao = registro.fusao || 0;
    const stats = atributos(base, registro, dados);
    Object.assign(u, stats, {
      vidaMax: stats.vida, estrelas: registro.estrelas,
      habilidade: habilidadeComEstrelas(base.habilidade, registro.estrelas),
    });
    // Talentos: crítico, força da habilidade e seiva
    const tal = bonusTalentos(registro, dados, base);
    u.bonusCritico = tal.critico;
    u.bonusCritDano = tal.critDano;
    u.bonusSeivaTurno = tal.seivaTurno;
    u.seiva = Math.min(100, tal.seivaInicial);
    if (tal.potencia > 0) {
      const h = { ...u.habilidade };
      if (h.mult) h.mult = Math.round(h.mult * (1 + tal.potencia) * 100) / 100;
      if (h.seiva) h.seiva = Math.round(h.seiva * (1 + tal.potencia));
      if (h.reflete) h.reflete = Math.round(h.reflete * (1 + tal.potencia) * 100) / 100;
      if (h.pctVida) h.pctVida = Math.round(h.pctVida * (1 + tal.potencia) * 1000) / 1000;
      u.habilidade = h;
    }
    marcarVantagem(u, dados);
    unidades.push(u);
  }
  if (dados.faccoes) {
    for (const { faccao, bonus } of bonusFaccoes(time, dados)) {
      for (const u of unidades.filter((x) => x.faccao === faccao.id)) {
        u[faccao.atributo] = Math.round(u[faccao.atributo] * (1 + bonus));
        if (faccao.atributo === 'vida') u.vidaMax = u.vida;
      }
    }
  }
  for (const i of batalha.inimigos) {
    const base = dados.pragas.find((p) => p.id === i.praga);
    if (!base) continue;
    const u = montarUnidade(base, 'praga', i.col, i.linha, i.nivel || batalha.nivel, `u${n++}`, cfg);
    // regras especiais (ex.: Desafio do Dia com pragas mais fortes)
    for (const [atributo, mult] of Object.entries(batalha.multPragas || {})) {
      u[atributo] = Math.round(u[atributo] * mult);
      if (atributo === 'vida') u.vidaMax = u.vida;
    }
    // ajuste só desse inimigo (ex.: chefe da Invasão bate mais fraco)
    for (const [atributo, mult] of Object.entries(i.mult || {})) u[atributo] = Math.round(u[atributo] * mult);
    // vida fixa (ex.: chefe da Invasão, que guarda a vida entre uma batalha e outra)
    if (i.vida) {
      u.vida = i.vida;
      u.vidaMax = i.vidaMax || i.vida;
    }
    marcarVantagem(u, dados);
    unidades.push(u);
  }
  return unidades;
}

// Poder total de cada lado, já com bônus de facção e regras da batalha.
export function poderLados(batalha, time, dados, colecao = {}) {
  const soma = { planta: 0, praga: 0 };
  for (const u of prepararBatalha(batalha, time, dados, colecao)) soma[u.lado] += poder(u, dados);
  return soma;
}

export function rolarCartas(batalha, rng) {
  return batalha.cartas.filter((c) => rng() < c.chance).map((c) => c.carta);
}

// Roda a batalha inteira. ATENÇÃO: altera as unidades recebidas (passe uma cópia).
export function simular(unidades, cfg, semente) {
  const rng = criarRng(semente);
  const eventos = [];

  const vivos = (lado) => unidades.filter((u) => u.lado === lado && u.vida > 0);
  const inimigos = (u) => vivos(u.lado === 'planta' ? 'praga' : 'planta');
  const aliados = (u) => vivos(u.lado);
  const velEfetiva = (u) => u.vel * (1 - u.lento);
  const reducao = (u, nome) => (u.status[nome] ? u.status[nome].valor : 0);
  const BONS = ['regeneracao'];

  // Aplica o efeito de status da habilidade ("aplica") em quem ela acertou ou ajudou.
  function aplicarStatus(u, h, efeitos) {
    const a = h.aplica;
    if (!a) return;
    const bom = BONS.includes(a.status);
    const tipos = bom ? ['cura', 'escudo'] : ['dano'];
    const alvos = new Set(efeitos.filter((e) => tipos.includes(e.tipo) && !e.reflexo).map((e) => e.alvo));
    for (const uid of alvos) {
      const alvo = unidades.find((x) => x.uid === uid);
      if (!alvo || alvo.vida <= 0 || alvo.lado !== (bom ? u.lado : (u.lado === 'planta' ? 'praga' : 'planta'))) continue;
      // veneno, queimadura e regeneração guardam o valor por rodada; fraqueza e casca guardam a redução
      const porRodada = ['veneno', 'queimadura', 'regeneracao'].includes(a.status);
      const valor = porRodada ? Math.max(1, Math.round(u.atq * a.valor)) : a.valor;
      alvo.status[a.status] = { valor, turnos: a.turnos };
      efeitos.push({ alvo: uid, tipo: 'status', status: a.status });
    }
  }
  const acabou = () => !vivos('planta').length || !vivos('praga').length;

  function foto() {
    const snap = {};
    for (const u of unidades) {
      snap[u.uid] = { vida: u.vida, seiva: u.seiva, escudo: u.escudo, sono: u.sono, lento: u.lento, status: Object.keys(u.status) };
    }
    return snap;
  }

  // Alvo padrão: a linha de frente inimiga, de preferência na mesma fileira.
  function alvoPadrao(u) {
    const todos = inimigos(u);
    if (!todos.length) return null;
    const frente = todos.filter((i) => i.col === 0);
    const opcoes = frente.length ? frente : todos;
    let menor = Infinity;
    for (const o of opcoes) menor = Math.min(menor, Math.abs(o.linha - u.linha));
    const perto = opcoes.filter((o) => Math.abs(o.linha - u.linha) === menor);
    return perto[Math.floor(rng() * perto.length)];
  }

  function bater(atacante, alvo, mult, efeitos) {
    if (atacante.vida <= 0) return; // morreu no meio do ataque (espinhos)
    const eficaz = !!atacante.forteContra && atacante.forteContra === (alvo.faccao || alvo.categoria);
    const atq = atacante.atq * (1 - reducao(atacante, 'fraqueza'));
    const def = alvo.def * (1 - reducao(alvo, 'casca'));
    let bruto = atq * mult * cfg.multDano * (100 / (100 + def));
    if (eficaz) bruto *= 1 + atacante.vantagem;
    bruto *= 1 - cfg.variacao + rng() * 2 * cfg.variacao;
    const critico = rng() < cfg.chanceCritico + (atacante.bonusCritico || 0);
    if (critico) bruto *= cfg.multCritico + (atacante.bonusCritDano || 0);
    const dano = Math.max(1, Math.round(bruto));
    const absorvido = Math.min(alvo.escudo, dano);
    alvo.escudo -= absorvido;
    const resto = dano - absorvido;
    alvo.vida = Math.max(0, alvo.vida - resto);
    alvo.seiva = Math.min(100, alvo.seiva + cfg.seivaAoApanhar);
    efeitos.push({ alvo: alvo.uid, tipo: 'dano', valor: dano, critico, eficaz, absorvido, vidaDepois: alvo.vida, morreu: alvo.vida === 0 });

    if (alvo.reflete > 0 && resto > 0 && atacante.vida > 0) {
      const volta = Math.max(1, Math.round(resto * alvo.reflete));
      atacante.vida = Math.max(0, atacante.vida - volta);
      efeitos.push({ alvo: atacante.uid, tipo: 'dano', valor: volta, critico: false, absorvido: 0, reflexo: true, vidaDepois: atacante.vida, morreu: atacante.vida === 0 });
    }
  }

  function usarHabilidade(u, efeitos) {
    const h = u.habilidade;
    const alvo = alvoPadrao(u);
    switch (h.tipo) {
      case 'area_coluna':
        if (alvo) inimigos(u).filter((i) => i.col === alvo.col).forEach((i) => bater(u, i, h.mult, efeitos));
        break;
      case 'espinhos':
        u.reflete = h.reflete;
        u.refleteTurnos = h.turnos;
        efeitos.push({ alvo: u.uid, tipo: 'espinhos' });
        if (alvo) bater(u, alvo, h.mult, efeitos);
        break;
      case 'rajada':
        for (let i = 0; i < h.golpes; i++) {
          const lista = inimigos(u);
          if (!lista.length) break;
          bater(u, lista[Math.floor(rng() * lista.length)], h.mult, efeitos);
        }
        break;
      case 'cura': {
        const feridos = aliados(u).sort((a, b) => a.vida / a.vidaMax - b.vida / b.vidaMax).slice(0, h.alvos || 1);
        const valor = Math.round(u.atq * h.mult);
        for (const ferido of feridos) {
          ferido.vida = Math.min(ferido.vidaMax, ferido.vida + valor);
          efeitos.push({ alvo: ferido.uid, tipo: 'cura', valor, vidaDepois: ferido.vida });
        }
        break;
      }
      case 'escudo': {
        const valor = Math.round(u.atq * h.mult);
        for (const a of aliados(u)) {
          a.escudo = Math.max(a.escudo, valor);
          a.escudoTurnos = h.turnos;
          efeitos.push({ alvo: a.uid, tipo: 'escudo', valor: a.escudo });
        }
        break;
      }
      case 'perfurar':
        if (alvo) {
          bater(u, alvo, h.mult, efeitos);
          const atras = inimigos(u).find((i) => i.linha === alvo.linha && i.col === 1 && i !== alvo);
          if (atras) bater(u, atras, h.mult, efeitos);
        }
        break;
      case 'sono':
        if (alvo) {
          bater(u, alvo, h.mult, efeitos);
          if (alvo.vida > 0) { alvo.sono = h.turnos; efeitos.push({ alvo: alvo.uid, tipo: 'sono' }); }
        }
        break;
      case 'lentidao':
        if (alvo) {
          bater(u, alvo, h.mult, efeitos);
          if (alvo.vida > 0) {
            alvo.lento = h.reducao;
            alvo.lentoTurnos = h.turnos;
            efeitos.push({ alvo: alvo.uid, tipo: 'lento' });
          }
        }
        break;
      case 'golpe':
        if (alvo) bater(u, alvo, h.mult, efeitos);
        break;
      case 'energia':
        if (alvo) bater(u, alvo, h.mult, efeitos);
        for (const a of aliados(u)) {
          if (a === u) continue;
          a.seiva = Math.min(100, a.seiva + h.seiva);
          efeitos.push({ alvo: a.uid, tipo: 'seiva', valor: h.seiva });
        }
        break;
      case 'protecao': {
        if (alvo) bater(u, alvo, h.mult, efeitos);
        const valor = Math.round(u.vidaMax * h.pctVida);
        const frente = aliados(u).filter((a) => a.col === 0 || a === u);
        for (const a of frente) {
          a.escudo = Math.max(a.escudo, valor);
          a.escudoTurnos = Math.max(a.escudoTurnos, h.turnos);
          efeitos.push({ alvo: a.uid, tipo: 'escudo', valor: a.escudo });
        }
        break;
      }
      case 'devorar': {
        const presa = inimigos(u).sort((a, b) => a.vida / a.vidaMax - b.vida / b.vidaMax)[0];
        if (presa) bater(u, presa, h.mult * (presa.vida / presa.vidaMax < h.limite ? h.bonus : 1), efeitos);
        break;
      }
      default:
        if (alvo) bater(u, alvo, 1, efeitos);
    }
    aplicarStatus(u, h, efeitos);
  }

  function agir(u) {
    if (u.sono > 0) {
      u.sono -= 1;
      eventos.push({ tipo: 'acao', de: u.uid, dormindo: true, efeitos: [], snap: foto() });
      return;
    }
    const efeitos = [];
    const especial = u.seiva >= 100;
    if (especial) {
      u.seiva = 0;
      usarHabilidade(u, efeitos);
    } else {
      const alvo = alvoPadrao(u);
      if (alvo) bater(u, alvo, 1, efeitos);
      u.seiva = Math.min(100, u.seiva + cfg.seivaPorTurno + (u.bonusSeivaTurno || 0));
    }
    eventos.push({
      tipo: 'acao', de: u.uid, especial,
      nomeHab: especial ? u.habilidade.nome : null,
      habTipo: especial ? u.habilidade.tipo : null,
      efeitos, snap: foto(),
    });
  }

  // Fim da rodada: veneno e queimadura tiram vida, regeneração cura, e os efeitos perdem 1 rodada.
  function tickStatus() {
    if (acabou()) return;
    const efeitos = [];
    for (const u of unidades) {
      if (u.vida <= 0) continue;
      for (const nome of ['veneno', 'queimadura']) {
        const st = u.status[nome];
        if (!st || u.vida <= 0) continue;
        const dano = Math.min(u.vida, st.valor);
        u.vida -= dano;
        efeitos.push({ alvo: u.uid, tipo: 'dano', valor: dano, critico: false, absorvido: 0, [nome]: true, porStatus: nome, vidaDepois: u.vida, morreu: u.vida === 0 });
      }
      const rg = u.status.regeneracao;
      if (rg && u.vida > 0) {
        const valor = Math.min(rg.valor, u.vidaMax - u.vida);
        u.vida += valor;
        if (valor > 0) efeitos.push({ alvo: u.uid, tipo: 'cura', valor, porStatus: 'regeneracao', vidaDepois: u.vida });
      }
    }
    for (const u of unidades) {
      for (const nome of Object.keys(u.status)) if (--u.status[nome].turnos <= 0) delete u.status[nome];
    }
    if (efeitos.length) eventos.push({ tipo: 'status', efeitos, snap: foto() });
  }

  function passarTurno() {
    tickStatus();
    for (const u of unidades) {
      if (u.escudoTurnos > 0 && --u.escudoTurnos === 0) u.escudo = 0;
      if (u.refleteTurnos > 0 && --u.refleteTurnos === 0) u.reflete = 0;
      if (u.lentoTurnos > 0 && --u.lentoTurnos === 0) u.lento = 0;
    }
  }

  let rodada = 0;
  while (!acabou() && rodada < cfg.maxRodadas) {
    rodada += 1;
    eventos.push({ tipo: 'rodada', n: rodada });
    const ordem = unidades
      .filter((u) => u.vida > 0)
      .map((u) => ({ u, r: velEfetiva(u) + rng() }))
      .sort((a, b) => b.r - a.r)
      .map((o) => o.u);
    for (const u of ordem) {
      if (acabou()) break;
      if (u.vida > 0) agir(u);
    }
    passarTurno();
  }

  const vitoria = vivos('praga').length === 0 && vivos('planta').length > 0;
  const plantasVivas = vivos('planta').length;
  const plantasTotal = unidades.filter((u) => u.lado === 'planta').length;
  eventos.push({ tipo: 'fim', vitoria, rodadas: rodada, snap: foto() });
  return { vitoria, rodadas: rodada, eventos, plantasVivas, plantasTotal };
}

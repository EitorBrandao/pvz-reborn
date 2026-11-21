// Cálculo do progresso das missões da Dona Flora.
// Contadores contam a partir do momento em que a missão ficou ativa ("base").

export function valorEstado(estado, chave) {
  switch (chave) {
    case 'tamanhoTime': return estado.time.length;
    case 'nivelMaxPlanta': return Math.max(0, ...Object.values(estado.colecao).map((r) => r.nivel));
    case 'plantasNaColecao': return Object.keys(estado.colecao).length;
    case 'fasesTresEstrelas': return Object.values(estado.estrelasFases).filter((n) => n >= 3).length;
    // quantas posições você já subiu na Arena (31º = 0)
    case 'subidaArena': return estado.arena ? estado.arena.ordem.length - estado.arena.melhor : 0;
    default: return 0;
  }
}

export function progressoTarefa(estado, ativa, tarefa) {
  const meta = tarefa.meta || 1;
  let atual = 0;
  if (tarefa.tipo === 'contador') {
    atual = (estado.contadores[tarefa.contador] || 0) - (ativa.base[tarefa.contador] || 0);
  } else if (tarefa.tipo === 'estado') {
    atual = valorEstado(estado, tarefa.chave);
  } else if (tarefa.tipo === 'fase') {
    atual = estado.vencidas.includes(tarefa.fase) ? 1 : 0;
  }
  return { atual: Math.max(0, Math.min(meta, atual)), meta };
}

export function missaoCompleta(estado, ativa, missao) {
  return missao.tarefas.every((t) => {
    const p = progressoTarefa(estado, ativa, t);
    return p.atual >= p.meta;
  });
}

// Texto curto de progresso pro ícone, ex.: "2/3"
export function resumoProgresso(estado, ativa, missao) {
  let feito = 0;
  let total = 0;
  for (const t of missao.tarefas) {
    const p = progressoTarefa(estado, ativa, t);
    feito += p.atual;
    total += p.meta;
  }
  return `${feito}/${total}`;
}

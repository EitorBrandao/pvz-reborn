// Guarda e carrega o progresso no próprio celular (localStorage).
// Nada vai pra internet.

const CHAVE = 'horta.save.v1';
export const VERSAO_SAVE = 1;

export function carregar() {
  try {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) return null;
    return migrar(JSON.parse(texto));
  } catch (erro) {
    console.warn('Não consegui ler o save:', erro);
    return null;
  }
}

export function salvar(estado) {
  try {
    estado.versao = VERSAO_SAVE;
    estado.ultimaSessao = Date.now();
    localStorage.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch (erro) {
    console.warn('Não consegui salvar:', erro);
    return false;
  }
}

export function apagar() {
  try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ }
}

// Pede ao navegador pra não apagar os dados sozinho quando faltar espaço.
export async function pedirArmazenamentoPersistente() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch { /* navegador sem suporte */ }
  return false;
}

// Baixa o save como arquivo .json
export function exportar(estado) {
  const texto = JSON.stringify(estado, null, 2);
  const blob = new Blob([texto], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const data = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `horta-selvagem-${data}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Lê um arquivo .json escolhido e devolve o estado (ou null se for inválido)
export async function importar(arquivo) {
  try {
    const dados = JSON.parse(await arquivo.text());
    if (!dados || dados.jogo !== 'horta-selvagem') return null;
    return migrar(dados);
  } catch {
    return null;
  }
}

// Quando a estrutura do save mudar, os saves antigos são atualizados aqui.
function migrar(dados) {
  if (!dados.versao) dados.versao = 1;
  // Exemplo futuro:
  // if (dados.versao < 2) { dados.plantas = []; dados.versao = 2; }
  return dados;
}

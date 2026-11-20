// Uso: node exportar.mjs <pasta-com-arte.mjs> <saida-svg>  (arte.mjs = cópia de js/arte.js)
import fs from 'fs';
import path from 'path';
const [dirArte, saida] = process.argv.slice(2);
const { urlArte } = await import(path.resolve(dirArte, 'arte.mjs'));
fs.mkdirSync(saida, { recursive: true });
for (const id of ['pimentao', 'cacto', 'milho']) {
  const u = urlArte('u', id);
  const svg = decodeURIComponent(u.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
  fs.writeFileSync(path.join(saida, id + '.svg'), svg);
}

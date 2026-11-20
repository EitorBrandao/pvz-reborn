// Exporta todos os desenhos de js/arte.js como SVG, um por letra da fonte.
// Uso: node exportar.mjs <pasta-com-arte.mjs> <saida-svg> <saida-mapa.js>
// Cada desenho ganha um código da área de uso privado (U+E000 em diante), na ordem abaixo.
import fs from 'fs';
import path from 'path';
const [dirArte, saida, mapa] = process.argv.slice(2);
const { urlArte, idsComArte } = await import(path.resolve(dirArte, 'arte.mjs'));
fs.mkdirSync(saida, { recursive: true });
const ids = idsComArte();
const lista = [
  ...ids.plantas.map((k) => ['u', k]), ...ids.pragas.map((k) => ['u', k]),
  ...ids.habilidades.map((k) => ['hab', k]), ...ids.status.map((k) => ['st', k]),
  ...ids.tiros.map((k) => ['tiro', k]), ...ids.extras.map((k) => ['extra', k]),
];
const glifos = {};
lista.forEach(([tipo, k], i) => {
  const cp = 0xE000 + i;
  const svg = decodeURIComponent(urlArte(tipo, k).replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));
  fs.writeFileSync(path.join(saida, `emoji_u${cp.toString(16)}.svg`), svg);
  glifos[`${tipo}:${k}`] = cp;
});
fs.writeFileSync(mapa, `// Gerado por tools/fonte-cor/gerar.sh: não edite à mão.\n// Código de cada desenho na fonte art/arte.woff2.\nexport const GLIFOS = ${JSON.stringify(glifos, null, 1)};\n`);
console.log(lista.length, 'desenhos');

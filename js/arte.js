// Arte do jogo: desenhos em SVG das plantas, pragas, tiros, ícones de habilidade e de status.
// Tudo é gerado aqui mesmo (sem arquivos de imagem), então funciona offline.
// Plantas olham pra direita; pragas olham pra esquerda (atacam vindo do outro lado).

import { GLIFOS } from './arte-fonte.js';

const K = '#2b1d14'; // contorno
const n1 = (v) => +v.toFixed(1);
const tr = (w = 3) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const P = (d, f, w = 3) => `<path d="${d}" fill="${f}"${w ? ` ${tr(w)}` : ''}/>`;
const E = (cx, cy, rx, ry, f, w = 3) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${w ? ` ${tr(w)}` : ''}/>`;
const C = (cx, cy, r, f, w = 3) => E(cx, cy, r, r, f, w);
const R = (x, y, w, h, rx, f, sw = 3) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}"${sw ? ` ${tr(sw)}` : ''}/>`;
const L = (d, cor, w) => `<path d="${d}" fill="none" stroke="${cor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const luz = (cx, cy, rx, ry, rot = 0, op = 0.5) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`;
const tom = (d, cor = '#000', op = 0.2) => `<path d="${d}" fill="${cor}" opacity="${op}"/>`;
const corda = (d, cor, w) => L(d, K, w + 5) + L(d, cor, w); // linha grossa com contorno
const asa = (cx, cy, rx, ry, rot) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#e3f4ff" opacity=".8" ${tr(2.2)} transform="rotate(${rot} ${cx} ${cy})"/>`;

const terra = () => E(50, 91, 28, 6.5, '#6b4423') + E(50, 89.5, 19, 2.6, '#8a5a33', 0);

// ---------- Rostos ----------
function olho(x, y, r = 5, dx = 1.2, dy = 0.5) {
  return E(x, y, r, n1(r * 1.15), '#fff', 2.5)
    + `<circle cx="${n1(x + dx)}" cy="${n1(y + dy)}" r="${n1(r * 0.58)}" fill="${K}"/>`
    + `<circle cx="${n1(x + dx + r * 0.22)}" cy="${n1(y + dy - r * 0.3)}" r="${n1(r * 0.22)}" fill="#fff"/>`;
}
function olhoMau(x, y, r = 5, cor = '#ffd23a', dx = -1.1) {
  return E(x, y, r, n1(r * 1.05), cor, 2.5)
    + `<ellipse cx="${n1(x + dx)}" cy="${n1(y + 0.5)}" rx="${n1(r * 0.3)}" ry="${n1(r * 0.78)}" fill="${K}"/>`
    + `<circle cx="${n1(x + dx - r * 0.25)}" cy="${n1(y - r * 0.35)}" r="${n1(r * 0.2)}" fill="#fff"/>`;
}
// olho sonolento: pálpebra da cor da pele cobrindo metade
function olhoSono(x, y, r, pele) {
  return olho(x, y, r, 0, 1.6) + P(`M${n1(x - r - 1)} ${n1(y + 0.8)} Q${x} ${n1(y - r * 1.7)} ${n1(x + r + 1)} ${n1(y + 0.8)} Z`, pele, 2.5);
}
const feliz = (x, y, r) => L(`M${n1(x - r)} ${n1(y + 1)} Q${x} ${n1(y - r * 1.3)} ${n1(x + r)} ${n1(y + 1)}`, K, 2.8);
const sobr = (x1, y1, x2, y2) => L(`M${x1} ${y1} L${x2} ${y2}`, K, 3.4);
const bochecha = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="2.2" fill="#ff7a8a" opacity=".55"/>`;
const leve = (x, y, w) => L(`M${n1(x - w)} ${y} Q${x} ${n1(y + w * 0.8)} ${n1(x + w)} ${y}`, K, 2.8);
const bravo = (x, y, w) => L(`M${n1(x - w)} ${n1(y + 2)} Q${x} ${n1(y - 2.5)} ${n1(x + w)} ${n1(y + 2)}`, K, 2.8);
function sorriso(x, y, w) {
  return P(`M${n1(x - w)} ${y} Q${x} ${n1(y + w * 1.4)} ${n1(x + w)} ${y} Z`, '#8a2a1e', 2.5)
    + `<ellipse cx="${x}" cy="${n1(y + w * 0.62)}" rx="${n1(w * 0.42)}" ry="${n1(w * 0.22)}" fill="#ff7a7a"/>`;
}
// boca aberta com dentes em cima
function dentes(x, y, w, h = w * 0.95) {
  let s = P(`M${n1(x - w)} ${y} L${n1(x + w)} ${y} Q${n1(x + w * 0.8)} ${n1(y + h)} ${x} ${n1(y + h)} Q${n1(x - w * 0.8)} ${n1(y + h)} ${n1(x - w)} ${y} Z`, '#8a2a1e', 2.5);
  const q = 4;
  const passo = (2 * w) / q;
  for (let i = 0; i < q; i++) {
    const x0 = x - w + i * passo;
    s += P(`M${n1(x0 + 0.6)} ${n1(y + 0.4)} L${n1(x0 + passo / 2)} ${n1(y + h * 0.42)} L${n1(x0 + passo - 0.6)} ${n1(y + 0.4)} Z`, '#fff', 1.3);
  }
  return s;
}

// ---------- Formas ----------
function folha(bx, by, tx, ty, lg, cor, veia = true) {
  const mx = (bx + tx) / 2, my = (by + ty) / 2;
  const dx = tx - bx, dy = ty - by;
  const n = Math.hypot(dx, dy) || 1;
  const px = (-dy / n) * lg, py = (dx / n) * lg;
  return P(`M${bx} ${by} Q${n1(mx + px)} ${n1(my + py)} ${tx} ${ty} Q${n1(mx - px)} ${n1(my - py)} ${bx} ${by} Z`, cor)
    + (veia ? L(`M${bx} ${by} Q${n1(mx + px * 0.15)} ${n1(my + py * 0.15)} ${tx} ${ty}`, 'rgba(0,0,0,.22)', 1.6) : '');
}
// círculo com borda ondulada (folhas de couve, pétalas)
function babado(cx, cy, rx, ry, n, amp, cor, w = 3) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (!i) d += `M${n1(x)} ${n1(y)}`;
    else {
      const am = ((i - 0.5) / n) * Math.PI * 2 - Math.PI / 2;
      d += ` Q${n1(cx + Math.cos(am) * (rx + amp))} ${n1(cy + Math.sin(am) * (ry + amp))} ${n1(x)} ${n1(y)}`;
    }
  }
  return P(d + 'Z', cor, w);
}
function estrela(cx, cy, r1, r2, n, cor, w = 2, contorno = K) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    d += `${i ? 'L' : 'M'}${n1(cx + Math.cos(a) * r)} ${n1(cy + Math.sin(a) * r)}`;
  }
  return `<path d="${d}Z" fill="${cor}" stroke="${contorno}" stroke-width="${w}" stroke-linejoin="round"/>`;
}
// espinhos num arco (ouriço)
function espinhosArco(cx, cy, r1, r2, a0, a1, n, cor) {
  let d = '';
  for (let i = 0; i <= n * 2; i++) {
    const a = ((a0 + ((a1 - a0) * i) / (n * 2)) * Math.PI) / 180;
    const r = i % 2 ? r2 : r1;
    d += `${i ? 'L' : 'M'}${n1(cx + Math.cos(a) * r)} ${n1(cy + Math.sin(a) * r)}`;
  }
  return P(d + 'Z', cor, 2.5);
}
const gota = (x, y, s = 1, cor = '#5ab4ff') =>
  P(`M${x} ${n1(y - 7 * s)} Q${n1(x + 5.5 * s)} ${n1(y + 1 * s)} ${x} ${n1(y + 5 * s)} Q${n1(x - 5.5 * s)} ${n1(y + 1 * s)} ${x} ${n1(y - 7 * s)} Z`, cor, 2)
  + luz(n1(x - 1.6 * s), n1(y + 0.5 * s), n1(1.2 * s), n1(2 * s), 0, 0.7);
const cruz = (x, y, s, cor) =>
  P(`M${n1(x - s / 3)} ${n1(y - s)} H${n1(x + s / 3)} V${n1(y - s / 3)} H${n1(x + s)} V${n1(y + s / 3)} H${n1(x + s / 3)} V${n1(y + s)} H${n1(x - s / 3)} V${n1(y + s / 3)} H${n1(x - s)} V${n1(y - s / 3)} H${n1(x - s / 3)} Z`, cor, 2);
function machado(x, y, ang) {
  return `<g transform="translate(${x} ${y}) rotate(${ang})">${R(-2.5, -34, 5, 36, 2.5, '#8a5a2b', 2.5)}`
    + `${P('M1 -33 Q17 -37 17 -21 Q10 -19 1 -21 Z', '#cfd8dc', 2.5)}${L('M8 -33 Q15 -31 15 -23', '#fff', 1.6)}</g>`;
}
const flor = (x, y, r, cor) =>
  [0, 72, 144, 216, 288].map((g) => {
    const a = ((g - 90) * Math.PI) / 180;
    return C(n1(x + Math.cos(a) * r), n1(y + Math.sin(a) * r), n1(r * 0.95), cor, 2);
  }).join('') + C(x, y, n1(r * 0.7), '#ffd23a', 2);
const vespinhos = (lista, cor = '#fff6c8') => lista.map(([x, y]) => L(`M${x - 3} ${y - 2} L${x} ${y} L${x + 3} ${y - 2}`, cor, 1.8)).join('');

// ---------- Plantas ----------
function jarroBase(corpo, veia, boca, tampa, extra = '') {
  let dentinhos = '';
  for (let x = 37; x <= 58; x += 7) dentinhos += P(`M${x} 35 L${x + 3} 41 L${x + 6} 35 Z`, '#fff', 1.5);
  return terra()
    + P('M31 89 Q22 62 34 42 Q37 36 35 30 L65 30 Q63 36 66 42 Q78 62 69 89 Z', corpo)
    + tom('M60 34 Q72 54 65 88 L69 89 Q78 62 66 42 Q63 36 65 30 Z')
    + L('M40 50 Q36 66 40 84', veia, 2.2) + L('M60 50 Q64 66 60 84', veia, 2.2)
    + E(50, 30, 19, 7, boca) + dentinhos
    + P('M33 24 Q46 2 72 12 Q62 22 33 24 Z', tampa)
    + luz(38, 60, 3, 10, 8, 0.4)
    + extra
    + olho(42, 56, 5) + olho(58, 56, 5) + sobr(36, 48, 46, 52) + sobr(54, 52, 64, 48)
    + dentes(50, 68, 8);
}

function cogumeloBase(chapeu, sombra, pe, rosto, extra = '') {
  return terra()
    + P('M40 58 Q37 84 41 89 L59 89 Q63 84 60 58 Z', pe)
    + tom('M54 60 Q58 75 57 89 L59 89 Q63 84 60 58 Z', '#7a5a30', 0.25)
    + P('M15 60 Q15 19 50 17 Q85 19 85 60 Q67 67 50 65 Q33 67 15 60 Z', chapeu)
    + tom('M70 25 Q85 36 85 60 Q77 63 68 64 Q76 46 70 25 Z', sombra, 0.3)
    + extra + rosto;
}

const PLANTAS = {
  pimentao: () => terra()
    + P('M30 48 C22 62 28 86 42 89 C46 90 48 87 50 87 C52 87 54 90 58 89 C72 86 78 62 70 48 C64 38 36 38 30 48 Z', '#e8392b')
    + tom('M62 44 C72 52 74 70 66 84 C62 88 58 89 56 86 C64 74 66 58 62 44 Z', '#7a0000', 0.25)
    + L('M50 54 Q47 72 50 86', '#a51f17', 2)
    + luz(36, 58, 4, 11, 15)
    + P('M34 46 Q42 37 50 42 Q58 37 66 46 Q58 51 50 47 Q42 51 34 46 Z', '#4caf2e')
    + corda('M50 42 Q48 32 55 26', '#4caf2e', 4)
    + L('M55 26 Q63 20 59 12', '#5d4037', 2.5)
    + estrela(59, 10, 8, 3.5, 8, '#ffd23a', 1.6, '#ff6a00') + '<circle cx="59" cy="10" r="2.4" fill="#fff"/>'
    + olho(41, 62, 5.5, 1.5) + olho(59, 62, 5.5, 1.5)
    + sobr(35, 53, 46, 57) + sobr(54, 57, 65, 53)
    + dentes(50, 73, 8),

  cacto: () => terra()
    + P('M34 66 H24 Q17 66 17 59 V46 Q17 40 23 40 Q29 40 29 46 V55 H34 Z', '#3fa34d')
    + P('M66 58 H76 Q83 58 83 51 V36 Q83 30 77 30 Q71 30 71 36 V47 H66 Z', '#3fa34d')
    + R(32, 26, 36, 66, 18, '#47b257')
    + L('M41 36 V84', '#2f8a3e', 2) + L('M59 36 V84', '#2f8a3e', 2)
    + luz(37, 50, 3, 12, 0, 0.35)
    + vespinhos([[36, 42], [64, 44], [37, 76], [63, 80], [22, 50], [78, 40], [50, 86]])
    + flor(50, 25, 5, '#ff6fa8')
    + olho(43, 50, 5) + olho(57, 50, 5) + sobr(38, 42, 47, 45) + sobr(53, 45, 62, 42)
    + leve(50, 62, 5),

  milho: () => {
    let graos = '';
    for (let y = 21; y <= 82; y += 6.5) {
      for (let x = 40; x <= 60; x += 6.6) {
        if (y > 41 && y < 72) continue;
        graos += `<rect x="${n1(x - 2.4)}" y="${n1(y - 2.4)}" width="4.8" height="4.8" rx="2" fill="#f0a81a" opacity=".8"/>`;
      }
    }
    return terra()
      + folha(50, 90, 22, 46, 10, '#5cb83a', false) + folha(50, 90, 78, 46, 10, '#5cb83a', false)
      + P('M35 42 Q35 16 50 12 Q65 16 65 42 L65 72 Q65 86 50 86 Q35 86 35 72 Z', '#ffd23a')
      + graos + luz(40, 34, 3, 9, 0, 0.5)
      + folha(50, 92, 28, 66, 8, '#4caf2e') + folha(50, 92, 72, 66, 8, '#4caf2e')
      + olho(43, 51, 5.5) + olho(57, 51, 5.5) + bochecha(39, 61) + bochecha(61, 61) + sorriso(50, 61, 6);
  },

  babosa: () => terra()
    + folha(50, 88, 16, 42, 9, '#6cbf6a') + folha(50, 88, 84, 42, 9, '#6cbf6a')
    + folha(50, 88, 31, 22, 9, '#7fd07c') + folha(50, 88, 69, 22, 9, '#7fd07c')
    + folha(50, 88, 50, 12, 9, '#8fdc8a')
    + [[30, 52], [70, 52], [40, 36], [60, 36], [50, 28], [24, 58], [76, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" opacity=".85"/>`).join('')
    + E(50, 74, 17, 14, '#9be395')
    + luz(44, 68, 5, 3, -20, 0.5)
    + olho(44, 73, 4.5) + olho(56, 73, 4.5) + bochecha(39, 80) + bochecha(61, 80) + leve(50, 81, 4)
    + gota(80, 30, 1.1),

  couve: () => terra()
    + babado(50, 58, 32, 30, 11, 5, '#2f8a34')
    + babado(50, 60, 25, 23, 9, 4, '#5cb83a')
    + L('M50 37 Q46 30 40 27', 'rgba(255,255,255,.4)', 2) + L('M50 37 Q55 30 61 27', 'rgba(255,255,255,.4)', 2)
    + L('M28 66 Q22 70 20 76', 'rgba(255,255,255,.35)', 2) + L('M72 66 Q78 70 80 76', 'rgba(255,255,255,.35)', 2)
    + luz(37, 48, 5, 8, -30, 0.35)
    + olho(43, 58, 5.5) + olho(57, 58, 5.5) + sobr(37, 50, 46, 52) + sobr(54, 52, 63, 50)
    + leve(50, 71, 5),

  bambu: () => terra()
    + P('M64 34 L74 29 L74 90 L64 90 Z', '#8fbf45')
    + R(62, 58, 14, 4, 2, '#6f9a32', 2)
    + folha(72, 46, 93, 33, 5, '#4caf2e')
    + P('M37 33 L63 16 L63 91 L37 91 Z', '#b9dc5a')
    + P('M37 33 L63 16 L60 22 L40 35 Z', '#e8f5b0', 2)
    + tom('M55 21 L63 16 L63 91 L55 91 Z', '#3d5e10', 0.18)
    + R(35, 38, 30, 6, 3, '#87ab3c', 2.5) + R(35, 72, 30, 6, 3, '#87ab3c', 2.5)
    + luz(42, 58, 2.5, 9, 0, 0.45)
    + folha(37, 42, 15, 32, 5, '#4caf2e')
    + olho(44, 54, 4.8) + olho(56, 54, 4.8) + sobr(39, 47, 47, 50) + sobr(53, 50, 61, 47)
    + bravo(50, 64, 5),

  cogumelo: () => cogumeloBase('#9b5bd1', '#2a0050', '#f3e3c3',
    olhoSono(45, 73, 4.3, '#f3e3c3') + olhoSono(55, 73, 4.3, '#f3e3c3') + E(50, 82, 2.6, 2.1, '#8a2a1e', 2),
    E(36, 36, 6, 5, '#f4e6ff', 2) + E(58, 29, 5, 4, '#f4e6ff', 2) + E(71, 46, 4, 3.5, '#f4e6ff', 2) + E(27, 51, 3.5, 3, '#f4e6ff', 2)
    + luz(29, 34, 6, 3, -35, 0.35)
    + [[12, 30], [88, 32], [82, 12], [18, 12]].map(([x, y]) => C(x, y, 2.6, '#c79bff', 1.5)).join('')),

  trepadeira: () => terra()
    + corda('M50 90 C26 82 72 70 50 58 C36 50 62 44 52 36', '#3d8b2f', 6)
    + corda('M58 64 Q66 62 71 58', '#3d8b2f', 4)
    + corda('M71 57 a9 9 0 1 0 18 0 a9 9 0 1 0 -18 0', '#3d8b2f', 4)
    + folha(38, 80, 20, 74, 5, '#5cb83a') + folha(62, 72, 78, 80, 5, '#5cb83a') + folha(43, 54, 26, 50, 5, '#5cb83a')
    + E(50, 30, 17, 15, '#6cc24a')
    + folha(45, 17, 36, 5, 4, '#5cb83a') + folha(55, 17, 64, 5, 4, '#5cb83a')
    + luz(43, 24, 5, 3, -20, 0.45)
    + olho(44, 29, 4.8) + olho(56, 29, 4.8) + sobr(51, 23, 60, 21)
    + sorriso(50, 36, 5),

  agave: () => terra()
    + corda('M50 66 L50 20', '#8a5a2b', 3.5)
    + P('M50 5 L58 19 L53 17 L53 23 L47 23 L47 17 L42 19 Z', '#cfd8dc', 2.5)
    + folha(50, 88, 10, 56, 7, '#5f9f8f') + folha(50, 88, 90, 56, 7, '#5f9f8f')
    + folha(50, 88, 22, 34, 7, '#73b5a3') + folha(50, 88, 78, 34, 7, '#73b5a3')
    + [[10, 56], [90, 56], [22, 34], [78, 34]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${K}"/>`).join('')
    + folha(50, 90, 8, 82, 6, '#4f8f7f') + folha(50, 90, 92, 82, 6, '#4f8f7f')
    + E(50, 72, 16, 13, '#86c7b5')
    + luz(44, 66, 5, 3, -20, 0.45)
    + olho(44, 71, 4.5) + olho(56, 71, 4.5) + sobr(39, 64, 47, 67) + sobr(53, 67, 61, 64)
    + bravo(50, 80, 4),

  bromelia: () => terra()
    + folha(50, 88, 11, 66, 8, '#3f9a4a') + folha(50, 88, 89, 66, 8, '#3f9a4a')
    + folha(50, 86, 22, 46, 8, '#4caf50') + folha(50, 86, 78, 46, 8, '#4caf50')
    + '<circle cx="50" cy="38" r="18" fill="#fff3a0" opacity=".65"/>'
    + folha(50, 70, 31, 24, 8, '#ff4f7b') + folha(50, 70, 69, 24, 8, '#ff4f7b') + folha(50, 70, 50, 14, 8, '#ff6f93')
    + estrela(30, 12, 5, 1.8, 4, '#fff8c0', 1.2) + estrela(72, 10, 4, 1.5, 4, '#fff8c0', 1.2) + estrela(84, 30, 3.5, 1.3, 4, '#fff8c0', 1.2)
    + E(50, 74, 16, 12, '#5cbf5f')
    + luz(44, 70, 5, 2.5, -15, 0.45)
    + feliz(44, 73, 4) + feliz(56, 73, 4) + bochecha(39, 78) + bochecha(61, 78) + sorriso(50, 78, 4),

  vitoria: () => E(50, 90, 45, 7, '#4aa8de')
    + L('M10 90 Q16 87 22 90', 'rgba(255,255,255,.75)', 2) + L('M78 91 Q84 88 90 91', 'rgba(255,255,255,.75)', 2)
    + P('M9 80 Q9 69 50 69 Q91 69 91 80 Q91 91 50 91 Q9 91 9 80 Z', '#3e9e45')
    + P('M14 79 Q14 73 50 73 Q86 73 86 79 Q86 86 50 86 Q14 86 14 79 Z', '#5cbf5f', 2)
    + folha(50, 72, 25, 56, 7, '#ffc1dd') + folha(50, 72, 75, 56, 7, '#ffc1dd')
    + folha(50, 70, 35, 39, 7, '#ff9ec9') + folha(50, 70, 65, 39, 7, '#ff9ec9') + folha(50, 70, 50, 32, 7, '#ffb3d4')
    + E(50, 62, 14, 11, '#ffe082')
    + luz(45, 57, 4, 2, -15, 0.5)
    + feliz(45, 61, 3.8) + feliz(55, 61, 3.8) + bochecha(40, 65) + bochecha(60, 65) + leve(50, 67, 3.5),

  jarro: () => jarroBase('#8bc34a', '#7b2d6a', '#4a1240', '#9c3d86'),

  mandioca: () => terra()
    + corda('M50 32 L50 22', '#3d8b2f', 3)
    + folha(50, 24, 27, 9, 4, '#4caf50') + folha(50, 24, 39, 3, 4, '#5cb83a') + folha(50, 24, 61, 3, 4, '#5cb83a') + folha(50, 24, 73, 9, 4, '#4caf50')
    + machado(76, 80, 22)
    + P('M37 32 Q28 52 35 76 Q42 92 50 92 Q58 92 65 76 Q72 52 63 32 Q50 26 37 32 Z', '#b5793f')
    + tom('M58 31 Q70 52 63 78 Q58 90 52 92 Q58 92 65 76 Q72 52 63 32 Z')
    + L('M35 43 Q50 48 65 43', '#8a5226', 2) + L('M35 74 Q50 79 65 74', '#8a5226', 2)
    + luz(41, 56, 3, 9, 8, 0.35)
    + L('M64 66 Q70 70 75 67', K, 3)
    + olho(44, 55, 5) + olho(56, 55, 5) + sobr(38, 48, 47, 51) + sobr(53, 51, 62, 48)
    + bravo(50, 65, 5),

  melancia: () => {
    let listras = '';
    for (const x of [24, 38, 52, 66]) listras += `<path d="M${x} 28 Q${x - 6} 60 ${x} 92 L${x + 5} 92 Q${x - 1} 60 ${x + 5} 28 Z"/>`;
    return terra()
      + corda('M52 32 Q54 24 60 21', '#3d8b2f', 3) + folha(59, 22, 76, 13, 5, '#5cb83a')
      + '<clipPath id="m"><circle cx="50" cy="60" r="30"/></clipPath>'
      + C(50, 60, 30, '#3a9a3a', 0)
      + `<g clip-path="url(#m)" fill="#1f6b2a">${listras}</g>`
      + C(50, 60, 30, 'none')
      + luz(35, 45, 5, 9, 30, 0.35)
      + olho(41, 52, 5.5) + olho(59, 52, 5.5) + sobr(35, 43, 46, 47) + sobr(54, 47, 65, 43)
      + P('M34 64 Q50 90 66 64 Z', '#ff4d5e')
      + P('M35.5 64.5 L64.5 64.5 L62.5 68 L37.5 68 Z', '#fff', 1.5)
      + [[44, 73], [50, 78], [56, 73]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.4" ry="2.2" fill="${K}"/>`).join('');
  },

  coco: () => terra()
    + folha(50, 36, 16, 27, 6, '#4caf50') + folha(50, 36, 29, 12, 6, '#5cb83a') + folha(50, 36, 71, 12, 6, '#5cb83a') + folha(50, 36, 84, 27, 6, '#4caf50')
    + machado(22, 84, -24)
    + C(50, 62, 27, '#8a5a2b')
    + tom('M62 38 Q78 50 76 66 Q74 82 56 88 Q72 76 70 60 Q68 46 62 38 Z')
    + [[29, 52], [32, 74], [68, 76], [72, 52], [42, 85], [60, 39]].map(([x, y]) => L(`M${x} ${y} l3 -2 M${x + 1} ${y + 3} l3 -1`, '#5e3a1a', 1.6)).join('')
    + luz(39, 48, 6, 3.5, -30, 0.3)
    + olho(42, 60, 5) + olho(58, 60, 5) + sobr(36, 52, 46, 56) + sobr(54, 56, 64, 52)
    + dentes(50, 71, 6),

  taboa: () => terra()
    + folha(46, 90, 18, 34, 5, '#4caf50') + folha(54, 90, 83, 30, 5, '#5cb83a')
    + corda('M50 90 L50 16', '#6b8e23', 3)
    + R(39, 28, 22, 46, 11, '#7b4a26')
    + tom('M54 30 Q61 34 61 50 L61 62 Q61 72 52 74 Q58 64 57 50 Z')
    + [[43, 34], [55, 36], [45, 64], [56, 66], [50, 70], [42, 56]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#a0693a"/>`).join('')
    + luz(44, 40, 2.3, 7, 0, 0.35)
    + olhoSono(45, 48, 4, '#7b4a26') + olhoSono(55, 48, 4, '#7b4a26') + E(50, 58, 2.4, 2, '#4a1a0a', 1.5)
    + C(24, 20, 3, '#fff8e1', 1.5) + C(78, 14, 2.5, '#fff8e1', 1.5) + C(30, 8, 2, '#fff8e1', 1.5),

  cacto_vulcao: () => terra()
    + P('M34 70 H24 Q17 70 17 63 V50 Q17 44 23 44 Q29 44 29 50 V59 H34 Z', '#4f8a3a')
    + P('M66 62 H76 Q83 62 83 55 V42 Q83 36 77 36 Q71 36 71 42 V51 H66 Z', '#4f8a3a')
    + P('M30 90 L36 36 Q50 29 64 36 L70 90 Z', '#4f8a3a')
    + tom('M58 33 Q64 36 64 36 L70 90 L62 90 Z')
    + L('M36 72 L41 78 L37 86', '#ff7a1f', 2.6) + L('M64 70 L59 78 L63 86', '#ff7a1f', 2.6)
    + E(50, 35, 13, 5, '#ff5a1f') + E(50, 35, 8, 2.5, '#ffd23a', 0)
    + P('M43 34 Q38 20 47 11 Q47 21 52 14 Q57 23 61 16 Q62 27 57 34 Z', '#ff7a1f', 2.5)
    + P('M47 33 Q46 25 50 21 Q52 26 54 24 Q56 29 54 33 Z', '#ffd23a', 0)
    + C(34, 14, 3, '#ff7a1f', 2) + C(68, 9, 2.5, '#ffd23a', 2) + C(72, 22, 2, '#ff7a1f', 1.5)
    + vespinhos([[22, 54], [78, 46], [50, 88]])
    + olho(43, 55, 5) + olho(57, 55, 5) + sobr(37, 47, 47, 51) + sobr(53, 51, 63, 47)
    + dentes(50, 66, 6),

  teia_esporenta: () => cogumeloBase('#5d6f99', '#0d1a3a', '#e8e0d0',
    olho(45, 74, 4.2) + olho(55, 74, 4.2) + sobr(51, 67, 59, 65) + L('M45 82 Q50 85 56 80', K, 2.6),
    ['M50 18 L16 58', 'M50 18 L33 64', 'M50 18 L50 65', 'M50 18 L67 64', 'M50 18 L84 58'].map((d) => L(d, 'rgba(255,255,255,.7)', 1.3)).join('')
    + L('M27 44 Q38 47 50 44 Q62 47 73 44', 'rgba(255,255,255,.7)', 1.3)
    + L('M38 30 Q44 33 50 31 Q56 33 62 30', 'rgba(255,255,255,.7)', 1.3)
    + L('M22 61 L20 76', 'rgba(255,255,255,.85)', 1.2) + C(20, 77, 1.8, '#bfe9ff', 1)
    + L('M78 61 L80 72', 'rgba(255,255,255,.85)', 1.2) + C(80, 73, 1.8, '#bfe9ff', 1)
    + [[12, 30], [88, 34], [84, 14]].map(([x, y]) => C(x, y, 2.4, '#9ccc65', 1.5)).join('')),

  jarro_peconhento: () => jarroBase('#7e4bb0', '#3d1a66', '#2f5a10', '#4a2a7a',
    E(50, 30, 14, 4, '#8dff4a', 0)
    + C(44, 28, 1.8, '#d4ffb0', 0) + C(55, 29, 1.3, '#d4ffb0', 0)
    + gota(32, 40, 0.7, '#8dff4a') + gota(68, 44, 0.8, '#8dff4a') + gota(29, 52, 0.55, '#8dff4a')),

  lirio_curativo: () => terra()
    + folha(50, 90, 16, 74, 7, '#5cbf5f') + folha(50, 90, 84, 74, 7, '#5cbf5f')
    + corda('M50 90 L50 66', '#3d8b2f', 3)
    + folha(50, 64, 20, 42, 8, '#d9f2ff') + folha(50, 64, 80, 42, 8, '#d9f2ff')
    + folha(50, 62, 33, 22, 8, '#ffffff') + folha(50, 62, 67, 22, 8, '#ffffff')
    + P('M50 26 Q66 46 62 58 Q58 68 50 68 Q42 68 38 58 Q34 46 50 26 Z', '#6ec6ff')
    + luz(44, 48, 3, 6, -20, 0.6)
    + feliz(45, 55, 3.5) + feliz(55, 55, 3.5) + bochecha(41, 60) + bochecha(59, 60) + leve(50, 61, 3)
    + cruz(18, 22, 4, '#7dff6a') + cruz(84, 18, 3.5, '#7dff6a') + cruz(88, 44, 2.6, '#7dff6a'),
};

// ---------- Pragas ----------
const pernas = (lista, w = 2.8) => lista.map((d) => L(d, K, w)).join('');

const PRAGAS = {
  lagarta: () => pernas(['M84 84 L84 89', 'M72 84 L72 89', 'M58 85 L58 89'])
    + C(83, 77, 9, '#8bc34a') + C(70, 75, 11, '#9ccc65') + C(56, 76, 11, '#8bc34a')
    + C(83, 73, 2, '#ffd23a', 0) + C(70, 70, 2.4, '#ffd23a', 0) + C(56, 71, 2.4, '#ffd23a', 0)
    + L('M30 50 Q26 36 19 33', K, 2.5) + C(19, 33, 3, '#ff5252', 2)
    + L('M40 50 Q43 37 49 33', K, 2.5) + C(49, 33, 3, '#ff5252', 2)
    + C(34, 65, 17, '#7cb342')
    + luz(29, 56, 5, 3, -30, 0.4)
    + olhoMau(27, 62, 5) + olhoMau(40, 62, 5) + sobr(21, 54, 30, 58) + sobr(36, 58, 45, 54)
    + dentes(32, 72, 6),

  gafanhoto: () => P('M44 54 Q70 40 92 52 Q70 60 48 60 Z', '#c5e1a5', 2.5)
    + pernas(['M40 70 L35 88', 'M52 72 L50 89'])
    + E(60, 64, 26, 11, '#8bc34a')
    + corda('M70 66 L84 40 L94 87', '#689f38', 4)
    + L('M28 46 Q40 20 70 16', K, 2) + L('M34 47 Q50 28 78 27', K, 2)
    + E(30, 58, 14, 13, '#9ccc65')
    + luz(26, 52, 4, 2.5, -20, 0.45)
    + olhoMau(25, 56, 5.5, '#ff5252') + sobr(18, 47, 29, 51)
    + dentes(24, 67, 5),

  besouro: () => pernas(['M40 80 L33 89', 'M58 84 L56 90', 'M76 80 L82 89'], 3)
    + P('M30 62 Q30 36 60 34 Q88 36 88 64 Q86 84 60 84 Q32 84 30 62 Z', '#3949ab')
    + L('M60 36 L60 84', '#1a237e', 2.5)
    + luz(48, 44, 10, 4.5, -12, 0.45) + luz(74, 46, 6, 3, 12, 0.3)
    + P('M20 58 Q8 44 16 32 Q22 46 30 54 Z', '#5c6bc0')
    + C(27, 66, 13, '#283593')
    + olhoMau(23, 64, 4.5, '#ff5252') + sobr(17, 57, 28, 60)
    + bravo(22, 73, 4),

  lesma: () => E(46, 92, 22, 3, '#c6ff00', 0).replace('/>', ' opacity=".55"/>')
    + P('M8 89 Q8 62 28 58 Q46 55 56 72 Q66 86 95 89 Z', '#a5d66b')
    + C(60, 81, 3, '#7cb342', 0) + C(74, 85, 2.4, '#7cb342', 0) + C(46, 70, 2.6, '#7cb342', 0)
    + luz(30, 66, 8, 3, -15, 0.4)
    + corda('M22 61 L15 37', '#a5d66b', 3) + corda('M33 59 L34 34', '#a5d66b', 3)
    + olhoMau(15, 35, 5, '#ffeb3b') + olhoMau(34, 32, 5, '#ffeb3b')
    + dentes(20, 72, 6) + gota(30, 92, 0.5, '#c6ff00'),

  toupeira: () => C(58, 62, 28, '#6d4c41')
    + E(50, 72, 15, 13, '#a1887f', 0)
    + luz(64, 44, 8, 4, 20, 0.25)
    + E(28, 60, 12, 9, '#8d6e63')
    + C(17, 57, 5, '#ff8a80', 2.5)
    + L('M22 64 L10 66', '#3e2723', 1.5) + L('M22 61 L10 59', '#3e2723', 1.5)
    + R(23, 66, 4, 6, 1, '#fff', 1.5) + R(27, 66, 4, 6, 1, '#fff', 1.5)
    + olhoMau(35, 50, 4, '#ffeb3b') + sobr(29, 43, 39, 47)
    + P('M38 74 Q22 72 17 82 L22 86 L26 81 L28 88 L32 83 L35 88 Z', '#ffccbc', 2.5)
    + E(70, 89, 8, 3, '#4e342e', 2),

  rainha: () => pernas(['M44 70 L36 88', 'M50 70 L50 89', 'M56 70 L64 88'], 3)
    + E(74, 64, 20, 16, '#b0301c')
    + L('M64 52 Q66 64 64 78', '#7a1a0e', 2) + L('M76 49 Q79 64 76 80', '#7a1a0e', 2)
    + luz(78, 56, 6, 3, 10, 0.3)
    + E(50, 62, 10, 9, '#8d2414')
    + L('M28 40 Q22 28 14 26', K, 2.4) + L('M34 39 Q36 26 44 22', K, 2.4)
    + C(30, 54, 15, '#a52a16')
    + P('M19 43 L20 28 L26 36 L30 24 L35 36 L41 28 L42 43 Z', '#ffd23a', 2.5)
    + C(30, 34, 2, '#e53935', 1.2)
    + P('M18 62 Q9 66 13 73 Q17 68 23 66 Z', '#5d1a0e', 2)
    + olhoMau(25, 53, 4.5) + olhoMau(36, 53, 4.5) + sobr(19, 47, 28, 50) + sobr(33, 50, 42, 47)
    + bravo(29, 62, 4),

  vespa: () => asa(54, 36, 9, 18, -20) + asa(66, 38, 8, 15, 15)
    + pernas(['M44 68 L40 82', 'M50 68 L52 82'])
    + '<clipPath id="v"><ellipse cx="68" cy="62" rx="20" ry="13"/></clipPath>'
    + E(68, 62, 20, 13, '#ffca28', 0)
    + `<g clip-path="url(#v)" fill="${K}"><rect x="60" y="45" width="6" height="35"/><rect x="72" y="45" width="6" height="35"/></g>`
    + E(68, 62, 20, 13, 'none')
    + P('M86 59 L98 63 L86 67 Z', K, 1)
    + C(46, 60, 10, '#4e342e')
    + L('M26 44 Q22 32 16 30', K, 2) + L('M32 44 Q34 32 40 28', K, 2)
    + C(29, 56, 13, '#ffca28')
    + luz(25, 50, 4, 2.5, -20, 0.45)
    + olhoMau(24, 54, 5, '#ff3d00') + sobr(18, 46, 29, 50)
    + dentes(25, 64, 4),

  aranha: () => L('M62 36 L62 0', 'rgba(255,255,255,.85)', 1.5)
    + pernas(['M44 62 Q28 44 14 58', 'M44 68 Q24 62 10 78', 'M70 54 Q84 36 94 52', 'M72 62 Q90 58 95 78', 'M50 74 Q40 86 32 90', 'M62 74 Q70 86 78 90'], 3.5)
    + C(64, 56, 20, '#4a3a5a')
    + P('M60 50 L68 50 L64 56 L68 62 L60 62 L64 56 Z', '#e53935', 1.5)
    + luz(58, 44, 6, 3, -20, 0.35)
    + C(38, 66, 13, '#5e4b70')
    + C(32, 62, 3.6, '#ff1744', 1.5) + C(41, 61, 3.6, '#ff1744', 1.5) + C(29, 68, 2.3, '#ff1744', 1.2) + C(38, 69, 2.3, '#ff1744', 1.2)
    + '<circle cx="31" cy="61" r="1.1" fill="#fff"/><circle cx="40" cy="60" r="1.1" fill="#fff"/>'
    + P('M31 76 L29 83 L34 78 Z', '#fff', 1.5) + P('M39 76 L41 83 L36 78 Z', '#fff', 1.5),

  gaviao: () => P('M50 50 Q80 8 98 20 Q88 40 70 56 Z', '#6d4c41')
    + P('M70 70 L96 80 L92 88 L68 78 Z', '#5d4037')
    + pernas(['M54 80 L52 90', 'M64 80 L66 90'], 3.5).replace(new RegExp(K, 'g'), '#ffb300') + pernas(['M48 90 L56 90', 'M62 90 L70 90'], 2.5)
    + E(60, 64, 22, 18, '#8d6e63')
    + E(51, 68, 11, 12, '#efebe9', 0)
    + P('M54 56 Q72 42 90 58 Q76 68 60 70 Z', '#795548')
    + L('M64 58 Q72 56 80 60', '#4e342e', 1.6) + L('M62 63 Q70 62 78 64', '#4e342e', 1.6)
    + C(34, 46, 15, '#f5f5f5')
    + P('M22 42 Q8 41 10 54 Q14 49 22 51 Z', '#ffc107', 2.5)
    + olhoMau(30, 42, 4.8, '#ffc107') + L('M22 34 L38 40', K, 4),

  sapo: () => E(76, 79, 14, 9, '#4caf50')
    + P('M18 74 Q16 46 48 44 Q80 46 80 74 Q80 89 48 89 Q16 89 18 74 Z', '#66bb6a')
    + E(44, 79, 20, 7, '#c5e1a5', 0)
    + C(66, 58, 3, '#388e3c', 0) + C(72, 68, 2.4, '#388e3c', 0) + C(58, 52, 2, '#388e3c', 0)
    + C(30, 44, 10, '#66bb6a') + C(53, 43, 10, '#66bb6a')
    + olhoMau(30, 42, 6, '#ffeb3b') + olhoMau(53, 41, 6, '#ffeb3b')
    + sobr(22, 33, 34, 36) + sobr(46, 35, 59, 31)
    + L('M18 64 Q40 74 64 62', K, 3)
    + P('M20 66 Q8 70 5 80 Q12 75 19 70 Z', '#ff6f91', 2)
    + E(30, 89, 8, 3, '#4caf50', 2),

  mosquito: () => asa(56, 36, 8, 18, -25) + asa(68, 38, 7, 15, 20)
    + pernas(['M44 60 Q36 74 30 90', 'M50 60 Q50 76 46 90', 'M56 60 Q64 76 66 90', 'M60 58 Q76 70 84 86'], 1.8)
    + E(68, 55, 18, 8, '#5d4037')
    + E(80, 55, 6, 5, '#e53935', 0)
    + C(46, 53, 9, '#6d4c41')
    + L('M23 55 L3 61', K, 2.5)
    + C(30, 52, 9, '#795548')
    + olhoMau(28, 50, 5, '#ff1744') + sobr(23, 43, 33, 46),

  jacare: () => P('M66 66 Q90 58 98 74 Q88 77 70 80 Z', '#4e7d32')
    + E(48, 85, 7, 4, '#33691e', 2) + E(74, 85, 7, 4, '#33691e', 2)
    + E(60, 70, 24, 15, '#558b2f')
    + [52, 62, 72].map((x) => P(`M${x - 4} 57 L${x} 51 L${x + 4} 57 Z`, '#33691e', 2)).join('')
    + luz(62, 62, 10, 3, 0, 0.25)
    + P('M8 76 L42 76 L42 82 Q22 82 10 79 Z', '#8bc34a')
    + P('M44 56 Q38 47 27 51 L6 60 Q3 68 8 72 L42 74 Z', '#689f38')
    + [12, 18, 24, 30, 36].map((x) => P(`M${x} 72.5 L${x + 2.5} 77 L${x + 5} 72.8 Z`, '#fff', 1.2)).join('')
    + C(10, 60, 1.6, K, 0)
    + C(34, 49, 7.5, '#689f38')
    + olhoMau(34, 48, 4.6, '#ffeb3b') + L('M27 41 L41 44', K, 3.4),

  barata: () => L('M24 56 Q10 32 2 36', K, 1.8) + L('M26 54 Q20 26 30 14', K, 1.8)
    + pernas(['M40 76 L32 88', 'M56 78 L56 90', 'M72 76 L82 88'], 2.6)
    + P('M24 62 Q26 44 56 44 Q90 46 92 64 Q88 80 56 80 Q26 80 24 62 Z', '#8d5524')
    + L('M40 50 Q62 60 91 62', '#5d3010', 2)
    + luz(56, 51, 16, 3.5, -5, 0.45)
    + E(26, 64, 10, 9, '#5d3010')
    + olhoMau(22, 61, 4, '#ffeb3b') + sobr(16, 55, 26, 58)
    + bravo(21, 70, 3.5),

  mariposa: () => P('M48 50 Q58 4 92 13 Q99 40 60 58 Z', '#7e57c2')
    + C(77, 27, 7, '#ffd54f', 2) + C(77, 27, 3, K, 0)
    + P('M50 58 Q80 58 90 84 Q66 89 50 66 Z', '#9575cd')
    + C(76, 76, 4, '#ffd54f', 1.6)
    + E(46, 62, 8, 16, '#bcaaa4')
    + L('M40 56 h12 M40 63 h12 M41 70 h10', '#8d6e63', 1.4)
    + L('M35 37 Q30 21 21 18', K, 2) + L('M40 36 Q42 21 51 16', K, 2)
    + L('M30 26 l-4 -1 M27 21 l-4 1 M43 26 l4 -2 M46 21 l3 -3', K, 1.4)
    + C(38, 45, 9, '#d7ccc8')
    + olhoMau(34, 44, 4, '#ff4081') + sobr(29, 38, 38, 41)
    + [[14, 40], [20, 60], [10, 70]].map(([x, y]) => estrela(x, y, 3, 1.1, 4, '#fff59d', 1)).join(''),

  camaleao: () => corda('M74 72 Q94 72 92 86 Q90 94 82 91 Q76 88 82 84', '#43a047', 6)
    + pernas(['M40 76 L36 89', 'M64 76 L68 89'], 4)
    + P('M30 60 Q36 42 60 44 Q82 46 80 66 Q76 80 54 80 Q34 80 30 60 Z', '#43a047')
    + L('M46 46 Q50 62 46 78', '#8e24aa', 3) + L('M60 45 Q64 62 60 79', '#8e24aa', 3)
    + luz(56, 52, 10, 3, -5, 0.3)
    + P('M22 50 Q28 28 48 42 Z', '#2e7d32')
    + P('M8 62 Q10 48 30 46 Q42 50 42 62 Q38 72 20 72 Q8 70 8 62 Z', '#4caf50')
    + L('M9 64 Q22 68 35 66', K, 2.5)
    + corda('M9 64 Q0 66 3 73 Q7 76 8 71', '#ff6f91', 2.4)
    + C(28, 56, 8.5, '#66bb6a')
    + olhoMau(27, 56, 4.6, '#ff9800') + L('M20 47 L34 50', K, 3.4),

  escorpiao: () => pernas(['M48 78 L42 89', 'M58 80 L57 90', 'M68 79 L72 89', 'M76 76 L84 87'], 2.6)
    + corda('M70 70 Q92 64 90 40 Q88 22 72 22', '#c0702c', 7)
    + P('M73 22 Q61 15 63 31 Z', '#3e2723', 2.5)
    + E(60, 72, 20, 10, '#d4823a')
    + L('M52 63 Q54 72 52 81', '#9a5420', 1.8) + L('M64 62 Q66 72 64 82', '#9a5420', 1.8)
    + P('M32 60 Q16 50 8 58 Q13 62 9 67 Q18 72 32 66 Z', '#d4823a')
    + P('M32 72 Q16 72 10 82 Q16 84 14 89 Q26 88 34 78 Z', '#d4823a')
    + E(38, 70, 10, 8, '#c0702c')
    + olhoMau(33, 66, 3.6, '#ff1744') + olhoMau(41, 65, 3.6, '#ff1744') + sobr(29, 60, 37, 62),

  ourico: () => espinhosArco(58, 82, 34, 46, 175, 360, 9, '#5d4037')
    + P('M24 84 Q24 46 58 44 Q92 46 92 84 Z', '#8d6e63')
    + luz(58, 54, 12, 4, 0, 0.25)
    + E(31, 73, 14, 11, '#d7ccc8')
    + C(17, 72, 3.6, K, 0)
    + olhoMau(32, 67, 4, '#ffeb3b') + sobr(26, 61, 36, 64)
    + bravo(26, 79, 3.6)
    + E(38, 88, 6, 3, '#4e342e', 2) + E(72, 88, 6, 3, '#4e342e', 2),

  serpente: () => E(62, 82, 32, 9, '#c9a04e')
    + E(64, 73, 24, 8, '#e6c36f')
    + [48, 62, 76].map((x) => P(`M${x - 4} 73 L${x} 69 L${x + 4} 73 L${x} 77 Z`, '#8d5a2b', 0)).join('')
    + [46, 64, 82].map((x) => P(`M${x - 4} 83 L${x} 79 L${x + 4} 83 L${x} 87 Z`, '#8d5a2b', 0)).join('')
    + corda('M62 70 Q40 66 34 46', '#e6c36f', 12)
    + P('M27 30 Q22 12 44 16 Q56 30 46 48 Z', '#c9a04e')
    + P('M15 40 Q19 27 35 29 Q46 33 44 44 Q40 52 26 52 Q15 50 15 40 Z', '#e6c36f')
    + P('M30 34 L34 38 L30 42 L26 38 Z', '#8d5a2b', 0)
    + P('M19 48 L21 56 L24 49 Z', '#fff', 1.5)
    + L('M15 44 L6 46 M6 46 L2 42 M6 46 L2 50', '#e53935', 2)
    + olhoMau(28, 38, 4.5, '#ff1744') + L('M21 31 L35 35', K, 3.4),

  pombo: () => P('M74 66 L96 59 L94 73 Z', '#78909c')
    + pernas(['M54 82 L52 90', 'M64 82 L66 90'], 2.8).replace(new RegExp(K, 'g'), '#ff8a65')
    + E(60, 66, 24, 18, '#b0bec5')
    + P('M54 58 Q74 50 86 64 Q72 77 56 72 Z', '#90a4ae')
    + L('M64 62 L74 66 M62 67 L72 70', '#455a64', 2.4)
    + E(38, 54, 12, 13, '#7e9c96')
    + luz(34, 52, 4, 6, 0, 0.3).replace('#fff', '#d1a5ff')
    + C(32, 40, 11, '#90a4ae')
    + P('M21 39 L13 43 L21 45 Z', '#ffb74d', 2)
    + olhoMau(30, 38, 3.8, '#ff7043') + sobr(25, 32, 35, 35),

  morcego: () => P('M44 50 Q20 30 2 40 Q10 46 8 54 Q16 52 18 60 Q26 56 30 64 Q38 58 44 60 Z', '#4a3b6b')
    + P('M58 50 Q82 30 98 40 Q90 46 92 54 Q84 52 82 60 Q74 56 70 64 Q62 58 58 60 Z', '#4a3b6b')
    + P('M41 42 L38 25 L48 37 Z', '#5e4b8b') + P('M59 37 L66 24 L63 43 Z', '#5e4b8b')
    + E(51, 56, 14, 16, '#5e4b8b')
    + luz(46, 50, 4, 6, -10, 0.3)
    + olhoMau(45, 50, 4, '#ff1744') + olhoMau(57, 50, 4, '#ff1744') + sobr(40, 44, 48, 47) + sobr(54, 47, 62, 44)
    + L('M44 60 Q51 64 58 60', K, 2.6)
    + P('M46 61 L47.5 66 L49 61.6 Z', '#fff', 1.2) + P('M53 61.6 L54.5 66 L56 61 Z', '#fff', 1.2),

  coruja: () => P('M27 34 L22 10 L42 27 Z', '#4a3b6b') + P('M79 34 L84 10 L64 27 Z', '#4a3b6b')
    + E(53, 57, 28, 32, '#5e4b8b')
    + P('M26 52 Q16 70 28 86 Q34 72 32 56 Z', '#4a3b6b') + P('M80 52 Q90 70 78 86 Q72 72 74 56 Z', '#4a3b6b')
    + E(53, 68, 18, 19, '#b39ddb', 0)
    + L('M44 64 q3 3 6 0 M54 64 q3 3 6 0 M48 72 q3 3 6 0 M58 72 q3 3 6 0 M46 80 q3 3 6 0', '#7e57c2', 1.6)
    + C(42, 42, 12, '#d1c4e9') + C(64, 42, 12, '#d1c4e9')
    + olhoMau(42, 42, 7, '#ffd600', 0) + olhoMau(64, 42, 7, '#ffd600', 0)
    + sobr(30, 29, 48, 36) + sobr(58, 36, 76, 29)
    + P('M49 49 L57 49 L53 58 Z', '#ffb300', 2)
    + pernas(['M44 88 L42 93 M48 88 L48 93', 'M58 88 L58 93 M62 88 L64 93'], 2.6).replace(new RegExp(K, 'g'), '#ffb300'),
};

// ---------- Tiros (apontam pra direita; o jogo gira na direção do voo) ----------
const blob = (cor) => P('M8 20 Q8 10 20 10 Q34 12 34 20 Q34 30 20 30 Q8 30 8 20 Z', cor, 2.2) + luz(15, 16, 3, 2, -20, 0.7);
const TIROS = {
  fogo: { s: () => P('M3 20 Q13 9 22 11 Q35 13 35 20 Q35 27 22 29 Q13 31 3 20 Z', '#ff7a1f', 2) + C(26, 20, 6, '#ffd23a', 0) + C(27.5, 19, 2.5, '#fff', 0), rastro: '#ff8a2f' },
  gota: { s: () => P('M5 20 Q22 7 32 15 Q37 20 32 25 Q22 33 5 20 Z', '#5ab4ff', 2.2) + luz(26, 17, 3, 2, 0, 0.7), rastro: '#9fd8ff' },
  espinho: { s: () => P('M3 15 L37 20 L3 25 Z', '#d7e8a8', 2), rastro: '#e6f5c0' },
  pipoca: { s: () => C(16, 21, 7, '#fff8e1', 2) + C(24, 15, 6, '#fff8e1', 2) + C(25, 25, 6, '#fff8e1', 2) + C(18, 22, 3, '#ffd23a', 0), gira: true, rastro: '#fff3c4' },
  folha: { s: () => folha(4, 20, 36, 20, 8, '#6cc24a'), gira: true, rastro: '#8fdc6a' },
  lanca: { s: () => R(2, 18, 30, 4.5, 2, '#b9dc5a', 1.6) + R(14, 17.5, 3, 5.5, 1, '#87ab3c', 1) + P('M30 14 L39 20 L30 26 Z', '#cfd8dc', 1.6), rastro: '#e8f5b0' },
  esporo: { s: () => C(16, 20, 7, '#c79bff', 1.6) + C(25, 14, 5, '#b388ff', 1.6) + C(26, 26, 5, '#d1b3ff', 1.6), gira: true, rastro: '#d9c2ff' },
  laco: { s: () => corda('M20 9 A11 11 0 1 1 19.9 9', '#4caf2e', 3.5), gira: true, rastro: '#6cc24a' },
  veneno: { s: () => blob('#8dff4a') + C(27, 25, 2.2, '#d4ffb0', 0), rastro: '#8dff4a' },
  roxo: { s: () => blob('#b04ad6'), rastro: '#d08cff' },
  marrom: { s: () => blob('#8d5524'), rastro: '#b07a45' },
  estrela: { s: () => estrela(20, 20, 16, 6.5, 5, '#ffd23a', 2), gira: true, rastro: '#fff3a0' },
  onda: { s: () => P('M6 30 Q8 6 35 9 Q20 15 18 32 Z', '#4fc3f7', 2.2) + L('M12 26 Q14 14 28 12', '#fff', 1.6), rastro: '#9fe0ff' },
  semente: { s: () => E(20, 20, 12, 8, '#5d4037', 2.2) + luz(16, 17, 4, 2, -10, 0.5), gira: true, rastro: '#a1887f' },
  pedra: { s: () => P('M8 22 L12 10 L26 8 L34 18 L28 31 L13 31 Z', '#9e9e9e', 2.2) + luz(18, 15, 4, 2, -20, 0.45), gira: true, rastro: '#cfcfcf' },
  ferrao: { s: () => P('M4 16 L37 20 L4 24 Z', K, 1) + R(3, 15, 11, 10, 4, '#ffca28', 1.6), rastro: '#ffe082' },
  teia: { s: () => C(20, 20, 12, 'rgba(255,255,255,.9)', 1.6) + L('M8 20 H32 M20 8 V32 M12 12 L28 28 M28 12 L12 28', '#9e9e9e', 1), gira: true, rastro: '#ffffff' },
  pena: { s: () => folha(3, 22, 37, 18, 6, '#d7ccc8'), gira: true, rastro: '#efebe9' },
  lingua: { s: () => P('M3 20 Q20 11 35 18 Q39 20 35 22 Q20 29 3 20 Z', '#ff6f91', 2), rastro: '#ffb0c4' },
  bolha: { s: () => C(20, 20, 11, 'rgba(180,230,255,.65)', 2) + luz(15, 15, 3, 2, -30, 0.9), rastro: '#d6f2ff' },
  garra: { s: () => P('M8 35 Q31 31 32 5 Q37 29 8 35 Z', '#ff5252', 2) + P('M4 28 Q22 25 24 8 Q27 24 4 28 Z', '#ff8a80', 1.6), rastro: '#ff8a80' },
  sombra: { s: () => C(20, 20, 11, '#4a148c', 2) + C(20, 20, 5, '#b388ff', 0), gira: true, rastro: '#7c4dff' },
  lua: { s: () => P('M25 5 A15 15 0 0 0 25 35 A18 18 0 0 1 25 5 Z', '#fff59d', 2), gira: true, rastro: '#fff9c4' },
  formiga: { s: () => E(13, 20, 6, 5, '#7a2410', 2) + E(26, 20, 8, 6.5, '#a52a16', 2) + C(20, 20, 2.6, K, 0), rastro: '#d0705a' },
  estouro: { s: () => estrela(20, 20, 16, 7, 8, '#ffb020', 2), gira: true, rastro: '#ffd23a' },
};
// Qual tiro usar pra cada emoji de projétil dos dados.
const TIRO_DO_EMOJI = {
  '🔥': 'fogo', '💧': 'gota', '✴️': 'espinho', '🔸': 'espinho', '🍿': 'pipoca', '🍃': 'folha', '🥢': 'lanca',
  '💨': 'esporo', '🌀': 'laco', '🧪': 'veneno', '🟢': 'veneno', '💚': 'veneno', '🟣': 'roxo', '🟤': 'marrom',
  '✨': 'estrela', '🌊': 'onda', '🦷': 'semente', '🪨': 'pedra', '📌': 'ferrao', '📍': 'ferrao',
  '🕸️': 'teia', '🪶': 'pena', '👅': 'lingua', '🫧': 'bolha', '💢': 'garra', '🌑': 'sombra', '🌙': 'lua',
  '🐜': 'formiga', '💥': 'estouro',
};

// ---------- Ícones de habilidade (quadrado arredondado) ----------
const selo = (cor, miolo) => R(2, 2, 36, 36, 9, cor, 2.5) + '<path d="M5 13 Q5 5 13 5 L27 5 Q35 5 35 13 Z" fill="#fff" opacity=".22"/>' + miolo;
const CORES_HAB = {
  area_coluna: '#e5483a', espinhos: '#4f9a3a', rajada: '#f08a24', cura: '#3fb36b', escudo: '#3a8fd6', perfurar: '#2a9d8f',
  sono: '#7e57c2', lentidao: '#5a9e6f', golpe: '#b5532a', energia: '#e0a800', protecao: '#26a6c9', devorar: '#9c2a6a',
};
const HABILIDADES = {
  area_coluna: () => estrela(20, 21, 14, 6, 8, '#ffd23a', 2) + C(20, 21, 4, '#fff', 0),
  espinhos: () => P('M7 32 L12 12 L17 32 Z', '#f5f0c8', 2) + P('M15 32 L20 7 L25 32 Z', '#fff', 2) + P('M23 32 L28 12 L33 32 Z', '#f5f0c8', 2),
  rajada: () => L('M6 14 H12 M6 20 H14 M6 26 H12', '#fff', 2) + C(17, 14, 3.6, '#fff8e1', 1.8) + C(25, 20, 4, '#fff8e1', 1.8) + C(17, 26, 3.6, '#fff8e1', 1.8),
  cura: () => cruz(20, 20, 11, '#fff'),
  escudo: () => P('M20 6 L32 11 Q32 26 20 34 Q8 26 8 11 Z', '#e3f4ff', 2.2) + P('M20 10 L28 13.5 Q28 24 20 30 Z', '#9fd8ff', 0),
  perfurar: () => C(25, 20, 7, 'none', 2) + R(4, 18, 26, 4, 2, '#e8f5b0', 1.6) + P('M29 14 L38 20 L29 26 Z', '#fff', 1.8),
  sono: () => P('M22 7 A12 12 0 1 0 33 23 A9 9 0 0 1 22 7 Z', '#fff59d', 2) + corda('M26 9 H32 L26 16 H32', '#fff', 1.8),
  lentidao: () => C(22, 20, 10, '#f5e1c0', 2) + L('M22 20 m0 -5 a5 5 0 1 1 -5 5 a3 3 0 1 1 3 -3', K, 1.8) + P('M6 32 Q10 26 14 30 L34 32 Z', '#c5e1a5', 1.8),
  golpe: () => `<g transform="rotate(-35 20 20)">${R(18, 14, 4.5, 22, 2, '#8a5a2b', 1.8)}${R(9, 7, 22, 11, 3, '#cfd8dc', 2)}</g>`,
  energia: () => P('M23 4 L10 22 L19 22 L15 36 L30 16 L21 16 Z', '#fff59d', 2),
  protecao: () => C(20, 20, 13, 'rgba(200,240,255,.85)', 2) + luz(15, 14, 4, 2.5, -30, 0.95) + C(26, 26, 2.5, '#fff', 0),
  devorar: () => P('M6 14 Q20 2 34 14 L30 20 L26 15 L22 21 L18 15 L14 21 L10 15 Z', '#fff', 2) + P('M6 26 Q20 38 34 26 L30 21 L26 26 L22 20 L18 26 L14 20 L10 26 Z', '#fff', 2),
};

// ---------- Ícones de status (redondos) ----------
const bola = (cor, miolo) => C(20, 20, 17, cor, 2.5) + '<path d="M7 15 Q10 5 20 4 Q30 5 33 15 Z" fill="#fff" opacity=".22"/>' + miolo;
const STATUS = {
  veneno: () => bola('#6abf3a', gota(20, 22, 1.5, '#d4ffb0') + C(14, 12, 2, '#d4ffb0', 1)),
  queimadura: () => bola('#f26b1d', P('M20 6 Q30 16 28 26 Q26 33 20 33 Q14 33 12 26 Q11 19 17 14 Q17 21 21 22 Q24 16 20 6 Z', '#ffd23a', 2)),
  regeneracao: () => bola('#3fbf6b', cruz(20, 20, 9.5, '#fff')),
  fraqueza: () => bola('#d64545', P('M15 7 H25 V20 H31 L20 33 L9 20 H15 Z', '#fff', 2)),
  casca: () => bola('#8d6e63', P('M20 6 L31 10 Q31 25 20 33 Q9 25 9 10 Z', '#d7ccc8', 2) + L('M20 8 L17 16 L23 20 L18 30', K, 2)),
  sono: () => bola('#7e57c2', corda('M13 12 H27 L13 28 H27', '#fff', 3.5)),
  lento: () => bola('#4a90c2', C(22, 18, 8, '#f5e1c0', 2) + L('M22 18 m0 -4 a4 4 0 1 1 -4 4', K, 1.6) + P('M7 29 Q10 23 14 26 L33 28 Q33 31 30 31 L9 31 Z', '#c5e1a5', 1.8)),
};

// ---------- Chão da batalha (2x2 quadrados de grama) ----------
const EXTRAS = {
  chao: () => '<rect x="0" y="0" width="100" height="100" fill="#4caf2e"/><rect x="50" y="0" width="50" height="50" fill="#43a326"/><rect x="0" y="50" width="50" height="50" fill="#43a326"/>',
};
// Tintas: quadrados de uma cor só, esticados pra pintar barras (vida, XP, progresso).
// Cor de fundo comum o modo escuro do Samsung escurece; letra colorida não.
const TINTAS = { azul: '#3a9ee6', verde: '#5cc23a', amarelo: '#ffd23a', laranja: '#ffb020', vermelho: '#e5483a', ciano: '#7fe3ff' };
for (const [nome, cor] of Object.entries(TINTAS)) EXTRAS[`tinta_${nome}`] = () => `<rect x="0" y="0" width="100" height="100" fill="${cor}"/>`;

// ---------- Montagem ----------
const svg = (miolo, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}" width="${vb === 100 ? 128 : 64}" height="${vb === 100 ? 128 : 64}">${miolo}</svg>`;
const paraUrl = (s) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;

function fonte(tipo, chave) {
  if (tipo === 'u') { const f = PLANTAS[chave] || PRAGAS[chave]; return f && svg(f(), 100); }
  if (tipo === 'tiro') { const t = TIROS[chave]; return t && svg(t.s(), 40); }
  if (tipo === 'hab') { const f = HABILIDADES[chave]; return f && svg(selo(CORES_HAB[chave], f()), 40); }
  if (tipo === 'st') { const f = STATUS[chave]; return f && svg(f(), 40); }
  if (tipo === 'extra') { const f = EXTRAS[chave]; return f && svg(f(), 100); }
  return null;
}

const urls = new Map();
function urlDe(tipo, chave) {
  const k = `${tipo}:${chave}`;
  if (!urls.has(k)) { const s = fonte(tipo, chave); urls.set(k, s ? paraUrl(s) : null); }
  return urls.get(k);
}

// Emoji → id (pra telas que só têm o emoji da planta/praga em mãos).
const porEmoji = new Map();
export function iniciarArte(dados) {
  for (const u of [...(dados.plantas || []), ...(dados.pragas || [])]) if (!porEmoji.has(u.emoji)) porEmoji.set(u.emoji, u.id);
  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.load(`32px ${FONTE}`).then(() => { fontePronta = true; }).catch(() => {});
  }
  // As barras do HTML pintam com estas letras pelo CSS (content: var(--tinta-azul) etc.).
  if (typeof document !== 'undefined') {
    for (const nome of Object.keys(TINTAS)) {
      const cp = GLIFOS[`extra:tinta_${nome}`];
      if (cp) document.documentElement.style.setProperty(`--tinta-${nome}`, `"\\${cp.toString(16)}"`);
    }
  }
}

// ---------- Fonte colorida ----------
// No jogo, cada desenho é uma "letra" da fonte art/arte.woff2 (gerada por tools/fonte-cor/gerar.sh).
// Motivo: o modo escuro do Samsung Internet desbota imagens e canvas, mas não mexe em letras
// coloridas (igual emoji). Os SVG acima continuam sendo a fonte da verdade dos desenhos.
// Medidas da fonte: um desenho de S px usa font-size 0.8533·S; a letra começa S/32 à esquerda
// do desenho, e a linha de base fica 0.7917·S abaixo do topo dele.
export const FONTE = 'ArteHorta';
let fontePronta = false;
export function glifo(tipo, chave) {
  const cp = GLIFOS[`${tipo}:${chave}`];
  return cp ? String.fromCodePoint(cp) : null;
}
const span = (tipo, chave, classe) => {
  const cp = GLIFOS[`${tipo}:${chave}`];
  return cp ? `<span class="glifo ${classe}" aria-hidden="true">&#x${cp.toString(16)};</span>` : '';
};

// ---------- Para o HTML ----------
// arte(planta ou praga): o desenho do tamanho da letra (substitui o emoji). Sem desenho, devolve o emoji.
export function arte(u, classe = '') {
  if (!u) return '';
  const id = (u.id && (PLANTAS[u.id] || PRAGAS[u.id])) ? u.id : porEmoji.get(u.emoji);
  return (id && span('u', id, `arte${classe ? ` ${classe}` : ''}`)) || u.emoji || '';
}
export const iconeHabilidade = (tipo) => span('hab', tipo, 'icone-hab') || '✨';
export const iconeStatus = (nome) => span('st', nome, 'icone-status');

// ---------- Para o Canvas ----------
// Desenha o desenho ocupando o quadrado (x, y, lado). Devolve false se a fonte ainda não carregou.
export function desenharGlifo(ctx, tipo, chave, x, y, lado) {
  const g = fontePronta && glifo(tipo, chave);
  if (!g) return false;
  ctx.font = `${lado * 0.8533}px ${FONTE}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.fillText(g, x - lado / 32, y + lado * 0.7917);
  return true;
}
export const artePronta = () => fontePronta;
// Retângulo pintado com tinta da fonte (cor que o modo escuro não estraga). Sem fonte, pinta normal.
export function pintarRetangulo(ctx, nome, x, y, larg, alt) {
  if (larg <= 0 || alt <= 0) return;
  if (!fontePronta || !glifo('extra', `tinta_${nome}`)) {
    ctx.fillStyle = TINTAS[nome] || '#fff';
    ctx.fillRect(x, y, larg, alt);
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, larg, alt);
  ctx.clip();
  ctx.translate(x, y);
  ctx.scale(larg / alt, 1);
  desenharGlifo(ctx, 'extra', `tinta_${nome}`, -alt * 0.2, -alt * 0.2, alt * 1.4);
  ctx.restore();
}
export function infoTiro(emoji) {
  const chave = TIRO_DO_EMOJI[emoji];
  if (!chave) return null;
  return { chave, gira: !!TIROS[chave].gira, rastro: TIROS[chave].rastro };
}
export const corHabilidade = (tipo) => CORES_HAB[tipo] || '#ffd23a';

// Galeria e gerador da fonte: todos os ids com desenho.
export const idsComArte = () => ({ plantas: Object.keys(PLANTAS), pragas: Object.keys(PRAGAS), tiros: Object.keys(TIROS), habilidades: Object.keys(HABILIDADES), status: Object.keys(STATUS), extras: Object.keys(EXTRAS) });
export const urlArte = urlDe;

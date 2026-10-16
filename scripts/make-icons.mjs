// Gera os ícones PNG do app (public/icons/*.png) e confere o favicon SVG.
// Uso: node scripts/make-icons.mjs
//
// Desenho: antena vertical com ondas dos dois lados e dois radiais (um ground plane),
// em azul-escuro. Sem dependências: rasteriza formas simples com suavização 3×3 e
// escreve o PNG à mão (zlib + CRC32).

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [0x1f, 0x3a, 0x5f];
const FG = [0xe8, 0xee, 0xf7];
const ACCENT = [0x8f, 0xb4, 0xe3];

/** Distância de (px,py) ao segmento (ax,ay)-(bx,by). */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Cor do desenho em (u,v), coordenadas normalizadas 0..1, ou null para fundo. */
function shapeColor(u, v) {
  const cx = 0.5;
  const cy = 0.34; // topo da antena
  if (Math.hypot(u - cx, v - cy) <= 0.05) return ACCENT;
  if (distToSegment(u, v, cx, cy, cx, 0.74) <= 0.022) return FG;
  for (const [x2, y2] of [[0.33, 0.85], [0.67, 0.85]]) {
    if (distToSegment(u, v, cx, 0.74, x2, y2) <= 0.018) return FG;
  }
  // Ondas: arcos a ±38° da horizontal, nos dois lados.
  const r = Math.hypot(u - cx, v - cy);
  const angle = Math.abs(Math.atan2(v - cy, Math.abs(u - cx)));
  for (const radius of [0.15, 0.25]) {
    if (Math.abs(r - radius) <= 0.018 && angle <= (38 * Math.PI) / 180) return ACCENT;
  }
  return null;
}

/** Retângulo arredondado: dentro? (coordenadas 0..1) */
function insideRounded(u, v, radius) {
  const x = Math.min(u, 1 - u);
  const y = Math.min(v, 1 - v);
  if (x >= radius || y >= radius) return true;
  return Math.hypot(radius - x, radius - y) <= radius;
}

function render(size, { maskable }) {
  // Maskable: fundo até as bordas e desenho dentro da zona segura (80 % central).
  // Normal: cantos arredondados e desenho um pouco maior.
  const scale = maskable ? 0.74 : 0.92;
  const radius = 0.18;
  const pixels = Buffer.alloc(size * size * 4);
  const SS = 3;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (!maskable && !insideRounded(u, v, radius)) continue;
          const color = shapeColor((u - 0.5) / scale + 0.5, (v - 0.5) / scale + 0.5) ?? BG;
          r += color[0]; g += color[1]; b += color[2]; a += 255;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      const covered = a / 255;
      pixels[i] = covered ? Math.round(r / covered) : 0;
      pixels[i + 1] = covered ? Math.round(g / covered) : 0;
      pixels[i + 2] = covered ? Math.round(b / covered) : 0;
      pixels[i + 3] = Math.round(a / n);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // 8 bits por canal
  header[9] = 6; // RGBA
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // filtro "nenhum"
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
const icons = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];
for (const [name, size, maskable] of icons) {
  writeFileSync(`public/icons/${name}`, encodePng(size, render(size, { maskable })));
  console.log(`public/icons/${name} (${size}×${size}${maskable ? ', maskable' : ''})`);
}

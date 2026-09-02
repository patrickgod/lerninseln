// The home-screen icons, drawn here rather than in a paint program.
//
//   node tools/icons.mjs
//
// Written as a build tool for the same reason the sprites are written
// in code: the icon has to agree with the palette, and a PNG exported
// once from somewhere else drifts the moment the palette moves.
//
// The PNG encoder below is about forty lines because a PNG is a zlib
// stream of filtered scanlines wrapped in four chunks, and Node ships
// both zlib and crc32-able buffers. That is cheaper than a dependency.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// ------------------------------------------------------------ encoder

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** rgba is a Uint8ClampedArray of w*h*4. */
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;                       // filter: none
    Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;      // bit depth
  ihdr[9] = 6;      // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ----------------------------------------------------------- the icon

// Straight from src/core/palette.ts. Kept short on purpose: an icon
// that needs more than eight colours is not an icon.
const C = {
  seaDeep: '#173a5c',
  sea: '#1f5479',
  foam: '#9ad9d8',
  sand: '#e0c694',
  grassDark: '#3f6c3a',
  grass: '#548544',
  grassLit: '#6da052',
  earth: '#664a31',
  earthDark: '#4a3524',
  plaster: '#f8f0dc',
  plasterDim: '#d6c4a0',
  roof: '#b5573f',
  roofLit: '#d17550',
  ink: '#241d2b',
  leaf: '#356338',
  leafLit: '#4d8244',
};

const N = 64;                       // the icon is drawn at 64 and scaled
const buf = new Uint8ClampedArray(N * N * 4);

function px(x, y, hex) {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  const n = parseInt(hex.slice(1), 16);
  const i = (y * N + x) * 4;
  buf[i] = (n >> 16) & 255;
  buf[i + 1] = (n >> 8) & 255;
  buf[i + 2] = n & 255;
  buf[i + 3] = 255;
}

function rect(x, y, w, h, hex) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, hex);
}

/** An isometric diamond: half-width hw, half-height hw/2. */
function diamond(cx, cy, hw, hex) {
  const hh = hw / 2;
  for (let y = -hh; y <= hh; y++) {
    const half = Math.floor(hw * (1 - Math.abs(y) / hh));
    for (let x = -half; x <= half; x++) px(cx + x, cy + y, hex);
  }
}

// Sea. Scattered, NOT a diagonal dither: at icon size a regular
// diagonal reads as a striped awning rather than as water.
rect(0, 0, N, N, C.sea);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const h = (x * 73856093) ^ (y * 19349663);
    if ((h >>> 3) % 29 === 0) px(x, y, C.seaDeep);
    if ((h >>> 7) % 53 === 0) px(x, y, C.foam);
  }
}

const CX = 32, CY = 38;

// The island: sand rim, cliff, grass on top. Same anatomy as the game.
diamond(CX, CY + 5, 27, C.sand);
for (let x = -27; x <= 27; x++) {
  const edgeY = CY + 5 + Math.floor((27 - Math.abs(x)) / 2);
  for (let j = 1; j <= 6; j++) px(CX + x, edgeY + j, x < 0 ? C.earth : C.earthDark);
}
diamond(CX, CY + 4, 23, C.grass);
for (let i = 0; i < 90; i++) {
  const a = (i * 2.399), d = Math.sqrt((i % 17) / 17);
  const x = CX + Math.round(Math.cos(a) * d * 20);
  const y = CY + 4 + Math.round(Math.sin(a) * d * 9);
  px(x, y, i % 3 ? C.grassLit : C.grassDark);
}

// Two trees behind, so the icon has depth at 48 pixels.
for (const [tx, ty] of [[15, 37], [49, 39]]) {
  rect(tx - 1, ty, 2, 6, C.earthDark);
  for (let y = -5; y <= 3; y++) {
    const half = Math.floor(5 * Math.sqrt(Math.max(0, 1 - (y / 6) ** 2)));
    for (let x = -half; x <= half; x++) px(tx + x, ty - 4 + y, x + y < -2 ? C.leafLit : C.leaf);
  }
}

// The house: two wall faces and a hip roof, light from the upper left.
const HX = 32, HB = 44, HW = 9, WALLH = 11;
for (let x = -HW; x <= HW; x++) {
  const yBot = HB + Math.round((HW - Math.abs(x)) / 2);
  for (let j = 0; j < WALLH; j++) px(HX + x, yBot - j, x < 0 ? C.plaster : C.plasterDim);
}
for (let step = 0; step <= 9; step++) {
  const w = Math.round((HW + 3) * (1 - step / 10));
  const h = Math.max(1, Math.round(w / 2));
  for (let y = -h; y <= h; y++) {
    const half = Math.floor(w * (1 - Math.abs(y) / (h + 0.5)));
    for (let x = -half; x <= half; x++) {
      const u = x / Math.max(1, w) + y / Math.max(1, h);
      const v = x / Math.max(1, w) - y / Math.max(1, h);
      px(HX + x, HB - WALLH - step + y, v < -Math.abs(u) ? C.roofLit : u > Math.abs(v) ? C.roof : C.roofLit);
    }
  }
}
rect(HX - 3, HB - 6, 4, 7, C.ink);
rect(HX - 2, HB - 5, 2, 6, C.earth);

// --------------------------------------------------------------- out

function scale(src, from, factor) {
  const to = from * factor;
  const out = new Uint8ClampedArray(to * to * 4);
  for (let y = 0; y < to; y++) {
    for (let x = 0; x < to; x++) {
      const si = ((y / factor | 0) * from + (x / factor | 0)) * 4;
      const di = (y * to + x) * 4;
      out[di] = src[si]; out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2]; out[di + 3] = src[si + 3];
    }
  }
  return out;
}

mkdirSync('public/icons', { recursive: true });
for (const [size, factor] of [[192, 3], [512, 8]]) {
  const s = size / factor;
  if (s !== N) {
    // 192 = 64*3 and 512 = 64*8, both exact. Nearest-neighbour only
    // stays crisp at integer factors, so this asserts rather than
    // quietly producing a blurry icon.
    throw new Error(`icon size ${size} is not an integer multiple of ${N}`);
  }
  writeFileSync(`public/icons/icon-${size}.png`, png(size, size, scale(buf, N, factor)));
  console.log(`  public/icons/icon-${size}.png`);
}

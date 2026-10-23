/* Favicon, apple touch icon, and the generic Open Graph card.
 * No image library: a tiny RGBA PNG writer and a 5×7 wordmark.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");

const GLYPH = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ",": ["00000", "00000", "00000", "00000", "00110", "00100", "01000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
};

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function png(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function rgb(hex) {
  const n = hex.replace("#", "");
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16), 255];
}

function create(width, height) {
  return { width, height, data: Buffer.alloc(width * height * 4) };
}

function put(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = (y * image.width + x) * 4;
  image.data[i] = color[0];
  image.data[i + 1] = color[1];
  image.data[i + 2] = color[2];
  image.data[i + 3] = color[3];
}

function fill(image, color) {
  for (let i = 0; i < image.data.length; i += 4) {
    image.data[i] = color[0];
    image.data[i + 1] = color[1];
    image.data[i + 2] = color[2];
    image.data[i + 3] = color[3];
  }
}

function fillRoundRect(image, radius, color) {
  const { width, height } = image;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const cx = Math.min(Math.max(px, radius), width - radius);
      const cy = Math.min(Math.max(py, radius), height - radius);
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy <= radius * radius) put(image, x, y, color);
    }
  }
}

function fillCircle(image, cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) put(image, x, y, color);
    }
  }
}

function textWidth(text, scale, gap) {
  return text.length * (5 * scale + gap) - gap;
}

function drawText(image, text, x, y, scale, gap, color) {
  let cursor = x;
  for (const char of text) {
    const rows = GLYPH[char];
    if (!rows) throw new Error(`brand-assets: no glyph for ${JSON.stringify(char)}`);
    for (let row = 0; row < rows.length; row++) {
      for (let col = 0; col < rows[row].length; col++) {
        if (rows[row][col] !== "1") continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) put(image, cursor + col * scale + dx, y + row * scale + dy, color);
        }
      }
    }
    cursor += 5 * scale + gap;
  }
}

const ink = rgb("#ededed");
const muted = rgb("#a1a1aa");
const ground = rgb("#09090b");
const blue = rgb("#3b82f6");
const clear = [0, 0, 0, 0];

function mark(size, scale, rounded) {
  const image = create(size, size);
  fill(image, clear);
  if (rounded) fillRoundRect(image, Math.round(size * 0.22), ground);
  else fill(image, ground);
  const width = 5 * scale;
  const height = 7 * scale;
  drawText(image, "S", Math.round((size - width) / 2), Math.round((size - height) / 2), scale, 0, ink);
  return image;
}

function ogCard() {
  const image = create(1200, 630);
  fill(image, ground);
  const word = "SHOGOL";
  const scale = 16;
  const gap = 8;
  const x = 88;
  const y = 168;
  drawText(image, word, x, y, scale, gap, ink);
  fillCircle(image, 56, y + (7 * scale) / 2, 7, blue);
  const ruleY = y + 7 * scale + 36;
  const ruleEnd = x + textWidth(word, scale, gap);
  for (let px = x; px < ruleEnd; px++) put(image, px, ruleY, rgb("#3f3f46"));
  drawText(image, "LONG-FORM SERIES", 88, ruleY + 36, 5, 4, muted);
  drawText(image, "ON AI, GO, AND PHILOSOPHY", 88, ruleY + 36 + 7 * 5 + 16, 5, 4, muted);
  drawText(image, "BORIS SHOGOL", 88, 540, 4, 3, ink);
  return image;
}

mkdirSync(publicDir, { recursive: true });
const favicon = mark(64, 6, true);
const apple = mark(180, 16, false);
const og = ogCard();
writeFileSync(resolve(publicDir, "favicon.png"), png(favicon.width, favicon.height, favicon.data));
writeFileSync(resolve(publicDir, "apple-touch-icon.png"), png(apple.width, apple.height, apple.data));
writeFileSync(resolve(publicDir, "og.png"), png(og.width, og.height, og.data));
console.log("brand: favicon, apple-touch-icon, og.png");

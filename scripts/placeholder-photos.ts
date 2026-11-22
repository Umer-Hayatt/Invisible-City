import { deflateSync } from "node:zlib";

/** Tiny PNG encoder: a vertical gradient from `top` to `bottom`. Used for seed "photos". */
function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function gradientPng(top: [number, number, number], bottom: [number, number, number], w = 640, h = 400) {
  const rows: Buffer[] = [];
  for (let y = 0; y < h; y++) {
    const t = y / (h - 1);
    const row = Buffer.alloc(1 + w * 3);
    for (let x = 0; x < w; x++) {
      const stripe = (Math.floor(x / 40) + Math.floor(y / 40)) % 2 ? 10 : 0; // light checker so it reads as an image
      for (let c = 0; c < 3; c++) row[1 + x * 3 + c] = Math.min(255, Math.round(top[c] + (bottom[c] - top[c]) * t) + stripe);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export const PLACEHOLDER_COLORS: Record<string, [[number, number, number], [number, number, number]]> = {
  road_damage: [[90, 90, 95], [40, 40, 45]],
  garbage: [[120, 100, 60], [60, 50, 30]],
  streetlight: [[30, 40, 80], [10, 10, 30]],
  water_leak: [[70, 130, 190], [30, 70, 120]],
  drainage: [[80, 110, 90], [35, 55, 45]],
  blocked_footpath: [[150, 130, 110], [90, 75, 60]],
  accessibility: [[130, 100, 170], [70, 50, 100]],
  fixed: [[110, 180, 120], [50, 110, 60]],
};

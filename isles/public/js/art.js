// Shellfire Isles — procedural pixel art. Every sprite and tile is painted at
// runtime from parameters; there are no image assets anywhere in the project.

import { SPECIES } from './data.js';

// ---------- tiny 32x32 rasterizer ----------
const S = 32;
function raster() { return new Array(S * S).fill(null); }
function px(g, x, y, c) { x |= 0; y |= 0; if (x >= 0 && x < S && y >= 0 && y < S) g[y * S + x] = c; }
function ellipse(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) px(g, x, y, c);
    }
}
function rect(g, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(g, x + i, y + j, c); }
function tri(g, x, y, w, h, c, up = true) { // isoceles triangle
  for (let j = 0; j < h; j++) {
    const rowW = Math.max(1, Math.round(w * (up ? j / h : 1 - j / h)));
    rect(g, x + Math.floor((w - rowW) / 2), y + j, rowW, 1, c);
  }
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
  return '#' + [16, 8, 0].map(i => ch(i).toString(16).padStart(2, '0')).join('');
}
function outline(g) {
  const out = g.slice();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (g[y * S + x]) continue;
    const near = [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && nx < S && ny >= 0 && ny < S && g[ny * S + nx] && g[ny * S + nx] !== 'OUT';
    });
    if (near) out[y * S + x] = 'OUT';
  }
  return out;
}

// ---------- creature painter ----------
function paintMon(id, back) {
  const look = SPECIES[id].look;
  const g = raster();
  const { c1, c2, belly } = look;
  const dark = shade(c1, 0.65);

  const bulky = look.shape === 'bulky', round = look.shape === 'round';
  const bodyCy = bulky ? 19 : 20;
  const rx = bulky ? 10 : round ? 8 : 7;
  const ry = bulky ? 9 : round ? 8 : 8;

  // features behind the body
  if (look.features.includes('wings')) {
    ellipse(g, 16 - rx - 2, bodyCy - 4, 5, 3, c2);
    ellipse(g, 16 + rx + 2, bodyCy - 4, 5, 3, c2);
  }
  if (look.features.includes('mothwings')) {
    ellipse(g, 16 - rx - 3, bodyCy - 5, 6, 5, c2);
    ellipse(g, 16 + rx + 3, bodyCy - 5, 6, 5, c2);
    ellipse(g, 16 - rx - 3, bodyCy + 2, 4, 3, shade(c2, 1.3));
    ellipse(g, 16 + rx + 3, bodyCy + 2, 4, 3, shade(c2, 1.3));
  }
  if (look.features.includes('tail')) ellipse(g, 16 + rx + 3, bodyCy + 4, 4, 2, c1);
  if (look.features.includes('tailflame')) {
    ellipse(g, 16 + rx + 3, bodyCy + 3, 3, 2, c1);
    ellipse(g, 16 + rx + 5, bodyCy + 1, 2, 3, '#f5a623');
    px(g, 16 + rx + 5, bodyCy - 2, '#ffd76a');
  }

  // body
  ellipse(g, 16, bodyCy, rx, ry, c1);
  if (look.features.includes('shell')) {
    ellipse(g, 16, bodyCy + 1, rx - 1, ry - 2, c2);           // shell dome
    ellipse(g, 16, bodyCy + 2, rx - 4, ry - 5, shade(c2, 1.25));
  }
  if (look.features.includes('rockplates')) {
    for (const [ox, oy] of [[-4, -3], [3, -4], [-1, 1], [5, 2], [-6, 3]])
      rect(g, 16 + ox, bodyCy + oy, 3, 3, c2);
  }
  if (!back) ellipse(g, 16, bodyCy + 3, Math.max(2, rx - 4), Math.max(2, ry - 4), belly);
  if (look.features.includes('bolt') && !back) {
    px(g, 14, bodyCy - 2, c2); px(g, 15, bodyCy - 1, c2); px(g, 14, bodyCy, c2);
    px(g, 17, bodyCy + 1, c2); px(g, 18, bodyCy + 2, c2);
  }

  // head
  const headCy = round ? bodyCy - ry - 2 : bodyCy - ry - 3;
  const hr = round ? 6 : bulky ? 6 : 5;
  ellipse(g, 16, headCy, hr, hr - 1, c1);
  if (look.features.includes('mask') && !back) ellipse(g, 16, headCy - 1, hr - 1, 2, c2);

  // face (front only)
  if (!back) {
    px(g, 14, headCy, '#101018'); px(g, 18, headCy, '#101018');
    px(g, 14, headCy - 1, '#ffffff'); px(g, 18, headCy - 1, '#ffffff');
    if (look.features.includes('fangs')) { px(g, 14, headCy + 3, '#ffffff'); px(g, 18, headCy + 3, '#ffffff'); }
  } else {
    ellipse(g, 16, headCy, hr - 2, hr - 3, shade(c1, 0.85));
  }

  // head features
  if (look.features.includes('ears')) {
    tri(g, 11, headCy - hr - 3, 4, 4, c1); tri(g, 17, headCy - hr - 3, 4, 4, c1);
  }
  if (look.features.includes('horns')) {
    tri(g, 10, headCy - hr - 3, 3, 4, belly); tri(g, 19, headCy - hr - 3, 3, 4, belly);
  }
  if (look.features.includes('crest')) tri(g, 14, headCy - hr - 4, 5, 5, c2);
  if (look.features.includes('sprout')) {
    px(g, 16, headCy - hr - 1, '#33702a'); px(g, 16, headCy - hr - 2, '#33702a');
    ellipse(g, 14, headCy - hr - 3, 2, 1, '#5aa845'); ellipse(g, 18, headCy - hr - 3, 2, 1, '#5aa845');
  }
  if (look.features.includes('whiskers') && !back) {
    rect(g, 9, headCy, 3, 1, c2); rect(g, 20, headCy, 3, 1, c2);
  }
  if (look.features.includes('fins')) {
    tri(g, 14, headCy - hr - 3, 4, 4, c2);
    tri(g, 16 - rx - 3, bodyCy, 3, 3, c2); tri(g, 16 + rx, bodyCy, 3, 3, c2);
  }
  if (look.features.includes('spout')) { // back-mounted geyser vent
    rect(g, 14, bodyCy - ry - 1, 4, 3, c2);
    rect(g, 15, bodyCy - ry - 2, 2, 1, shade(c2, 0.7));
    px(g, 15, bodyCy - ry - 4, '#bfe8ff'); px(g, 17, bodyCy - ry - 5, '#bfe8ff'); px(g, 16, bodyCy - ry - 6, '#e8f7ff');
  }
  if (look.features.includes('blade')) { // forearm leaf blades
    ellipse(g, 16 - rx - 2, bodyCy, 3, 1, '#8fd45a'); ellipse(g, 16 + rx + 2, bodyCy, 3, 1, '#8fd45a');
  }

  // feet
  ellipse(g, 12, bodyCy + ry, 2, 1, dark); ellipse(g, 20, bodyCy + ry, 2, 1, dark);

  return outline(g);
}

const monCache = new Map();
export function monCanvas(id, back = false, scale = 4) {
  const key = `${id}|${back}|${scale}`;
  if (monCache.has(key)) return monCache.get(key);
  const g = paintMon(id, back);
  const cv = document.createElement('canvas');
  cv.width = S * scale; cv.height = S * scale;
  const ctx = cv.getContext('2d');
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const c = g[y * S + x];
    if (!c) continue;
    ctx.fillStyle = c === 'OUT' ? '#1a1a24' : c;
    ctx.fillRect(x * scale, y * scale, scale, scale);
  }
  monCache.set(key, cv);
  return cv;
}

// ---------- overworld tiles (16x16, painted once) ----------
export const TILE = 16;
const tileCache = new Map();

function tileCanvas(name, painter) {
  if (tileCache.has(name)) return tileCache.get(name);
  const cv = document.createElement('canvas');
  cv.width = TILE; cv.height = TILE;
  painter(cv.getContext('2d'));
  tileCache.set(name, cv);
  return cv;
}
const P = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
const R = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
// deterministic pseudo-random speckle
const hash = (x, y, s) => { let h = x * 374761393 + y * 668265263 + s * 2246822519; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };

export function getTile(name, frame = 0) {
  switch (name) {
    case 'grass': return tileCanvas('grass', ctx => {
      R(ctx, 0, 0, 16, 16, '#7ec850');
      for (let i = 0; i < 14; i++) { const x = Math.floor(hash(i, 3, 1) * 16), y = Math.floor(hash(i, 7, 2) * 16); P(ctx, x, y, '#6cb545'); }
      for (let i = 0; i < 5; i++) { const x = Math.floor(hash(i, 11, 3) * 16), y = Math.floor(hash(i, 13, 4) * 16); P(ctx, x, y, '#94d968'); }
    });
    case 'tall': return tileCanvas('tall', ctx => {
      R(ctx, 0, 0, 16, 16, '#5aa845');
      for (let x = 1; x < 16; x += 3) { R(ctx, x, 4, 1, 11, '#3e7d33'); R(ctx, x + 1, 2, 1, 13, '#4e9440'); }
      R(ctx, 0, 14, 16, 2, '#3e7d33');
    });
    case 'path': return tileCanvas('path', ctx => {
      R(ctx, 0, 0, 16, 16, '#e0c88f');
      for (let i = 0; i < 10; i++) { const x = Math.floor(hash(i, 5, 5) * 16), y = Math.floor(hash(i, 9, 6) * 16); P(ctx, x, y, '#cdb376'); }
    });
    case 'flower': return tileCanvas('flower', ctx => {
      ctx.drawImage(getTile('grass'), 0, 0);
      R(ctx, 3, 3, 2, 2, '#e86a6a'); R(ctx, 10, 9, 2, 2, '#f0d05a'); P(ctx, 4, 5, '#3e7d33'); P(ctx, 11, 11, '#3e7d33');
    });
    case 'water': return tileCanvas('water' + (frame % 2), ctx => {
      R(ctx, 0, 0, 16, 16, '#3f74c9');
      const o = frame % 2 ? 2 : 0;
      for (let y = 2; y < 16; y += 5) { R(ctx, (y + o) % 8, y, 5, 1, '#6699e0'); R(ctx, ((y + o) % 8) + 8, y + 2, 4, 1, '#2f5aa0'); }
    });
    case 'waterfall': return tileCanvas('waterfall' + (frame % 2), ctx => {
      R(ctx, 0, 0, 16, 16, '#5588d9');
      for (let x = 0; x < 16; x += 3) R(ctx, x, (frame % 2) * 2, 1, 16, '#a8ccf0');
      R(ctx, 0, 14, 16, 2, '#cfe4f7');
    });
    case 'tree': return tileCanvas('tree', ctx => {
      ctx.drawImage(getTile('grass'), 0, 0);
      R(ctx, 6, 10, 4, 5, '#7d5a2e');
      ctx.fillStyle = '#2f6b2a'; ctx.beginPath(); ctx.arc(8, 6, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#3e8535'; ctx.beginPath(); ctx.arc(6, 5, 4, 0, 7); ctx.fill();
    });
    case 'cuttree': return tileCanvas('cuttree', ctx => {
      ctx.drawImage(getTile('grass'), 0, 0);
      R(ctx, 4, 6, 8, 8, '#4e9440'); R(ctx, 5, 5, 6, 2, '#5fae4e'); R(ctx, 6, 13, 4, 2, '#7d5a2e');
      R(ctx, 6, 8, 1, 1, '#2f6b2a'); R(ctx, 9, 10, 1, 1, '#2f6b2a');
    });
    case 'boulder': return tileCanvas('boulder', ctx => {
      ctx.drawImage(getTile('path'), 0, 0);
      ctx.fillStyle = '#8d8578'; ctx.beginPath(); ctx.arc(8, 9, 6, 0, 7); ctx.fill();
      R(ctx, 4, 6, 3, 2, '#a8a094'); R(ctx, 9, 10, 3, 2, '#6b6355'); R(ctx, 3, 12, 10, 2, '#57503f');
    });
    case 'crackrock': return tileCanvas('crackrock', ctx => {
      ctx.drawImage(getTile('path'), 0, 0);
      ctx.fillStyle = '#a08d6b'; ctx.beginPath(); ctx.arc(8, 9, 6, 0, 7); ctx.fill();
      ctx.strokeStyle = '#57503f'; ctx.beginPath(); ctx.moveTo(8, 3); ctx.lineTo(6, 8); ctx.lineTo(10, 10); ctx.lineTo(7, 14); ctx.stroke();
    });
    case 'mount': return tileCanvas('mount', ctx => {
      R(ctx, 0, 0, 16, 16, '#8d7a5e');
      R(ctx, 0, 0, 16, 3, '#a8946f'); R(ctx, 0, 13, 16, 3, '#6b5a42');
      for (let i = 0; i < 6; i++) P(ctx, Math.floor(hash(i, 2, 9) * 16), 3 + Math.floor(hash(i, 4, 8) * 10), '#7a684c');
    });
    case 'cavefloor': return tileCanvas('cavefloor', ctx => {
      R(ctx, 0, 0, 16, 16, '#57503f');
      for (let i = 0; i < 8; i++) P(ctx, Math.floor(hash(i, 1, 10) * 16), Math.floor(hash(i, 6, 11) * 16), '#6b6350');
    });
    case 'cavewall': return tileCanvas('cavewall', ctx => {
      R(ctx, 0, 0, 16, 16, '#3a3428');
      R(ctx, 0, 0, 16, 2, '#4e4636'); R(ctx, 0, 14, 16, 2, '#2a2419');
      R(ctx, 3, 5, 4, 3, '#332d22'); R(ctx, 10, 9, 4, 3, '#332d22');
    });
    case 'sand': return tileCanvas('sand', ctx => {
      R(ctx, 0, 0, 16, 16, '#efe0ab');
      for (let i = 0; i < 8; i++) P(ctx, Math.floor(hash(i, 8, 12) * 16), Math.floor(hash(i, 12, 13) * 16), '#ddc98c');
    });
    case 'floor': return tileCanvas('floor', ctx => {
      R(ctx, 0, 0, 16, 16, '#d9c9a8');
      R(ctx, 0, 0, 16, 1, '#c4b28c'); R(ctx, 0, 8, 16, 1, '#c4b28c'); R(ctx, 8, 0, 1, 16, '#c4b28c'); R(ctx, 0, 0, 1, 16, '#c4b28c');
    });
    case 'wall': return tileCanvas('wall', ctx => {
      R(ctx, 0, 0, 16, 16, '#8a6d9e');
      R(ctx, 0, 12, 16, 4, '#6b5480'); R(ctx, 0, 0, 16, 2, '#a488b8');
      R(ctx, 4, 4, 8, 6, '#584268');
    });
    case 'gymwall': return tileCanvas('gymwall', ctx => {
      R(ctx, 0, 0, 16, 16, '#9e5a3a');
      R(ctx, 0, 12, 16, 4, '#7a4229'); R(ctx, 0, 0, 16, 2, '#b8714a'); R(ctx, 4, 4, 8, 6, '#5e3220');
    });
    case 'roof': return tileCanvas('roof', ctx => {
      R(ctx, 0, 0, 16, 16, '#d95f5f');
      R(ctx, 0, 0, 16, 2, '#e88a8a'); R(ctx, 0, 14, 16, 2, '#a83c3c'); R(ctx, 0, 7, 16, 1, '#a83c3c');
    });
    case 'roofblue': return tileCanvas('roofblue', ctx => {
      R(ctx, 0, 0, 16, 16, '#5f7ad9');
      R(ctx, 0, 0, 16, 2, '#8a9de8'); R(ctx, 0, 14, 16, 2, '#3c50a8'); R(ctx, 0, 7, 16, 1, '#3c50a8');
    });
    case 'housewall': return tileCanvas('housewall', ctx => {
      R(ctx, 0, 0, 16, 16, '#e8dcc0');
      R(ctx, 0, 0, 16, 1, '#c9bd9e'); R(ctx, 2, 4, 5, 6, '#7ab0d9'); R(ctx, 9, 4, 5, 6, '#7ab0d9');
      R(ctx, 2, 4, 5, 1, '#4a6b8a'); R(ctx, 9, 4, 5, 1, '#4a6b8a');
    });
    case 'door': return tileCanvas('door', ctx => {
      ctx.drawImage(getTile('housewall'), 0, 0);
      R(ctx, 4, 3, 8, 13, '#7d5a2e'); R(ctx, 5, 4, 6, 11, '#946b38'); R(ctx, 9, 9, 1, 2, '#f0d05a');
    });
    case 'mat': return tileCanvas('mat', ctx => {
      ctx.drawImage(getTile('floor'), 0, 0); R(ctx, 2, 2, 12, 12, '#b0885a'); R(ctx, 4, 4, 8, 8, '#c9a06b');
    });
    case 'sign': return tileCanvas('sign', ctx => {
      ctx.drawImage(getTile('grass'), 0, 0);
      R(ctx, 3, 3, 10, 7, '#b0885a'); R(ctx, 4, 4, 8, 5, '#8a6a42'); R(ctx, 7, 10, 2, 5, '#7d5a2e');
      R(ctx, 5, 5, 6, 1, '#e0cba0'); R(ctx, 5, 7, 4, 1, '#e0cba0');
    });
    case 'ledge': return tileCanvas('ledge', ctx => {
      ctx.drawImage(getTile('grass'), 0, 0); R(ctx, 0, 10, 16, 3, '#c9a06b'); R(ctx, 0, 13, 16, 1, '#8a6a42');
    });
    case 'healer': return tileCanvas('healer', ctx => {
      ctx.drawImage(getTile('floor'), 0, 0);
      R(ctx, 2, 4, 12, 9, '#e8e8f0'); R(ctx, 3, 5, 10, 7, '#c94a4a'); R(ctx, 6, 6, 4, 5, '#e8e8f0'); R(ctx, 4, 8, 8, 1, '#e8e8f0');
    });
    case 'pc': return tileCanvas('pc', ctx => {
      ctx.drawImage(getTile('floor'), 0, 0);
      R(ctx, 3, 3, 10, 8, '#4a4a5e'); R(ctx, 4, 4, 8, 5, '#7ad9c9'); R(ctx, 5, 12, 6, 2, '#4a4a5e');
    });
    case 'shop': return tileCanvas('shop', ctx => {
      ctx.drawImage(getTile('floor'), 0, 0);
      R(ctx, 2, 5, 12, 8, '#b0885a'); R(ctx, 2, 5, 12, 2, '#8a6a42'); R(ctx, 4, 8, 3, 2, '#e86a6a'); R(ctx, 9, 8, 3, 2, '#5f7ad9');
    });
    case 'statue': return tileCanvas('statue', ctx => {
      ctx.drawImage(getTile('floor'), 0, 0);
      R(ctx, 5, 10, 6, 4, '#8d8578'); R(ctx, 6, 4, 4, 6, '#a8a094'); R(ctx, 5, 2, 6, 3, '#b8b0a4');
    });
    default: return tileCanvas('missing', ctx => { R(ctx, 0, 0, 16, 16, '#f0f'); });
  }
}

// ---------- player + NPC sprites ----------
const charCache = new Map();
// palette: {skin, hair, top, bottom}
export function charCanvas(pal, dir, step, scale = 1) {
  const key = JSON.stringify(pal) + dir + step + scale;
  if (charCache.has(key)) return charCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = 16 * scale; cv.height = 20 * scale;
  const ctx = cv.getContext('2d');
  const p = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x * scale, y * scale, scale, scale); };
  const box = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p(x + i, y + j, c); };
  const { skin, hair, top, bottom } = pal;

  // head
  box(5, 1, 6, 5, skin);
  box(4, 0, 8, 2, hair);
  if (dir === 'down') { box(4, 2, 1, 2, hair); box(11, 2, 1, 2, hair); p(6, 3, '#101018'); p(9, 3, '#101018'); }
  if (dir === 'up') box(4, 1, 8, 4, hair);
  if (dir === 'left') { box(4, 1, 2, 3, hair); p(6, 3, '#101018'); }
  if (dir === 'right') { box(10, 1, 2, 3, hair); p(9, 3, '#101018'); }
  // torso
  box(4, 6, 8, 6, top);
  box(3, 6, 1, 4, top); box(12, 6, 1, 4, top);
  p(3, 10, skin); p(12, 10, skin);
  // legs (2-frame walk)
  const off = step % 2 === 0 ? 0 : 1;
  if (dir === 'left' || dir === 'right') {
    box(5 + off, 12, 2, 4, bottom); box(9 - off, 12, 2, 4, bottom);
    box(5 + off, 16, 2, 2, '#3a3428'); box(9 - off, 16, 2, 2, '#3a3428');
  } else {
    box(5, 12, 2, 4 - off, bottom); box(9, 12, 2, 3 + off, bottom);
    box(5, 16 - off, 2, 2, '#3a3428'); box(9, 15 + off, 2, 2, '#3a3428');
  }
  charCache.set(key, cv);
  return cv;
}

export const PLAYER_PAL = { skin:'#f0c8a0', hair:'#4a3524', top:'#2a8f8f', bottom:'#3c4e6b' };
export const NPC_PALS = {
  nurse:  { skin:'#f0c8a0', hair:'#d97ab0', top:'#e8e8f0', bottom:'#e8e8f0' },
  sailor: { skin:'#d9a878', hair:'#2a2a33', top:'#3c50a8', bottom:'#e8e8f0' },
  elder:  { skin:'#e8c9a8', hair:'#c9c9c9', top:'#8a6d9e', bottom:'#57503f' },
  kid:    { skin:'#f0c8a0', hair:'#e8a83c', top:'#e86a6a', bottom:'#3c4e6b' },
  hiker:  { skin:'#d9a878', hair:'#6b4e2a', top:'#8a6a42', bottom:'#57503f' },
  pyra:   { skin:'#e8b48a', hair:'#d9502e', top:'#c9302e', bottom:'#3a3428' },
  terra:  { skin:'#c98f5e', hair:'#57503f', top:'#b0885a', bottom:'#6b5a42' },
  champ:  { skin:'#f0c8a0', hair:'#5f7ad9', top:'#f0d05a', bottom:'#3a3428' },
  scout:  { skin:'#f0c8a0', hair:'#3e7d33', top:'#5aa845', bottom:'#3c4e6b' },
};

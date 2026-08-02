/* tiles.js — original chunky pixel-art tiles (top-down RPG style), drawn on a
 * 16px integer grid for a crisp retro look. All art here is hand-drawn shapes,
 * not copied from any game. meta: solid, terrain. draw(c,x,y,s,time,nb) */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const T = {};
  function def(ch, meta, draw) { T[ch] = Object.assign({ ch, solid: false, terrain: null }, meta, { draw }); }
  function H(x, y) { let h = (x * 73856093) ^ (y * 19349663); h = (h ^ (h >>> 13)) >>> 0; return h; }
  const isWater = (c) => c === 'W' || c === '~' || c === 'F';
  const isRoof = (c) => c === 'r';
  const isBuild = (c) => c === 'r' || c === 'H' || c === 'D' || c === 'g' || c === 'n';

  // pixel-art bitmap renderer: rows of chars -> colored 1px cells
  function art(c, x, y, rows, pal) {
    for (let j = 0; j < rows.length; j++) { const row = rows[j]; for (let i = 0; i < row.length; i++) { const col = pal[row[i]]; if (col) { c.fillStyle = col; c.fillRect(x + i, y + j, 1, 1); } } }
  }
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };

  // ---------- ground bases ----------
  const GA = '#79c05a', GB = '#6fb650', GH = '#8bd06a', GD = '#5fa244';
  function grass(c, x, y, s, nb) {
    R(c, x, y, s, s, GA);
    const h = H(nb ? nb.x : x, nb ? nb.y : y);
    // subtle dither
    c.fillStyle = GB; for (let j = 0; j < s; j += 2) for (let i = ((j / 2) % 2 ? 0 : 1); i < s; i += 4) c.fillRect(x + i, y + j, 1, 1);
    // a couple of blades / specks, deterministic
    c.fillStyle = GD; c.fillRect(x + (h % 12) + 1, y + (h % 10) + 2, 1, 2);
    c.fillStyle = GH; c.fillRect(x + ((h >> 3) % 12) + 2, y + ((h >> 2) % 11) + 1, 1, 1);
    if (h & 4) { c.fillStyle = GD; const bx = x + 3 + (h % 8); c.fillRect(bx, y + 11, 1, 3); c.fillRect(bx + 1, y + 12, 1, 2); c.fillRect(bx + 2, y + 11, 1, 3); }
  }
  function sand(c, x, y, s, nb) { R(c, x, y, s, s, '#e6d296'); const h = H(nb ? nb.x : x, nb ? nb.y : y); c.fillStyle = '#dcc487'; for (let j = 1; j < s; j += 3) for (let i = ((j) % 2 ? 0 : 2); i < s; i += 4) c.fillRect(x + i, y + j, 1, 1); c.fillStyle = '#cbb076'; c.fillRect(x + (h % 12) + 1, y + (h % 12) + 1, 2, 1); }
  function cave(c, x, y, s, nb) { R(c, x, y, s, s, '#565165'); const h = H(nb ? nb.x : x, nb ? nb.y : y); c.fillStyle = '#4a4658'; for (let j = 0; j < s; j += 3) for (let i = ((j / 3) % 2 ? 1 : 3); i < s; i += 4) c.fillRect(x + i, y + j, 1, 1); c.fillStyle = '#655f76'; c.fillRect(x + (h % 12), y + (h % 12), 2, 2); }

  def('.', {}, grass);
  def('f', {}, (c, x, y, s, t, nb) => { grass(c, x, y, s, nb); const h = H(nb.x, nb.y); const cols = ['#ff6f8b', '#ffd24a', '#c98bff', '#66c8ff']; for (let i = 0; i < 2; i++) { const fx = x + 3 + ((h >> (i * 4)) % 9), fy = y + 3 + ((h >> (i * 3 + 1)) % 9), col = cols[(h >> i) % 4]; c.fillStyle = col; c.fillRect(fx, fy - 1, 1, 1); c.fillRect(fx - 1, fy, 3, 1); c.fillRect(fx, fy + 1, 1, 1); c.fillStyle = '#fff2a8'; c.fillRect(fx, fy, 1, 1); } });
  function path(c, x, y, s, nb) {
    R(c, x, y, s, s, '#e2cd94'); c.fillStyle = '#d6bf84'; for (let j = 1; j < s; j += 3) for (let i = ((j) % 2 ? 1 : 3); i < s; i += 4) c.fillRect(x + i, y + j, 1, 1);
    c.fillStyle = '#c2a86e';
    if (nb.u !== 'P' && nb.u !== 'D') c.fillRect(x, y, s, 1); if (nb.d !== 'P' && nb.d !== 'D') c.fillRect(x, y + s - 1, s, 1);
    if (nb.l !== 'P' && nb.l !== 'D') c.fillRect(x, y, 1, s); if (nb.r !== 'P' && nb.r !== 'D') c.fillRect(x + s - 1, y, 1, s);
  }
  def('P', {}, path);
  def('d', {}, sand); def('%', {}, (c, x, y, s, t, nb) => sand(c, x, y, s, nb)); def('C', {}, cave);
  def('=', {}, (c, x, y, s) => { R(c, x, y, s, s, '#c69a5f'); c.fillStyle = '#a87b45'; for (let i = 1; i < s; i += 3) c.fillRect(x, y + i, s, 1); R(c, x, y, s, 1, '#8a6338'); R(c, x, y + s - 1, s, 1, '#8a6338'); });
  def('G', {}, (c, x, y, s, t, nb) => { const lt = (nb.x + nb.y) % 2 === 0; R(c, x, y, s, s, lt ? '#d6def0' : '#c4cfe6'); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(x, y, s, 1); c.fillStyle = 'rgba(120,140,180,.4)'; c.fillRect(x, y + s - 1, s, 1); c.fillRect(x + s - 1, y, 1, s); });
  def('M', {}, (c, x, y, s, t, nb) => { R(c, x, y, s, s, '#e8d0a6'); c.fillStyle = '#cdb488'; for (let i = ((nb.y % 2) ? 0 : 4); i < s; i += 6) c.fillRect(x, y + i, s, 1); });

  // ---------- encounter grass / cave grass ----------
  def(',', { terrain: 'grass' }, (c, x, y, s, t, nb) => {
    R(c, x, y, s, s, GA);
    // clumps of tall grass with outline
    const clump = (cx, cy) => { R(c, x + cx - 1, y + cy - 4, 4, 5, '#2c6626'); R(c, x + cx, y + cy - 4, 2, 5, '#4a9c3e'); R(c, x + cx, y + cy - 4, 1, 3, '#63b850'); };
    clump(3, 14); clump(8, 15); clump(12, 13);
    R(c, x, y + s - 1, s, 1, '#3c8232');
  });
  def('q', { terrain: 'grass' }, (c, x, y, s, t, nb) => { sand(c, x, y, s, nb); const clump = (cx, cy) => { R(c, x + cx - 1, y + cy - 4, 4, 5, '#a88a4a'); R(c, x + cx, y + cy - 4, 2, 5, '#c8a860'); }; clump(4, 14); clump(10, 15); });
  def('c', { terrain: 'grass' }, (c, x, y, s, t, nb) => { cave(c, x, y, s, nb); const clump = (cx, cy) => { R(c, x + cx - 1, y + cy - 4, 4, 5, '#33513f'); R(c, x + cx, y + cy - 4, 2, 5, '#4d7a5c'); }; clump(4, 14); clump(10, 15); });

  // ---------- tree (original chunky canopy with outline) ----------
  function tree(c, x, y, s, nb, leaf, leafD, leafH) {
    grass(c, x, y, s, nb);
    R(c, x + 3, y + 14, 10, 1, 'rgba(0,0,0,0.13)'); // shadow
    R(c, x + 6, y + 9, 4, 5, '#5a3a20'); R(c, x + 6, y + 9, 2, 5, '#77502e'); // trunk
    // canopy rows: [xstart,width] per y, y from 0..10
    const rows = [[6, 4], [4, 8], [3, 10], [2, 12], [2, 12], [1, 14], [1, 14], [2, 12], [3, 10], [4, 8], [6, 4]];
    const OUT = '#1c5e24';
    rows.forEach((rw, j) => { R(c, x + rw[0] - 1, y + j, rw[1] + 2, 1, OUT); });          // outline halo
    rows.forEach((rw, j) => { R(c, x + rw[0], y + j, rw[1], 1, leaf); });                  // leaf fill
    // shading (bottom-right) + highlight (top-left)
    c.fillStyle = leafD; for (let j = 6; j < 11; j++) { const rw = rows[j]; R(c, x + rw[0] + rw[1] - 3, y + j, 3, 1, leafD); }
    c.fillStyle = leafH; R(c, x + 4, y + 2, 3, 1, leafH); R(c, x + 3, y + 3, 2, 1, leafH); R(c, x + 5, y + 1, 2, 1, leafH);
    // a few darker leaf speckles for texture
    c.fillStyle = leafD; R(c, x + 8, y + 4, 1, 1, leafD); R(c, x + 6, y + 6, 1, 1, leafD); R(c, x + 10, y + 7, 1, 1, leafD);
  }
  def('#', { solid: true }, (c, x, y, s, t, nb) => tree(c, x, y, s, nb, '#3fa048', '#2c7d38', '#5fbf5e'));
  def('T', { solid: true, terrain: 'cut' }, (c, x, y, s, t, nb) => { tree(c, x, y, s, nb, '#66c85a', '#4aa048', '#8ce07e'); R(c, x + 7, y + 6, 2, 4, '#f4d23c'); R(c, x + 6, y + 7, 4, 1, '#f4d23c'); });

  // ---------- rocks / boulders ----------
  def('R', { solid: true }, (c, x, y, s) => { R(c, x, y, s, s, '#7c7060'); art(c, x, y, ['oooooooooooooooo', 'ohhhhhhhhhhhhhho', 'ohhhhhhhhhhhhhho', 'ommmmmmmmmmmmmmo', 'ommmmmmmmmmmmmmo', 'ommmmmmmddddddmo', 'ommmmmmmddddddmo', 'ommdddddddddddmo', 'ommdddddddddddmo', 'ommmmmmmmdddddmo', 'ommmmmmmmdddddmo', 'ommmdddddddddomo', 'ommmdddddddddomo', 'ommmmmmmmmmmmmmo', 'ommmmmmmmmmmmmmo', 'oooooooooooooooo'], { o: '#5a5044', h: '#98907e', m: '#847a68', d: '#6b6254' }); });
  def('B', { solid: true, terrain: 'boulder' }, (c, x, y, s, t, nb) => { sand(c, x, y, s, nb); R(c, x + 3, y + 13, 10, 1, 'rgba(0,0,0,0.14)'); art(c, x + 2, y + 2, ['  oooooo  ', ' ohhhhhho ', 'ohhhhmmmmo', 'ohhhmmmmdo', 'ohhmmmmddo', 'ommmmmdddo', 'ommmmddddo', 'ommmdddddo', ' odddddddo', '  oooooo  '], { o: '#5a5044', h: '#c2b498', m: '#a89a80', d: '#8a7c64' }); });

  // ---------- buildings ----------
  def('r', { solid: true }, (c, x, y, s, t, nb) => {
    const top = !isRoof(nb.u);
    R(c, x, y, s, s, '#df6b4c'); // roof base
    c.fillStyle = '#b8503a'; for (let j = (top ? 3 : 1); j < s; j += 3) c.fillRect(x, y + j, s, 1); // shingle lines
    c.fillStyle = '#c25a40'; for (let j = (top ? 4 : 2); j < s; j += 3) for (let i = ((j / 3) % 2 ? 0 : 2); i < s; i += 4) c.fillRect(x + i, y + j, 1, 1);
    if (top) { R(c, x, y, s, 2, '#f0906c'); R(c, x - 0, y - 1, s, 1, '#f8d6ac'); } // ridge + highlight
    if (!isRoof(nb.l)) R(c, x, y, 1, s, '#a8462f'); if (!isRoof(nb.r)) R(c, x + s - 1, y, 1, s, '#a8462f');
    if (!isRoof(nb.d) && !isBuild(nb.d)) { R(c, x, y + s - 2, s, 2, '#ead9b0'); R(c, x, y + s, s, 1, 'rgba(0,0,0,.18)'); } // eave
  });
  def('H', { solid: true }, (c, x, y, s, t, nb) => {
    R(c, x, y, s, s, '#efe3c2'); c.fillStyle = '#e0d2ac'; for (let j = 2; j < s; j += 4) c.fillRect(x, y + j, s, 1);
    if (((nb.x + nb.y) % 2 === 0) && nb.l !== 'D' && nb.r !== 'D') {
      art(c, x + 4, y + 3, ['ooooooo', 'obbwwbo', 'obbwwbo', 'owwbbwo', 'owwbbwo', 'ooooooo'], { o: '#8a7350', b: '#4f93c0', w: '#9fd0ef' });
    }
    if (!isBuild(nb.d)) { R(c, x, y + s - 1, s, 1, '#c9b98f'); R(c, x, y + s, s, 1, 'rgba(0,0,0,.16)'); }
    R(c, x, y, 1, s, '#e0d2ac');
  });
  def('D', {}, (c, x, y, s) => {
    R(c, x, y, s, s, '#efe3c2');
    art(c, x + 3, y + 2, ['oooooooooo', 'oWWWWWWWWo', 'oWppppppWo', 'oWppppppWo', 'oWppppppWo', 'oWWWWWWWWo', 'oWppppppWo', 'oWppKppppWo'.slice(0, 10), 'oWppppppWo', 'oWWWWWWWWo'], { o: '#5f3c20', W: '#8a5a34', p: '#6f4526', K: '#f2c94c' });
    R(c, x + 10, y + 9, 1, 1, '#f2c94c'); // knob
    R(c, x + 2, y + s - 1, s - 4, 1, '#b8a684'); // step
  });
  def('g', { solid: true }, (c, x, y, s, t, nb) => { R(c, x, y, s, s, '#7f93bd'); R(c, x, y, s, 1, '#98a9cc'); R(c, x, y + s - 1, s, 1, '#63769c'); c.fillStyle = '#8fa1c6'; for (let j = 2; j < s; j += 4) for (let i = 2; i < s; i += 4) c.fillRect(x + i, y + j, 2, 2); });
  def('n', { solid: true }, (c, x, y, s) => { R(c, x, y, s, s, '#b98a5a'); R(c, x, y, s, 6, '#caa06e'); R(c, x, y + 6, s, 1, '#8a6340'); });
  def(' ', { solid: true }, (c, x, y, s) => R(c, x, y, s, s, '#0e1018'));

  // ---------- water / waterfall ----------
  function water(c, x, y, s, time, nb) {
    R(c, x, y, s, s, '#3f92d6');
    const off = Math.floor((time || 0) / 500 + (nb ? (nb.x + nb.y) : 0));
    c.fillStyle = '#5aa6e6'; for (let j = 0; j < s; j += 4) c.fillRect(x, y + j, s, 2);
    c.fillStyle = '#a8dcff';
    for (let j = 1; j < s; j += 4) { const sx = ((off + j) % 4) * 3; c.fillRect(x + sx, y + j, 2, 1); c.fillRect(x + sx + 7, y + j, 3, 1); }
    if (nb) { c.fillStyle = '#bfe6ff'; if (!isWater(nb.u)) c.fillRect(x, y, s, 1); if (!isWater(nb.l)) c.fillRect(x, y, 1, s); if (!isWater(nb.r)) c.fillRect(x + s - 1, y, 1, s); if (!isWater(nb.d)) c.fillRect(x, y + s - 1, s, 1); }
  }
  def('W', { solid: true, terrain: 'water' }, water);
  def('~', { solid: true, terrain: 'water' }, water);
  def('F', { solid: true, terrain: 'waterfall' }, (c, x, y, s, time, nb) => { water(c, x, y, s, time, nb); const o = Math.floor((time || 0) / 40) % s; c.fillStyle = '#eaf6ff'; for (let gx = 1; gx < s; gx += 4) for (let i = -s; i < s; i += 6) { const yy = y + (((i + o) % s + s) % s); c.fillRect(x + gx, yy, 1, 3); } });

  // ---------- signs / ledges / stairs ----------
  def('S', { solid: true, terrain: 'sign' }, (c, x, y, s, t, nb) => { grass(c, x, y, s, nb); R(c, x + 7, y + 9, 2, 6, '#6b4526'); art(c, x + 2, y + 2, ['oooooooooooo', 'owwwwwwwwwwo', 'owddwddwddwo', 'owwwwwwwwwwo', 'owddwddddwo '.slice(0, 12), 'owwwwwwwwwwo', 'oooooooooooo'], { o: '#5f3c20', w: '#caa165', d: '#7a5330' }); });
  def('L', { terrain: 'ledge' }, (c, x, y, s, t, nb) => { grass(c, x, y, s, nb); R(c, x, y + 10, s, 6, '#4d8a40'); R(c, x, y + 10, s, 1, '#3c7233'); c.fillStyle = '#5fa050'; for (let i = 1; i < s; i += 4) c.fillRect(x + i, y + 12, 2, 1); });
  def('^', {}, (c, x, y, s) => { R(c, x, y, s, s, '#9a8f7d'); c.fillStyle = '#7a7062'; c.fillRect(x + 6, y + 3, 4, 2); c.fillRect(x + 4, y + 6, 8, 2); c.fillRect(x + 2, y + 9, 12, 2); });

  // ---------- Entralink (mystical) ----------
  const eBase = (c, x, y, s, col) => { R(c, x, y, s, s, col); c.fillStyle = 'rgba(255,255,255,.04)'; for (let j = 0; j < s; j += 2) for (let i = ((j / 2) % 2 ? 0 : 1); i < s; i += 4) c.fillRect(x + i, y + j, 1, 1); };
  def('e', {}, (c, x, y, s, t, nb) => { eBase(c, x, y, s, '#463f6e'); const h = H(nb.x, nb.y); if (h & 3) { c.fillStyle = 'rgba(180,200,255,.18)'; c.fillRect(x + (h % 14), y + (h % 14), 1, 1); } });
  def('E', {}, (c, x, y, s) => eBase(c, x, y, s, '#524a7a'));
  def('k', { terrain: 'grass' }, (c, x, y, s, t, nb) => { eBase(c, x, y, s, '#3a5261'); const clump = (cx) => { R(c, x + cx - 1, y + 10, 4, 5, '#274654'); R(c, x + cx, y + 10, 2, 5, '#3f6f80'); }; clump(4); clump(10); });
  def('o', { solid: true }, (c, x, y, s) => { R(c, x, y, s, s, '#221d38'); const rows = [[6, 4], [4, 8], [3, 10], [3, 10], [4, 8], [6, 4]]; rows.forEach((rw, j) => R(c, x + rw[0], y + 3 + j, rw[1], 1, '#332c58')); });
  def('Y', { solid: true, terrain: 'entree' }, (c, x, y, s, time) => { eBase(c, x, y, s, '#463f6e'); const p = 0.6 + 0.4 * Math.sin((time || 0) / 480); c.fillStyle = 'rgba(180,220,255,' + (0.3 * p) + ')'; c.fillRect(x + 1, y + 1, s - 2, s - 2); R(c, x + 7, y + 9, 2, 6, '#a8c4e0'); const rows = [[6, 4], [4, 8], [3, 10], [3, 10], [4, 8], [6, 4]]; rows.forEach((rw, j) => R(c, x + rw[0], y + 2 + j, rw[1], 1, '#cfe6ff')); R(c, x + 5, y + 3, 3, 1, '#eef7ff'); });
  def('b', {}, (c, x, y, s) => { R(c, x, y, s, s, '#eef1fa'); c.fillStyle = '#d2dbef'; for (let i = 1; i < s; i += 3) c.fillRect(x, y + i, s, 1); R(c, x, y, s, 1, '#b7c2dc'); R(c, x, y + s - 1, s, 1, '#b7c2dc'); });
  def('v', {}, (c, x, y, s, time) => { eBase(c, x, y, s, '#463f6e'); const p = 0.5 + 0.5 * Math.sin((time || 0) / 320); c.fillStyle = 'rgba(120,240,255,' + (0.3 + 0.3 * p) + ')'; const rows = [[5, 6], [3, 10], [3, 10], [5, 6]]; rows.forEach((rw, j) => R(c, x + rw[0], y + 6 + j, rw[1], 1, 'rgba(120,240,255,' + (0.3 + 0.3 * p) + ')')); });

  G.tiles = { get: (ch) => T[ch] || T[' '], all: T };
})();

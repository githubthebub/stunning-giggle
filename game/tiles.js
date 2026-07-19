/* tiles.js — richly drawn top-down tiles (soft-shaded style). Each tile fills
 * its cell; buildings use neighbour info (nb) to draw roofs/eaves/foundations.
 * meta: solid (blocks walking), terrain: grass|water|waterfall|cut|boulder|
 * ledge|sign|entree|null. draw(ctx, px, py, ts, time, nb) */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const T = {};
  function def(ch, meta, draw) { T[ch] = Object.assign({ ch, solid: false, terrain: null }, meta, { draw }); }
  const rr = (c, x, y, w, h, r) => G.sprites.roundRect(c, x, y, w, h, r);
  function sh(hex, a) { const n = parseInt(hex.slice(1), 16); const r = Math.max(0, Math.min(255, (n >> 16) + a)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + a)), b = Math.max(0, Math.min(255, (n & 255) + a)); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
  function H(x, y) { let h = (x * 73856093) ^ (y * 19349663); h = (h ^ (h >>> 13)) >>> 0; return h; }
  const isWater = (c) => c === 'W' || c === '~' || c === 'F';
  const isBuild = (c) => c === 'r' || c === 'H' || c === 'D' || c === 'g' || c === 'n';
  const isRoof = (c) => c === 'r';

  // ---- ground base helpers ----
  function grassBase(c, x, y, s, nb) {
    const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, '#79c25e'); g.addColorStop(1, '#6bb753');
    c.fillStyle = g; c.fillRect(x, y, s, s);
    const h = H(nb ? nb.x : x, nb ? nb.y : y);
    c.fillStyle = 'rgba(90,170,80,0.35)';
    if (h & 1) c.fillRect(x + (h % 5) + 2, y + (h % 4) + 3, 3, 2);
    if (h & 2) c.fillRect(x + s - 6 - (h % 4), y + s - 5 - (h % 3), 3, 2);
    c.strokeStyle = 'rgba(120,200,110,0.5)'; c.lineWidth = 1;
    if (h & 4) { const bx = x + 3 + (h % 8); c.beginPath(); c.moveTo(bx, y + s - 3); c.lineTo(bx - 1, y + s - 7); c.stroke(); c.beginPath(); c.moveTo(bx + 2, y + s - 3); c.lineTo(bx + 3, y + s - 6); c.stroke(); }
  }
  function sandBase(c, x, y, s, nb) {
    const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, '#e6d29a'); g.addColorStop(1, '#dcc487');
    c.fillStyle = g; c.fillRect(x, y, s, s);
    const h = H(nb ? nb.x : x, nb ? nb.y : y);
    c.fillStyle = 'rgba(200,175,120,0.5)';
    c.fillRect(x + (h % 6) + 1, y + (h % 5) + 2, 2, 2); c.fillRect(x + s - 5 - (h % 5), y + s - 6 - (h % 4), 2, 2);
  }
  function caveBase(c, x, y, s, nb) {
    c.fillStyle = '#5a5566'; c.fillRect(x, y, s, s);
    const h = H(nb ? nb.x : x, nb ? nb.y : y);
    c.fillStyle = 'rgba(70,66,80,0.7)'; c.fillRect(x + (h % 6), y + (h % 5), 3, 3);
    c.fillStyle = 'rgba(110,104,124,0.5)'; c.fillRect(x + s - 6 - (h % 4), y + s - 6, 2, 2);
  }

  // ---- walkable ground ----
  def('.', {}, grassBase);
  def('f', {}, (c, x, y, s, t, nb) => {
    grassBase(c, x, y, s, nb); const h = H(nb.x, nb.y); const cols = ['#ff6f8b', '#ffd86b', '#c98bff', '#7fd0ff'];
    for (let i = 0; i < 3; i++) { const fx = x + 3 + ((h >> (i * 3)) % (s - 6)), fy = y + 3 + ((h >> (i * 2 + 1)) % (s - 6)); c.fillStyle = cols[(h >> i) % cols.length]; c.beginPath(); c.arc(fx, fy, 2.4, 0, 7); c.fill(); c.fillStyle = '#fff2a8'; c.fillRect(fx - 0.8, fy - 0.8, 1.6, 1.6); }
  });
  function pathTile(c, x, y, s, nb) {
    const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, '#e4cd97'); g.addColorStop(1, '#d8bf85');
    c.fillStyle = g; c.fillRect(x, y, s, s);
    const h = H(nb.x, nb.y); c.fillStyle = 'rgba(190,165,115,0.5)'; c.fillRect(x + (h % 7) + 1, y + (h % 6) + 1, 2, 2); c.fillRect(x + s - 5, y + s - 6 - (h % 4), 2, 2);
    // soft edges where path meets non-path
    c.fillStyle = 'rgba(150,125,80,0.25)';
    if (nb.u !== 'P') c.fillRect(x, y, s, 2); if (nb.d !== 'P') c.fillRect(x, y + s - 2, s, 2);
    if (nb.l !== 'P') c.fillRect(x, y, 2, s); if (nb.r !== 'P') c.fillRect(x + s - 2, y, 2, s);
  }
  def('P', {}, pathTile);
  def('=', {}, (c, x, y, s) => { c.fillStyle = '#c79a5f'; c.fillRect(x, y, s, s); c.fillStyle = '#a87b45'; for (let i = 2; i < s; i += 5) c.fillRect(x, y + i, s, 2); c.fillStyle = '#8a6338'; c.fillRect(x, y, s, 2); c.fillRect(x, y + s - 2, s, 2); });
  def('d', {}, sandBase);
  def('%', {}, (c, x, y, s, t, nb) => { c.fillStyle = '#d8c088'; c.fillRect(x, y, s, s); const h = H(nb.x, nb.y); c.fillStyle = 'rgba(190,165,115,0.4)'; c.fillRect(x + (h % 7), y + (h % 6), 2, 2); });
  def('C', {}, caveBase);
  def('G', {}, (c, x, y, s, t, nb) => { const light = (nb.x + nb.y) % 2 === 0; c.fillStyle = light ? '#d6def0' : '#c6d0e6'; c.fillRect(x, y, s, s); c.strokeStyle = 'rgba(150,165,200,0.6)'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + 1, y + 1, s - 2, 2); });
  def('M', {}, (c, x, y, s, t, nb) => { c.fillStyle = '#e7cfa6'; c.fillRect(x, y, s, s); c.fillStyle = 'rgba(180,150,110,0.4)'; for (let i = ((nb.y % 2) ? 0 : 4); i < s; i += 8) c.fillRect(x, y + i, s, 1.5); });

  // ---- encounter terrain ----
  def(',', { terrain: 'grass' }, (c, x, y, s, t, nb) => {
    c.fillStyle = '#4fa049'; c.fillRect(x, y, s, s);
    const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, '#57ab50'); g.addColorStop(1, '#489042'); c.fillStyle = g; c.fillRect(x, y, s, s * 0.6);
    c.strokeStyle = '#3c8038'; c.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { const bx = x + 2 + i * (s / 6) + (H(nb.x + i, nb.y) % 2); c.beginPath(); c.moveTo(bx, y + s - 1); c.lineTo(bx - 1.5, y + s * 0.45); c.stroke(); c.beginPath(); c.moveTo(bx + 2, y + s - 1); c.lineTo(bx + 3, y + s * 0.5); c.stroke(); }
    c.strokeStyle = 'rgba(150,220,130,0.6)'; c.beginPath(); c.moveTo(x + 4, y + s - 2); c.lineTo(x + 3, y + s * 0.55); c.stroke();
  });
  def('q', { terrain: 'grass' }, (c, x, y, s, t, nb) => { sandBase(c, x, y, s, nb); c.strokeStyle = '#b79a5a'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const bx = x + 3 + i * (s / 4); c.beginPath(); c.moveTo(bx, y + s - 2); c.lineTo(bx - 1, y + s * 0.5); c.stroke(); c.beginPath(); c.moveTo(bx + 2, y + s - 2); c.lineTo(bx + 3, y + s * 0.55); c.stroke(); } });
  def('c', { terrain: 'grass' }, (c, x, y, s, t, nb) => { caveBase(c, x, y, s, nb); c.strokeStyle = 'rgba(120,150,110,0.8)'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const bx = x + 3 + i * (s / 4); c.beginPath(); c.moveTo(bx, y + s - 2); c.lineTo(bx, y + s * 0.5); c.stroke(); } });

  // ---- trees / scenery ----
  function tree(c, x, y, s, nb, top, mid, bot) {
    grassBase(c, x, y, s, nb);
    c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(x + s / 2, y + s * 0.9, s * 0.34, s * 0.11, 0, 0, 7); c.fill();
    c.fillStyle = '#7a5330'; c.fillRect(x + s * 0.43, y + s * 0.55, s * 0.14, s * 0.34);
    c.fillStyle = bot; c.beginPath(); c.arc(x + s / 2, y + s * 0.44, s * 0.37, 0, 7); c.fill();
    c.fillStyle = mid; c.beginPath(); c.arc(x + s * 0.5, y + s * 0.42, s * 0.3, 0, 7); c.fill();
    c.fillStyle = top; c.beginPath(); c.arc(x + s * 0.4, y + s * 0.34, s * 0.2, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.14)'; c.beginPath(); c.arc(x + s * 0.36, y + s * 0.3, s * 0.08, 0, 7); c.fill();
  }
  def('#', { solid: true }, (c, x, y, s, t, nb) => tree(c, x, y, s, nb, '#4bbf5e', '#33a24c', '#25843c'));
  def('T', { solid: true, terrain: 'cut' }, (c, x, y, s, t, nb) => { tree(c, x, y, s, nb, '#7ad06a', '#5cbb55', '#3f9a43'); c.fillStyle = '#f4d23c'; c.font = 'bold ' + Math.round(s * 0.34) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('✂', x + s / 2, y + s * 0.5); c.textAlign = 'left'; });
  def('R', { solid: true }, (c, x, y, s) => { const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, '#a89a82'); g.addColorStop(1, '#8a7c66'); c.fillStyle = g; c.fillRect(x, y, s, s); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y, s, s * 0.3); c.strokeStyle = '#6f6252'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1); c.strokeStyle = 'rgba(80,70,55,0.5)'; c.beginPath(); c.moveTo(x + s * 0.3, y); c.lineTo(x + s * 0.4, y + s); c.stroke(); });
  def('B', { solid: true, terrain: 'boulder' }, (c, x, y, s, t, nb) => { sandBase(c, x, y, s, nb); c.fillStyle = 'rgba(0,0,0,0.16)'; c.beginPath(); c.ellipse(x + s / 2, y + s * 0.82, s * 0.32, s * 0.1, 0, 0, 7); c.fill(); const g = c.createRadialGradient(x + s * 0.4, y + s * 0.38, 2, x + s / 2, y + s / 2, s * 0.4); g.addColorStop(0, '#b3a488'); g.addColorStop(1, '#8a7c62'); c.fillStyle = g; c.beginPath(); c.arc(x + s / 2, y + s * 0.5, s * 0.34, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.arc(x + s * 0.42, y + s * 0.42, s * 0.1, 0, 7); c.fill(); });

  // ---- buildings ----
  def('r', { solid: true }, (c, x, y, s, t, nb) => {
    const base = '#d4614f', dark = sh(base, -34), lite = sh(base, 26);
    c.fillStyle = base; c.fillRect(x, y, s, s);
    c.fillStyle = dark; for (let i = ((nb.y % 2) ? 3 : 0); i < s; i += 6) { for (let j = ((i / 6 | 0) % 2 ? 0 : 4); j < s; j += 8) c.fillRect(x + j, y + i, 6, 3); }
    if (!isRoof(nb.u)) { c.fillStyle = lite; c.fillRect(x, y, s, 3); c.fillStyle = '#f6e9c8'; c.fillRect(x - 1, y - 2, s + 2, 3); } // ridge cap overhang
    c.fillStyle = 'rgba(0,0,0,0.18)'; if (!isRoof(nb.l)) c.fillRect(x, y, 2, s); if (!isRoof(nb.r)) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(x + s - 2, y, 2, s); }
    if (!isRoof(nb.d) && !isBuild(nb.d)) { c.fillStyle = '#e9dcb8'; c.fillRect(x - 1, y + s - 3, s + 2, 4); c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(x - 1, y + s + 1, s + 2, 2); }
  });
  def('H', { solid: true }, (c, x, y, s, t, nb) => {
    const wall = '#efe2c4';
    c.fillStyle = wall; c.fillRect(x, y, s, s);
    c.fillStyle = 'rgba(0,0,0,0.05)'; c.fillRect(x, y, s, s * 0.5);
    // window on some wall tiles (not next to a door, not top row under roof edge)
    if (((nb.x + nb.y) % 2 === 0) && nb.l !== 'D' && nb.r !== 'D') {
      const wx = x + s * 0.24, wy = y + s * 0.22, ww = s * 0.52, wh = s * 0.44;
      c.fillStyle = '#7fb0d8'; rr(c, wx, wy, ww, wh, 2); c.fill();
      c.fillStyle = '#bfe0f5'; c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx + ww, wy); c.lineTo(wx + ww, wy + wh * 0.5); c.lineTo(wx + ww * 0.5, wy + wh); c.closePath(); c.fill();
      c.strokeStyle = '#b79a6a'; c.lineWidth = 1.5; c.strokeRect(wx, wy, ww, wh); c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
    }
    if (!isBuild(nb.d)) { c.fillStyle = '#c9b98f'; c.fillRect(x, y + s - 3, s, 3); c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(x, y + s, s, 2); }
  });
  def('D', {}, (c, x, y, s) => {
    c.fillStyle = '#efe2c4'; c.fillRect(x, y, s, s);
    c.fillStyle = '#8a5a34'; rr(c, x + s * 0.2, y + s * 0.14, s * 0.6, s * 0.78, 3); c.fill();
    c.fillStyle = '#6f4526'; c.fillRect(x + s * 0.28, y + s * 0.22, s * 0.44, s * 0.3); c.fillRect(x + s * 0.28, y + s * 0.56, s * 0.44, s * 0.28);
    c.fillStyle = '#f2c94c'; c.beginPath(); c.arc(x + s * 0.68, y + s * 0.56, s * 0.05, 0, 7); c.fill();
    c.fillStyle = '#b8a684'; c.fillRect(x + s * 0.14, y + s * 0.9, s * 0.72, s * 0.1); // step
  });
  def('g', { solid: true }, (c, x, y, s, t, nb) => { const base = '#7f93bd'; c.fillStyle = base; c.fillRect(x, y, s, s); c.fillStyle = sh(base, 18); c.fillRect(x, y, s, 3); c.fillStyle = sh(base, -22); c.fillRect(x, y + s - 3, s, 3); c.strokeStyle = 'rgba(255,255,255,0.15)'; c.strokeRect(x + 1.5, y + 1.5, s - 3, s - 3); });
  def('n', { solid: true }, (c, x, y, s) => { c.fillStyle = '#b98a5a'; c.fillRect(x, y, s, s); c.fillStyle = '#caa06e'; c.fillRect(x, y, s, s * 0.42); c.fillStyle = '#8a6340'; c.fillRect(x, y + s * 0.42, s, 2); });
  def(' ', { solid: true }, (c, x, y, s) => { c.fillStyle = '#0e1018'; c.fillRect(x, y, s, s); });

  // ---- water / waterfall ----
  function water(c, x, y, s, time, nb) {
    const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, '#4f9bdd'); g.addColorStop(1, '#3d84cc'); c.fillStyle = g; c.fillRect(x, y, s, s);
    const o = Math.sin((time || 0) / 420 + (nb ? (nb.x + nb.y) : 0) * 0.6) * 1.6;
    c.strokeStyle = 'rgba(255,255,255,0.32)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x + 2, y + s * 0.34 + o); c.bezierCurveTo(x + s * 0.35, y + s * 0.3 + o, x + s * 0.65, y + s * 0.4 + o, x + s - 2, y + s * 0.34 - o); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.beginPath(); c.moveTo(x + 2, y + s * 0.72 - o); c.bezierCurveTo(x + s * 0.4, y + s * 0.68 - o, x + s * 0.6, y + s * 0.78 - o, x + s - 2, y + s * 0.72 + o); c.stroke();
    if (nb) { c.fillStyle = 'rgba(200,235,255,0.55)'; if (!isWater(nb.u)) c.fillRect(x, y, s, 2); if (!isWater(nb.l)) c.fillRect(x, y, 2, s); if (!isWater(nb.r)) c.fillRect(x + s - 2, y, 2, s); if (!isWater(nb.d)) c.fillRect(x, y + s - 2, s, 2); }
  }
  def('W', { solid: true, terrain: 'water' }, water);
  def('~', { solid: true, terrain: 'water' }, water);
  def('F', { solid: true, terrain: 'waterfall' }, (c, x, y, s, time, nb) => {
    water(c, x, y, s, time, nb); const o = ((time || 0) / 45) % s;
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
    for (let gx = 2; gx < s; gx += 5) for (let i = -s; i < s; i += 7) { const yy = y + (((i + o) % s + s) % s); c.beginPath(); c.moveTo(x + gx, yy); c.lineTo(x + gx, yy + 4); c.stroke(); }
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(x, y + s - 3, s, 3);
  });

  // ---- signs / ledges / stairs ----
  def('S', { solid: true, terrain: 'sign' }, (c, x, y, s, t, nb) => { grassBase(c, x, y, s, nb); c.fillStyle = '#7a5330'; c.fillRect(x + s * 0.44, y + s * 0.5, s * 0.12, s * 0.42); c.fillStyle = '#caa165'; rr(c, x + s * 0.16, y + s * 0.16, s * 0.68, s * 0.44, 3); c.fill(); c.strokeStyle = '#8a6338'; c.lineWidth = 1.5; c.strokeRect(x + s * 0.16, y + s * 0.16, s * 0.68, s * 0.44); c.fillStyle = '#5a4632'; c.fillRect(x + s * 0.26, y + s * 0.28, s * 0.48, 2); c.fillRect(x + s * 0.26, y + s * 0.4, s * 0.36, 2); });
  def('L', { terrain: 'ledge' }, (c, x, y, s, t, nb) => { grassBase(c, x, y, s, nb); c.fillStyle = '#4d8a40'; c.fillRect(x, y + s * 0.66, s, s * 0.34); c.fillStyle = '#3c7233'; c.fillRect(x, y + s * 0.66, s, 3); c.fillStyle = 'rgba(255,255,255,0.2)'; for (let i = 2; i < s; i += 6) c.fillRect(x + i, y + s * 0.75, 3, 2); });
  def('^', {}, (c, x, y, s) => { c.fillStyle = '#9a8f7d'; c.fillRect(x, y, s, s); c.fillStyle = '#7a7062'; c.beginPath(); c.moveTo(x + s / 2, y + s * 0.2); c.lineTo(x + s * 0.8, y + s * 0.7); c.lineTo(x + s * 0.2, y + s * 0.7); c.closePath(); c.fill(); });

  // ---- Entralink (mystical) ----
  function eGround(c, x, y, s, tint) { const g = c.createLinearGradient(0, y, 0, y + s); g.addColorStop(0, sh(tint, 8)); g.addColorStop(1, sh(tint, -8)); c.fillStyle = g; c.fillRect(x, y, s, s); }
  def('e', {}, (c, x, y, s, t, nb) => { eGround(c, x, y, s, '#463f6e'); const h = H(nb.x, nb.y); if (h & 3) { c.fillStyle = 'rgba(180,200,255,0.14)'; c.fillRect(x + (h % 6), y + (h % 5), 2, 2); } });
  def('E', {}, (c, x, y, s) => eGround(c, x, y, s, '#544c7d'));
  def('k', { terrain: 'grass' }, (c, x, y, s, t, nb) => { eGround(c, x, y, s, '#3a5261'); c.strokeStyle = 'rgba(90,150,170,0.7)'; c.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const bx = x + 3 + i * (s / 4); c.beginPath(); c.moveTo(bx, y + s - 2); c.lineTo(bx, y + s * 0.5); c.stroke(); } });
  def('o', { solid: true }, (c, x, y, s) => { c.fillStyle = '#221d38'; c.fillRect(x, y, s, s); c.fillStyle = '#2f2952'; c.beginPath(); c.arc(x + s / 2, y + s * 0.44, s * 0.34, 0, 7); c.fill(); c.fillStyle = '#3b3468'; c.beginPath(); c.arc(x + s * 0.42, y + s * 0.36, s * 0.2, 0, 7); c.fill(); });
  def('Y', { solid: true, terrain: 'entree' }, (c, x, y, s, time) => { eGround(c, x, y, s, '#463f6e'); const p = 0.7 + 0.3 * Math.sin((time || 0) / 480); c.fillStyle = 'rgba(180,220,255,' + (0.3 * p) + ')'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.6, 0, 7); c.fill(); c.fillStyle = '#b9d2ea'; c.fillRect(x + s * 0.44, y + s * 0.6, s * 0.12, s * 0.34); c.fillStyle = '#cfe6ff'; c.beginPath(); c.arc(x + s / 2, y + s * 0.4, s * 0.34, 0, 7); c.fill(); c.fillStyle = '#eef7ff'; c.beginPath(); c.arc(x + s * 0.42, y + s * 0.34, s * 0.18, 0, 7); c.fill(); });
  def('b', {}, (c, x, y, s) => { c.fillStyle = '#eef1fa'; c.fillRect(x, y, s, s); c.fillStyle = '#d2dbef'; for (let i = 2; i < s; i += 5) c.fillRect(x, y + i, s, 1.5); c.fillStyle = '#b7c2dc'; c.fillRect(x, y, s, 2); c.fillRect(x, y + s - 2, s, 2); });
  def('v', {}, (c, x, y, s, time) => { eGround(c, x, y, s, '#463f6e'); const p = 0.5 + 0.5 * Math.sin((time || 0) / 320); c.fillStyle = 'rgba(120,240,255,' + (0.14 + 0.16 * p) + ')'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.32, 0, 7); c.fill(); c.strokeStyle = 'rgba(120,240,255,' + (0.5 + 0.4 * p) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.33, 0, 7); c.stroke(); });

  G.tiles = { get: (ch) => T[ch] || T[' '], all: T };
})();

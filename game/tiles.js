/* tiles.js — tile definitions (collision / terrain / HM obstacles) and their
 * procedural drawing. Warps, signs and NPCs are defined in map data instead. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  // meta: solid (blocks walking), terrain: 'grass'|'water'|'waterfall'|'cut'|
  // 'boulder'|'ledge'|null. draw(ctx, px, py, ts, time)
  const T = {};
  function def(ch, meta, draw) { T[ch] = Object.assign({ ch, solid: false, terrain: null }, meta, { draw }); }

  const rr = (ctx, x, y, w, h, r) => G.sprites.roundRect(ctx, x, y, w, h, r);

  // --- ground / walkable ---
  def('.', {}, (c, x, y, s) => { c.fillStyle = '#7dc36a'; c.fillRect(x, y, s, s); speckle(c, x, y, s, '#72b861'); });
  def('P', {}, (c, x, y, s) => { c.fillStyle = '#e6d3a0'; c.fillRect(x, y, s, s); speckle(c, x, y, s, '#dcc78f'); });
  def('f', {}, (c, x, y, s) => { c.fillStyle = '#7dc36a'; c.fillRect(x, y, s, s); flower(c, x, y, s); });
  def('d', {}, (c, x, y, s) => { c.fillStyle = '#e8cf95'; c.fillRect(x, y, s, s); speckle(c, x, y, s, '#dcc084'); });
  def('%', {}, (c, x, y, s) => { c.fillStyle = '#dcc088'; c.fillRect(x, y, s, s); });
  def('C', {}, (c, x, y, s) => { c.fillStyle = '#6b6472'; c.fillRect(x, y, s, s); speckle(c, x, y, s, '#615a68'); });
  def('G', {}, (c, x, y, s) => { c.fillStyle = '#cdd6e6'; c.fillRect(x, y, s, s); c.strokeStyle = '#b7c2d6'; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, s - 1, s - 1); });
  def('M', {}, (c, x, y, s) => { c.fillStyle = '#f0e6d2'; c.fillRect(x, y, s, s); c.strokeStyle = '#e2d4ba'; c.strokeRect(x + .5, y + .5, s - 1, s - 1); });
  def('=', {}, (c, x, y, s) => { c.fillStyle = '#c69a63'; c.fillRect(x, y, s, s); c.fillStyle = '#b3854f'; for (let i = 0; i < s; i += 6) c.fillRect(x, y + i, s, 2); });

  // --- encounter terrain ---
  def(',', { terrain: 'grass' }, (c, x, y, s) => { c.fillStyle = '#5aa653'; c.fillRect(x, y, s, s); blades(c, x, y, s, '#4a9146'); });
  def('q', { terrain: 'grass' }, (c, x, y, s) => { c.fillStyle = '#d8b877'; c.fillRect(x, y, s, s); blades(c, x, y, s, '#c8a862'); });
  def('c', { terrain: 'grass' }, (c, x, y, s) => { c.fillStyle = '#5a5462'; c.fillRect(x, y, s, s); speckle(c, x, y, s, '#4d4753'); });

  // --- solid scenery ---
  def('#', { solid: true }, (c, x, y, s) => { c.fillStyle = '#7dc36a'; c.fillRect(x, y, s, s); tree(c, x, y, s, '#2f8f4e', '#256f3d'); });
  def('T', { solid: true, terrain: 'cut' }, (c, x, y, s) => { c.fillStyle = '#7dc36a'; c.fillRect(x, y, s, s); tree(c, x, y, s, '#3aa85e', '#2c8347'); c.fillStyle = '#f4d23c'; c.font = (s * 0.3) + 'px sans-serif'; });
  def('R', { solid: true }, (c, x, y, s) => { c.fillStyle = '#9a8f7d'; c.fillRect(x, y, s, s); c.fillStyle = '#847a68'; c.fillRect(x, y, s, s * 0.4); c.strokeStyle = '#6f6558'; c.strokeRect(x + .5, y + .5, s - 1, s - 1); });
  def('B', { solid: true, terrain: 'boulder' }, (c, x, y, s) => { c.fillStyle = '#e8cf95'; c.fillRect(x, y, s, s); c.fillStyle = '#9a8c74'; c.beginPath(); c.arc(x + s / 2, y + s / 2, s * 0.34, 0, 7); c.fill(); c.fillStyle = '#b0a488'; c.beginPath(); c.arc(x + s * 0.42, y + s * 0.42, s * 0.12, 0, 7); c.fill(); });
  def('H', { solid: true }, (c, x, y, s) => { c.fillStyle = '#d9d2c4'; c.fillRect(x, y, s, s); c.strokeStyle = '#b8ae9c'; c.strokeRect(x + .5, y + .5, s - 1, s - 1); });
  def('r', { solid: true }, (c, x, y, s) => { c.fillStyle = '#c9556a'; c.fillRect(x, y, s, s); c.fillStyle = '#b3435a'; c.fillRect(x, y, s, s * 0.5); });
  def('g', { solid: true }, (c, x, y, s) => { c.fillStyle = '#8fa0bd'; c.fillRect(x, y, s, s); c.strokeStyle = '#7688a6'; c.strokeRect(x + .5, y + .5, s - 1, s - 1); });
  def('n', { solid: true }, (c, x, y, s) => { c.fillStyle = '#b98a5a'; c.fillRect(x, y, s, s); c.fillStyle = '#a5794c'; c.fillRect(x, y + s * 0.6, s, s * 0.4); });
  def(' ', { solid: true }, (c, x, y, s) => { c.fillStyle = '#12131a'; c.fillRect(x, y, s, s); });

  // --- water / waterfall ---
  const drawWater = (c, x, y, s, time) => {
    c.fillStyle = '#4d90d5'; c.fillRect(x, y, s, s);
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2;
    const off = Math.sin((time || 0) / 400 + (x + y) * 0.05) * 2;
    c.beginPath(); c.moveTo(x + 2, y + s * 0.35 + off); c.lineTo(x + s - 2, y + s * 0.35 + off); c.stroke();
    c.beginPath(); c.moveTo(x + 2, y + s * 0.7 - off); c.lineTo(x + s - 2, y + s * 0.7 - off); c.stroke();
  };
  def('W', { solid: true, terrain: 'water' }, drawWater);
  def('~', { solid: true, terrain: 'water' }, drawWater);
  def('F', { solid: true, terrain: 'waterfall' }, (c, x, y, s, time) => {
    c.fillStyle = '#6fb0e6'; c.fillRect(x, y, s, s);
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
    const o = ((time || 0) / 60) % s;
    for (let i = -s; i < s; i += 6) { c.beginPath(); c.moveTo(x + 3, y + ((i + o) % s + s) % s); c.lineTo(x + 3, y + ((i + o) % s + s) % s + 3); c.stroke(); }
    for (let gx = 6; gx < s; gx += 7) for (let i = -s; i < s; i += 8) { c.beginPath(); c.moveTo(x + gx, y + ((i + o) % s + s) % s); c.lineTo(x + gx, y + ((i + o) % s + s) % s + 3); c.stroke(); }
  });

  // --- doors / signs / ledges (walkability handled here; warps in map data) ---
  def('D', {}, (c, x, y, s) => { c.fillStyle = '#d9d2c4'; c.fillRect(x, y, s, s); c.fillStyle = '#5a4632'; rr(c, x + s * 0.22, y + s * 0.15, s * 0.56, s * 0.85, s * 0.06); c.fill(); c.fillStyle = '#c9a24a'; c.beginPath(); c.arc(x + s * 0.66, y + s * 0.58, s * 0.05, 0, 7); c.fill(); });
  def('^', {}, (c, x, y, s) => { c.fillStyle = '#9a8f7d'; c.fillRect(x, y, s, s); c.fillStyle = '#7a7062'; c.beginPath(); c.moveTo(x + s / 2, y + s * 0.2); c.lineTo(x + s * 0.8, y + s * 0.7); c.lineTo(x + s * 0.2, y + s * 0.7); c.closePath(); c.fill(); });
  def('S', { solid: true, terrain: 'sign' }, (c, x, y, s) => { c.fillStyle = '#7dc36a'; c.fillRect(x, y, s, s); c.fillStyle = '#8a6a3f'; c.fillRect(x + s * 0.42, y + s * 0.5, s * 0.16, s * 0.4); c.fillStyle = '#c79a5a'; rr(c, x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.42, 3); c.fill(); c.fillStyle = '#5a4632'; c.fillRect(x + s * 0.28, y + s * 0.3, s * 0.44, 2); c.fillRect(x + s * 0.28, y + s * 0.4, s * 0.34, 2); });
  def('L', { terrain: 'ledge' }, (c, x, y, s) => { c.fillStyle = '#7dc36a'; c.fillRect(x, y, s, s); c.fillStyle = '#5f9e4f'; c.fillRect(x, y + s * 0.7, s, s * 0.3); c.fillStyle = '#4d8a40'; c.fillRect(x, y + s * 0.7, s, 3); });

  // helpers
  function speckle(c, x, y, s, col) { c.fillStyle = col; for (let i = 0; i < 4; i++) { const rx = x + (((x * 7 + i * 53) % s)), ry = y + (((y * 11 + i * 31) % s)); c.fillRect(rx, ry, 2, 2); } }
  function blades(c, x, y, s, col) { c.strokeStyle = col; c.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const bx = x + 3 + i * (s / 5); c.beginPath(); c.moveTo(bx, y + s - 2); c.lineTo(bx - 1, y + s * 0.5); c.stroke(); c.beginPath(); c.moveTo(bx + 2, y + s - 2); c.lineTo(bx + 3, y + s * 0.55); c.stroke(); } }
  function flower(c, x, y, s) { const cols = ['#f77', '#fd7', '#f9f', '#7cf']; for (let i = 0; i < 2; i++) { const fx = x + 5 + i * (s * 0.5), fy = y + 6 + (i % 2) * (s * 0.4); c.fillStyle = cols[(x + y + i) % cols.length]; c.beginPath(); c.arc(fx, fy, 2.5, 0, 7); c.fill(); c.fillStyle = '#fe4'; c.fillRect(fx - 1, fy - 1, 2, 2); } }
  function tree(c, x, y, s, top, bot) { c.fillStyle = '#6a4a2a'; c.fillRect(x + s * 0.44, y + s * 0.55, s * 0.12, s * 0.35); c.fillStyle = bot; c.beginPath(); c.arc(x + s / 2, y + s * 0.42, s * 0.36, 0, 7); c.fill(); c.fillStyle = top; c.beginPath(); c.arc(x + s * 0.42, y + s * 0.36, s * 0.28, 0, 7); c.fill(); }

  G.tiles = { get: (ch) => T[ch] || T[' '], all: T };
})();

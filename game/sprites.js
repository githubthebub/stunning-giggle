/* sprites.js — Pokémon battle sprites (official art + procedural fallback)
 * and procedural overworld character drawing. Browser-only. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const CDN = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
  const cache = new Map();

  function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = Math.max(0, Math.min(255, (n >> 16) + amt));
    let g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    let b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function proceduralDataURL(dex, types, size) {
    size = size || 128;
    const key = 'p' + dex + ':' + size;
    if (cache.has(key)) return cache.get(key);
    const c = document.createElement('canvas'); c.width = c.height = size;
    const ctx = c.getContext('2d');
    const rnd = seeded(dex * 97 + 13);
    const base = G.TYPE_COLOR[(types && types[0]) || 'normal'] || '#9fa19f';
    const cx = size / 2, cy = size / 2 + size * 0.05, rx = size * 0.32, ry = size * 0.3;
    ctx.fillStyle = base; ctx.strokeStyle = shade(base, -50); ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; const w = 1 + (rnd() - 0.5) * 0.18; const x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(base, 45); ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.35, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    for (const d of [-1, 1]) { ctx.fillStyle = shade(base, -12); ctx.beginPath(); ctx.moveTo(cx + d * rx * 0.55, cy - ry * 0.7); ctx.lineTo(cx + d * rx * 0.95, cy - ry * 1.35); ctx.lineTo(cx + d * rx * 0.2, cy - ry * 0.95); ctx.closePath(); ctx.fill(); }
    const eyeY = cy - ry * 0.15, eyeDX = rx * 0.4;
    for (const d of [-1, 1]) { ctx.fillStyle = '#20242b'; ctx.beginPath(); ctx.arc(cx + d * eyeDX, eyeY, size * 0.055, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + d * eyeDX - size * 0.018, eyeY - size * 0.018, size * 0.018, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,120,140,0.5)'; for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + d * rx * 0.62, eyeY + ry * 0.28, size * 0.045, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#20242b'; ctx.lineWidth = Math.max(1.5, size * 0.02); ctx.beginPath(); ctx.arc(cx, eyeY + ry * 0.25, size * 0.07, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    const url = c.toDataURL(); cache.set(key, url); return url;
  }

  function bank() { try { return window.SPRITE_DATA || (window.parent && window.parent.SPRITE_DATA); } catch (e) { return null; } }

  // Returns an <img>. Prefers embedded authentic Black/White pixel sprites
  // (front, or back for the player's own Pokémon); otherwise draws a
  // procedural creature and upgrades to official art if the network allows.
  function monImg(mon, size, opts) {
    opts = opts || {};
    const dex = mon.dex, types = mon.types;
    const img = document.createElement('img');
    img.className = 'mon-sprite' + (opts.className ? ' ' + opts.className : '');
    img.width = img.height = size || 128;
    img.alt = mon.species || '';
    img.draggable = false;
    const b = bank();
    const embedded = b && ((opts.back && b.back && b.back[dex]) || (b.front && b.front[dex]));
    if (embedded) { img.src = embedded; img.classList.add('pixel'); return img; }
    img.src = proceduralDataURL(dex, types, (size || 128) * 1.5);
    if (dex && !window.OFFLINE_SPRITES) {
      const loader = new Image();
      loader.onload = () => { img.src = CDN + dex + '.png'; img.classList.add('official'); };
      loader.onerror = () => {};
      loader.src = CDN + dex + '.png';
    }
    return img;
  }

  // Draw a top-down trainer/NPC directly on a canvas ctx (tile-sized).
  function drawCharacter(ctx, px, py, ts, opts) {
    opts = opts || {};
    const dir = opts.dir || 'down';
    const body = opts.body || '#e05a6b';
    const hair = opts.hair || '#3a2b20';
    const skin = opts.skin || '#f2c79b';
    const step = opts.step || 0;
    const cx = px + ts / 2;
    const headR = ts * 0.22;
    const headY = py + ts * 0.34;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(cx, py + ts * 0.9, ts * 0.28, ts * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    // body
    ctx.fillStyle = body;
    roundRect(ctx, cx - ts * 0.2, py + ts * 0.5, ts * 0.4, ts * 0.34, ts * 0.08); ctx.fill();
    // legs (little step animation)
    ctx.fillStyle = shade(body, -40);
    const off = step === 1 ? ts * 0.04 : step === 2 ? -ts * 0.04 : 0;
    ctx.fillRect(cx - ts * 0.16, py + ts * 0.82, ts * 0.12, ts * 0.12 + off);
    ctx.fillRect(cx + ts * 0.04, py + ts * 0.82, ts * 0.12, ts * 0.12 - off);
    // head
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(cx, headY, headR, 0, Math.PI * 2); ctx.fill();
    // hair
    ctx.fillStyle = hair;
    ctx.beginPath(); ctx.arc(cx, headY - headR * 0.25, headR, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.fillRect(cx - headR, headY - headR * 0.25, headR * 2, headR * 0.5);
    // face direction (eyes)
    ctx.fillStyle = '#2a2530';
    if (dir === 'down') { dot(ctx, cx - headR * 0.4, headY + headR * 0.15, ts * 0.03); dot(ctx, cx + headR * 0.4, headY + headR * 0.15, ts * 0.03); }
    else if (dir === 'up') { /* back of head, no eyes */ }
    else if (dir === 'left') { dot(ctx, cx - headR * 0.5, headY + headR * 0.1, ts * 0.03); }
    else { dot(ctx, cx + headR * 0.5, headY + headR * 0.1, ts * 0.03); }
  }
  function dot(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  G.sprites = { monImg, proceduralDataURL, drawCharacter, roundRect, cdnUrl: (dex) => CDN + dex + '.png' };
})();

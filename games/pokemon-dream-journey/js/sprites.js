/* sprites.js — renders Pokémon sprites.
 * Tries official PokeAPI artwork; if the network is blocked or the image
 * fails, draws a cute procedural "dream blob" on a canvas so the game
 * always has visuals. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});

  const CDN = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
  const cache = new Map();

  // Deterministic pseudo-random from an integer seed (so a species always
  // draws the same fallback blob).
  function seeded(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Draw a friendly blob creature for a species, tinted by its primary type.
  function proceduralDataURL(species, size) {
    size = size || 96;
    const key = 'proc:' + species.id + ':' + size;
    if (cache.has(key)) return cache.get(key);

    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const rnd = seeded(species.id * 97 + 13);
    const base = DW.data.typeColor(species.types[0]);
    const cx = size / 2;
    const cy = size / 2 + size * 0.05;

    // Body — a wobbly rounded blob.
    ctx.save();
    ctx.fillStyle = base;
    ctx.strokeStyle = shade(base, -50);
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.beginPath();
    const rx = size * 0.32, ry = size * 0.3;
    const points = 16;
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const wob = 1 + (rnd() - 0.5) * 0.18;
      const x = cx + Math.cos(a) * rx * wob;
      const y = cy + Math.sin(a) * ry * wob;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Belly highlight.
    ctx.fillStyle = shade(base, 45);
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.35, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears / tufts.
    const earColor = shade(base, -12);
    for (const dir of [-1, 1]) {
      ctx.fillStyle = earColor;
      ctx.beginPath();
      ctx.moveTo(cx + dir * rx * 0.55, cy - ry * 0.7);
      ctx.lineTo(cx + dir * rx * 0.95, cy - ry * 1.35);
      ctx.lineTo(cx + dir * rx * 0.2, cy - ry * 0.95);
      ctx.closePath();
      ctx.fill();
    }

    // Eyes.
    const eyeY = cy - ry * 0.15;
    const eyeDX = rx * 0.4;
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#20242b';
      ctx.beginPath();
      ctx.arc(cx + dir * eyeDX, eyeY, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx + dir * eyeDX - size * 0.018, eyeY - size * 0.018, size * 0.018, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cheeks.
    ctx.fillStyle = 'rgba(255,120,140,0.5)';
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + dir * rx * 0.62, eyeY + ry * 0.28, size * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }

    // Smile.
    ctx.strokeStyle = '#20242b';
    ctx.lineWidth = Math.max(1.5, size * 0.02);
    ctx.beginPath();
    ctx.arc(cx, eyeY + ry * 0.25, size * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    const url = c.toDataURL();
    cache.set(key, url);
    return url;
  }

  function bank() { try { return window.SPRITE_DATA || (window.parent && window.parent.SPRITE_DATA); } catch (e) { return null; } }

  // Returns an <img>. Prefers embedded authentic Black/White pixel sprites;
  // otherwise shows a procedural sprite immediately and upgrades to official
  // artwork if the network makes it available.
  function spriteImg(species, size, opts) {
    opts = opts || {};
    const px = size || 96;
    const img = document.createElement('img');
    img.className = 'sprite' + (opts.className ? ' ' + opts.className : '');
    img.width = img.height = px;
    img.alt = species.name;
    img.decoding = 'async';
    img.draggable = false;
    const b = bank();
    const embedded = b && b.front && b.front[species.id];
    if (embedded) { img.src = embedded; img.classList.add('pixel'); return img; }
    // Instant, always-available fallback art.
    img.src = proceduralDataURL(species, px * 2);
    if (species.id && !opts.noUpgrade && !window.OFFLINE_SPRITES) {
      const loader = new Image();
      loader.onload = () => { img.src = CDN + species.id + '.png'; img.classList.add('official'); };
      loader.onerror = () => {}; // stay on the procedural sprite
      loader.src = CDN + species.id + '.png';
    }
    return img;
  }

  DW.sprites = { spriteImg, proceduralDataURL, cdnUrl: (id) => CDN + id + '.png' };
})();

/* gameui.js — DOM UI primitives for the RPG: dialogue box, choice menu,
 * confirm, toast, screen fade. Navigable by keyboard/touch via G.input.
 * While any modal is open, G.gui.isBusy() is true so the world pauses. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  let host;
  const stack = []; // open modal controllers

  function ensure() {
    if (!host) { host = document.getElementById('game-ui') || document.body; }
    return host;
  }
  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    (Array.isArray(kids) ? kids : kids != null ? [kids] : []).forEach((c) => c != null && n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }
  function isBusy() { return stack.length > 0; }

  // Typewriter dialogue. `lines` is an array of strings.
  function dialogue(lines, opts) {
    opts = opts || {};
    lines = Array.isArray(lines) ? lines : [lines];
    return new Promise((resolve) => {
      let idx = 0, typing = false, full = '', shown = 0, timer = null;
      const nameTag = opts.speaker ? el('div', { class: 'dlg-name' }, opts.speaker) : null;
      const textEl = el('div', { class: 'dlg-text' });
      const arrow = el('div', { class: 'dlg-arrow' }, '▼');
      const box = el('div', { class: 'dialogue' + (opts.className ? ' ' + opts.className : '') }, [nameTag, textEl, arrow]);
      const wrap = el('div', { class: 'ui-layer dlg-layer' }, box);
      ensure().appendChild(wrap);

      function type(line) {
        full = line; shown = 0; typing = true; arrow.style.opacity = 0;
        clearInterval(timer);
        timer = setInterval(() => {
          shown++; textEl.textContent = full.slice(0, shown);
          if (shown >= full.length) { clearInterval(timer); typing = false; arrow.style.opacity = 1; }
        }, opts.speed || 18);
      }
      function next() {
        if (typing) { clearInterval(timer); textEl.textContent = full; typing = false; arrow.style.opacity = 1; return; }
        idx++;
        if (idx >= lines.length) { close(); resolve(); return; }
        type(lines[idx]);
      }
      const ctrl = { press: (b) => { if (b === 'a' || b === 'b') next(); } };
      const off = () => {}; ctrl.off = off;
      stack.push(ctrl);
      const onPress = (b) => { if (stack[stack.length - 1] === ctrl) ctrl.press(b); };
      ctrl._unsub = G.input.on('press', onPress);
      box.addEventListener('click', () => next());
      function close() { ctrl._unsub(); const i = stack.indexOf(ctrl); if (i >= 0) stack.splice(i, 1); wrap.remove(); }
      type(lines[0]);
    });
  }

  // Vertical choice menu. items: [{label,value,disabled,hint}]. Returns value or null.
  function choice(items, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      let cur = 0;
      while (items[cur] && items[cur].disabled) cur++;
      const box = el('div', { class: 'choice-box ' + (opts.className || '') });
      if (opts.title) box.appendChild(el('div', { class: 'choice-title' }, opts.title));
      const list = el('div', { class: 'choice-list' });
      const rows = items.map((it, i) => {
        const r = el('div', { class: 'choice-item' + (it.disabled ? ' disabled' : ''), onclick: () => { if (!it.disabled) { cur = i; render(); pick(); } } }, [
          el('span', { class: 'choice-cursor' }, '▶'),
          el('span', { class: 'choice-label' }, it.label),
          it.hint != null ? el('span', { class: 'choice-hint' }, it.hint) : null,
        ]);
        list.appendChild(r); return r;
      });
      box.appendChild(list);
      const wrap = el('div', { class: 'ui-layer choice-layer ' + (opts.layerClass || '') }, box);
      ensure().appendChild(wrap);
      function render() { rows.forEach((r, i) => r.classList.toggle('sel', i === cur)); }
      function move(d) { let n = cur; for (let k = 0; k < items.length; k++) { n = (n + d + items.length) % items.length; if (!items[n].disabled) break; } cur = n; render(); G.audio && G.audio.play('cursor'); }
      function pick() { const it = items[cur]; if (it.disabled) return; close(); resolve(it.value); }
      const ctrl = { press: (b) => { if (b === 'up') move(-1); else if (b === 'down') move(1); else if (b === 'a') pick(); else if (b === 'b' && opts.cancelable !== false) { close(); resolve(opts.cancelValue !== undefined ? opts.cancelValue : null); } } };
      stack.push(ctrl);
      ctrl._unsub = G.input.on('press', (b) => { if (stack[stack.length - 1] === ctrl) ctrl.press(b); });
      function close() { ctrl._unsub(); const i = stack.indexOf(ctrl); if (i >= 0) stack.splice(i, 1); wrap.remove(); }
      render();
    });
  }

  async function confirm(msg, opts) {
    opts = opts || {};
    if (msg) await dialogueNoWaitShow(msg);
    return choice([{ label: opts.yes || 'Yes', value: true }, { label: opts.no || 'No', value: false }], { title: opts.title || msg, className: 'confirm-choice' });
  }
  function dialogueNoWaitShow() { return Promise.resolve(); }

  function toast(msg, opts) {
    opts = opts || {};
    const t = el('div', { class: 'game-toast ' + (opts.kind || '') }, msg);
    const layer = el('div', { class: 'ui-layer toast-layer' }, t);
    ensure().appendChild(layer);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => layer.remove(), 300); }, opts.duration || 1800);
  }

  // Full-screen fade. mode 'out' -> to black, 'in' -> from black.
  // A single shared layer so out+in pairs never strand a black overlay.
  let fadeEl = null;
  function fade(mode, ms) {
    ms = ms || 300;
    return new Promise((resolve) => {
      if (!fadeEl) {
        fadeEl = el('div', { class: 'fade-layer' });
        fadeEl.style.opacity = mode === 'out' ? '0' : '1';
        ensure().appendChild(fadeEl);
      }
      requestAnimationFrame(() => {
        fadeEl.style.transition = 'opacity ' + ms + 'ms ease';
        fadeEl.style.opacity = mode === 'out' ? '1' : '0';
      });
      setTimeout(() => {
        if (mode === 'in' && fadeEl) { fadeEl.remove(); fadeEl = null; }
        resolve();
      }, ms + 20);
    });
  }

  // Classic encounter flash before a battle: white/black strobes, then dark.
  function battleFlash() {
    return new Promise((resolve) => {
      const f = el('div', { class: 'battle-flash-layer' });
      ensure().appendChild(f);
      setTimeout(resolve, 480);
      setTimeout(() => {
        f.style.transition = 'opacity .25s ease';
        f.style.opacity = '0';
        setTimeout(() => f.remove(), 280);
      }, 560);
    });
  }

  G.gui = { el, dialogue, choice, confirm, toast, fade, battleFlash, isBusy };
})();

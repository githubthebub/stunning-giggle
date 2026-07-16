/* ui.js — shared UI helpers: DOM building, toasts, modals, chips. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2), attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
      }
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach((c) => {
        if (c == null || c === false) return;
        node.appendChild(typeof c === 'string' || typeof c === 'number'
          ? document.createTextNode(String(c)) : c);
      });
    }
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }

  // Colourful type chips.
  function typeChip(type) {
    const color = DW.data.typeColor(type);
    return el('span', { class: 'type-chip', style: { background: color } }, type);
  }

  // Toast notifications.
  let toastHost;
  function toast(msg, opts) {
    opts = opts || {};
    if (!toastHost) {
      toastHost = el('div', { class: 'toast-host', id: 'toast-host' });
      document.body.appendChild(toastHost);
    }
    const t = el('div', { class: 'toast ' + (opts.kind || 'info') }, [
      opts.emoji ? el('span', { class: 'toast-emoji' }, opts.emoji) : null,
      el('span', {}, msg),
    ]);
    toastHost.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    const life = opts.duration || 2600;
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, life);
  }

  // Modal dialog. Returns { close }.
  function modal(content, opts) {
    opts = opts || {};
    const overlay = el('div', { class: 'modal-overlay' });
    const box = el('div', { class: 'modal ' + (opts.className || '') });
    if (opts.title) {
      box.appendChild(el('div', { class: 'modal-header' }, [
        el('h2', {}, opts.title),
        opts.closable === false ? null : el('button', {
          class: 'icon-btn modal-close', 'aria-label': 'Close', onclick: () => close(),
        }, '✕'),
      ]));
    }
    const body = el('div', { class: 'modal-body' });
    (Array.isArray(content) ? content : [content]).forEach((c) => c && body.appendChild(c));
    box.appendChild(body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    function close() {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
      if (opts.onClose) opts.onClose();
    }
    if (opts.closable !== false) {
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }
    return { close, overlay, box, body };
  }

  function confirmDialog(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const m = modal([
        el('p', { class: 'confirm-msg' }, message),
        el('div', { class: 'modal-actions' }, [
          el('button', { class: 'btn ghost', onclick: () => { m.close(); resolve(false); } }, opts.cancel || 'Cancel'),
          el('button', { class: 'btn ' + (opts.danger ? 'danger' : 'primary'), onclick: () => { m.close(); resolve(true); } }, opts.ok || 'OK'),
        ]),
      ], { title: opts.title || 'Are you sure?', closable: true, onClose: () => resolve(false) });
    });
  }

  // Small helper to build a Pokémon card.
  function pokemonCard(pkmn, opts) {
    opts = opts || {};
    const species = DW.data.speciesById(pkmn.speciesId) || { id: pkmn.speciesId, name: pkmn.name, types: pkmn.types || ['normal'], ability: pkmn.ability };
    const card = el('div', { class: 'pkmn-card' + (opts.mini ? ' mini' : '') });
    const spriteWrap = el('div', { class: 'pkmn-sprite-wrap' }, DW.sprites.spriteImg(species, opts.mini ? 64 : 88));
    if (pkmn.shiny) spriteWrap.appendChild(el('span', { class: 'shiny-star', title: 'Shiny!' }, '✦'));
    card.appendChild(spriteWrap);
    card.appendChild(el('div', { class: 'pkmn-name' }, pkmn.nickname || pkmn.name));
    if (!opts.mini) {
      card.appendChild(el('div', { class: 'pkmn-types' }, (pkmn.types || species.types).map(typeChip)));
      card.appendChild(el('div', { class: 'pkmn-ability', title: 'Hidden Ability' }, ['✨ ', pkmn.ability || species.ability]));
      if (pkmn.level) card.appendChild(el('div', { class: 'pkmn-meta' }, 'Lv. ' + pkmn.level));
      if (pkmn.fromTrainer) card.appendChild(el('div', { class: 'pkmn-origin' }, '↔ from ' + pkmn.fromTrainer));
    }
    if (opts.onClick) { card.classList.add('clickable'); card.addEventListener('click', () => opts.onClick(pkmn)); }
    return card;
  }

  function rarityLabel(r) {
    return el('span', { class: 'rarity rarity-' + r }, r);
  }

  DW.ui = { el, clear, typeChip, toast, modal, confirmDialog, pokemonCard, rarityLabel };
})();

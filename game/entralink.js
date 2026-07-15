/* entralink.js — the Entralink: the in-game portal to the Pokémon Dream World
 * (the shareable, crossover-enabled dream experience built in dreamworld.html).
 * Opens as an overlay iframe so the two save-worlds stay cleanly separate. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const el = (t, a, k) => G.gui.el(t, a, k);
  let open_ = false;

  function open() {
    if (open_) return Promise.resolve();
    open_ = true;
    if (G.audio) G.audio.play('warp');
    return new Promise((resolve) => {
      const frame = el('iframe', { class: 'entralink-frame', title: 'Dream World' });
      // Bundled single-file build embeds the Dream World as srcdoc; otherwise
      // load the standalone dreamworld.html.
      if (window.DREAMWORLD_HTML_B64) { try { frame.srcdoc = decodeURIComponent(escape(atob(window.DREAMWORLD_HTML_B64))); } catch (e) { frame.src = 'dreamworld.html'; } }
      else frame.src = 'dreamworld.html';
      const header = el('div', { class: 'entralink-header' }, [
        el('div', { class: 'entralink-title' }, ['↔ ', el('b', {}, 'Entralink'), ' — Dream World']),
        el('button', { class: 'entralink-close', onclick: () => close() }, '✕ Return to Unova'),
      ]);
      const panel = el('div', { class: 'entralink-panel' }, [header, frame]);
      const overlay = el('div', { class: 'ui-layer entralink-layer' }, panel);
      overlay.id = 'entralink-overlay';
      (document.getElementById('game-ui') || document.body).appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      // Pause world input while the dream world (iframe) has focus.
      G.input.setEnabled(false);
      let done = false;
      function close() {
        if (done) return; done = true; open_ = false;
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
        G.input.setEnabled(true);
        if (G.audio) { G.audio.play('warp'); G.audio.startMusic((G.world.mapObj() && G.world.mapObj().music) || 'town'); }
        resolve();
      }
      // Allow Escape (from the parent doc) to close.
      const onKey = (e) => { if (e.key === 'Escape') { close(); window.removeEventListener('keydown', onKey); } };
      window.addEventListener('keydown', onKey);
    });
  }

  G.entralink = { open };
})();

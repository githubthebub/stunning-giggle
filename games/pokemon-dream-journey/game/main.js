/* main.js — boot, title screen, scene manager, game loop, HUD, touch controls. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const el = (t, a, k) => G.gui.el(t, a, k);

  const game = {
    player: null,
    scene: 'title',   // 'title' | 'world' | 'battle'
    surfing: false,
    ctx: null,
    async startBattle(cfg) {
      this.scene = 'battle';
      const res = await G.battlescene.start(cfg);
      this.scene = 'world';
      const m = G.world.mapObj(); if (m && G.audio) G.audio.startMusic(m.music || 'route');
      this.updateHud();
      return res;
    },
    updateHud() {
      const hud = document.getElementById('hud');
      if (!hud || !this.player) return;
      const p = this.player;
      const m = G.maps.MAPS[p.map];
      hud.querySelector('.hud-loc').textContent = (m ? m.name : p.map);
      hud.querySelector('.hud-money').textContent = '¥' + p.money;
      hud.querySelector('.hud-badges').textContent = '◆'.repeat(p.badges.length) + '◇'.repeat(Math.max(0, 4 - p.badges.length));
      hud.style.display = this.scene === 'world' ? '' : 'none';
    },
  };
  G.game = game;

  function boot() {
    const canvas = document.getElementById('game-canvas');
    canvas.width = G.world.VIEW_W * G.world.TS;
    canvas.height = G.world.VIEW_H * G.world.TS;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    game.ctx = ctx;

    G.input.init();
    G.world.init();
    bindTouch();

    // Unlock audio on first interaction.
    const unlock = () => { if (G.audio) G.audio.resume(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);

    startLoop(ctx);
    showTitle();
  }

  let looping = false;
  function startLoop(ctx) {
    if (looping) return; looping = true;
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(60, now - last); last = now;
      try { if (game.scene === 'world') { G.world.update(dt); G.world.render(ctx); } }
      catch (e) { console.error('loop error', e); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---- Title ----
  function showTitle() {
    game.scene = 'title';
    if (G.audio) G.audio.startMusic('town');
    const hasSave = G.save.hasSave();
    const nameInput = el('input', { class: 'title-name', type: 'text', maxlength: 12, placeholder: 'Name (e.g. Hilbert)', value: 'Hilbert' });
    const menu = el('div', { class: 'title-menu' });
    const btns = [];
    if (hasSave) btns.push(el('button', { class: 'title-btn primary', onclick: () => continueSave() }, '▶ Continue'));
    btns.push(el('button', { class: 'title-btn', onclick: () => beginNew('new') }, '✦ New Adventure'));
    btns.push(el('button', { class: 'title-btn champ', onclick: () => beginNew('champ') }, '👑 Continue as Champion'));
    btns.forEach((b) => menu.appendChild(b));

    const panel = el('div', { class: 'title-panel' }, [
      el('div', { class: 'title-logo' }, [el('span', { class: 'tl-1' }, 'Pokémon'), el('span', { class: 'tl-2' }, 'UNOVA'), el('span', { class: 'tl-3' }, 'Dream Journey')]),
      el('div', { class: 'title-sub' }, 'A Black & White-style adventure — beat the Elite Four, catch Darmanitan, master every HM, and cross over through the Entralink.'),
      el('label', { class: 'title-label' }, 'Trainer name'),
      nameInput,
      menu,
      el('div', { class: 'title-tip' }, 'Move: Arrows / WASD · Interact: Z / Space · Menu: Esc · (touch controls on mobile)'),
    ]);
    const overlay = el('div', { class: 'ui-layer title-layer' }, panel);
    overlay.id = 'title-overlay';
    (document.getElementById('game-ui') || document.body).appendChild(overlay);

    function nm() { return (nameInput.value || 'Hilbert').trim().slice(0, 12) || 'Hilbert'; }
    function beginNew(mode) {
      if (G.save.hasSave()) {
        // Confirm overwrite
        overlay.remove();
        G.gui.confirm(null, { title: 'Start a new game? Your current save will be replaced.', yes: 'Yes', no: 'No' }).then((ok) => {
          if (ok) launch(mode === 'champ' ? G.save.championStart(nm()) : G.save.newAdventure(nm()));
          else showTitle();
        });
        return;
      }
      launch(mode === 'champ' ? G.save.championStart(nm()) : G.save.newAdventure(nm()));
    }
    function continueSave() { const p = G.save.load(); if (p) launch(p); }
    function launch(p) { overlay.remove(); startGame(p); }
  }

  async function startGame(player) {
    game.player = player;
    game.scene = 'world';
    document.getElementById('hud').style.display = '';
    await G.gui.fade('in', 200);
    G.world.enter(player.map, player.x, player.y, player.dir);
    game.updateHud();
    if (player.champion) {
      G.gui.toast('Welcome back, Champion! Open the menu (Esc) → Entralink to visit the realm of dreams.', { duration: 4200, kind: 'good' });
    } else if (player.party.length === 0) {
      setTimeout(() => G.gui.dialogue([
        'Talk to Prof. Juniper (green) to choose your first partner!',
        'Psst — the ENTRALINK is open from the very start: press Esc and choose Entralink to visit the realm of dreams.',
      ]), 400);
    }
  }

  // ---- touch controls ----
  function bindTouch() {
    const pairs = [['btn-up', 'up'], ['btn-down', 'down'], ['btn-left', 'left'], ['btn-right', 'right'], ['btn-a', 'a'], ['btn-b', 'b'], ['btn-start', 'start']];
    pairs.forEach(([id, btn]) => { const e = document.getElementById(id); if (e) G.input.bindButton(e, btn); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

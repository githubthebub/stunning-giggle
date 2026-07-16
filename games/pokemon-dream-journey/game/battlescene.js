/* battlescene.js — battle UI. Drives the battle engine and animates its
 * event stream. Returns a promise resolving to {result, caught, evolves}. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const el = (t, a, k) => G.gui.el(t, a, k);
  const P = () => G.game.player;

  let root, battle, foeSprite, plySprite, foeBar, plyBar, msgBox, resolveFn, evolves;

  function start(cfg) {
    return new Promise((resolve) => {
      resolveFn = resolve; evolves = [];
      battle = G.battle.create({ kind: cfg.kind, playerParty: G.game.player.party, foeParty: cfg.foeParty, foeName: cfg.foeName, money: cfg.money, dreamForest: cfg.dreamForest });
      // Lead with the first non-fainted party member.
      const lead = battle.player.party.findIndex((m) => m.hp > 0);
      if (lead > 0) battle.player.i = lead;
      buildDOM(cfg);
      if (G.audio) G.audio.startMusic(cfg.kind === 'trainer' ? (cfg.foeName && /Champion|Elite/.test(cfg.foeName) ? 'league' : 'battle') : 'battle');
      run(cfg);
    });
  }

  function buildDOM(cfg) {
    root = el('div', { class: 'battle-scene' });
    const field = el('div', { class: 'battle-field' });
    const foeArea = el('div', { class: 'foe-area' });
    foeBar = makeBar('foe');
    foeSprite = el('div', { class: 'foe-sprite' });
    foeArea.appendChild(foeBar.box); foeArea.appendChild(foeSprite);
    const plyArea = el('div', { class: 'ply-area' });
    plyBar = makeBar('ply');
    plySprite = el('div', { class: 'ply-sprite' });
    plyArea.appendChild(plySprite); plyArea.appendChild(plyBar.box);
    field.appendChild(foeArea); field.appendChild(plyArea);
    msgBox = el('div', { class: 'battle-msg' });
    root.appendChild(field); root.appendChild(msgBox);
    const layer = el('div', { class: 'ui-layer battle-layer' }, root);
    layer.id = 'battle-root';
    (document.getElementById('game-ui') || document.body).appendChild(layer);
    setSprite('foe', G.battle.active(battle.foe));
    setSprite('ply', G.battle.active(battle.player));
    updateBar('foe'); updateBar('ply');
  }

  function makeBar(side) {
    const name = el('span', { class: 'b-name' });
    const lv = el('span', { class: 'b-lv' });
    const status = el('span', { class: 'b-status' });
    const fill = el('div', { class: 'b-fill' });
    const bar = el('div', { class: 'b-bar' }, fill);
    const hpText = side === 'ply' ? el('span', { class: 'b-hptext' }) : null;
    const box = el('div', { class: 'battle-bar ' + side }, [
      el('div', { class: 'b-top' }, [name, lv, status]),
      bar, hpText,
    ]);
    return { box, name, lv, status, fill, hpText };
  }

  function setSprite(side, mon) {
    const wrap = side === 'foe' ? foeSprite : plySprite;
    wrap.innerHTML = '';
    const img = G.sprites.monImg(mon, side === 'foe' ? 108 : 128, { className: side, back: side === 'ply' });
    wrap.appendChild(img);
    if (mon.shiny) wrap.appendChild(el('span', { class: 'b-shiny' }, '✦'));
  }

  function updateBar(side, animateTo) {
    const s = side === 'foe' ? battle.foe : battle.player;
    const mon = G.battle.active(s);
    const bar = side === 'foe' ? foeBar : plyBar;
    bar.name.textContent = G.party.displayName(mon);
    bar.lv.textContent = 'Lv' + mon.level;
    bar.status.textContent = mon.status ? mon.status.toUpperCase() : '';
    bar.status.className = 'b-status' + (mon.status ? ' s-' + mon.status : '');
    const pct = Math.max(0, mon.hp / mon.stats.maxHp) * 100;
    bar.fill.style.width = pct + '%';
    bar.fill.className = 'b-fill ' + (pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low');
    if (bar.hpText) bar.hpText.textContent = mon.hp + ' / ' + mon.stats.maxHp;
  }

  function animHp(side, targetHp, max) {
    return new Promise((resolve) => {
      const bar = side === 'foe' ? foeBar : plyBar;
      const s = side === 'foe' ? battle.foe : battle.player;
      const mon = G.battle.active(s);
      const start = parseFloat(bar.fill.style.width) || (mon.hp / max * 100);
      const end = Math.max(0, targetHp / max) * 100;
      const dur = 420, t0 = performance.now();
      function frame(t) {
        const k = Math.min(1, (t - t0) / dur);
        const pct = start + (end - start) * k;
        bar.fill.style.width = pct + '%';
        bar.fill.className = 'b-fill ' + (pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'low');
        if (bar.hpText) bar.hpText.textContent = Math.round(pct / 100 * max) + ' / ' + max;
        if (k < 1) requestAnimationFrame(frame); else { if (bar.hpText) bar.hpText.textContent = targetHp + ' / ' + max; resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  function msg(text, wait) {
    return new Promise((resolve) => {
      msgBox.textContent = text;
      const t = wait == null ? 700 : wait;
      let done = false; const fin = () => { if (done) return; done = true; off(); resolve(); };
      const off = G.input.on('press', (b) => { if (b === 'a' || b === 'b') fin(); });
      setTimeout(fin, t);
    });
  }

  async function playEvents(events) {
    for (const ev of events) {
      if (ev.t === 'text') { await msg(ev.s, ev.level ? 900 : 700); }
      else if (ev.t === 'move') { flash(ev.side); if (G.audio) G.audio.play('hit'); }
      else if (ev.t === 'hp') { await animHp(ev.side, ev.hp, ev.max); if (ev.dmg && G.audio) G.audio.play(ev.dmg > 0 ? 'hit' : 'weakhit'); }
      else if (ev.t === 'status') { updateBar(ev.side); }
      else if (ev.t === 'stat') { flash(ev.side); }
      else if (ev.t === 'faint') { if (G.audio) G.audio.play('faint'); await faintAnim(ev.side); }
      else if (ev.t === 'switch') { if (ev.side === 'foe') { setSprite('foe', G.battle.active(battle.foe)); updateBar('foe'); } else { setSprite('ply', G.battle.active(battle.player)); updateBar('ply'); } await wait(250); }
      else if (ev.t === 'ballthrow') { if (G.audio) G.audio.play('ball'); await ballAnim(); }
      else if (ev.t === 'shakes') { await shakeAnim(ev.n); }
      else if (ev.t === 'evolve') { evolves.push(ev); }
      else if (ev.t === 'end') { /* handled by caller */ }
    }
  }
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function flash(side) { const w = side === 'foe' ? foeSprite : plySprite; w.classList.remove('flash'); void w.offsetWidth; w.classList.add('flash'); }
  function faintAnim(side) { const w = side === 'foe' ? foeSprite : plySprite; w.classList.add('faint'); return wait(650).then(() => w.classList.remove('faint')); }
  function ballAnim() { foeSprite.classList.add('caught'); return wait(500); }
  function shakeAnim(n) { return wait(300 + n * 350); }

  async function chooseAction() {
    while (true) {
      const act = await G.gui.choice([
        { label: '⚔ Fight', value: 'fight' },
        { label: '🎒 Bag', value: 'bag' },
        { label: '🔄 Pokémon', value: 'party' },
        { label: battle.kind === 'trainer' ? '🏳 Run' : '🏃 Run', value: 'run' },
      ], { title: 'What will you do?', layerClass: 'battle-menu', cancelable: false });
      if (act === 'fight') { const m = await chooseMove(); if (m != null) return { type: 'move', index: m }; }
      else if (act === 'bag') { const a = await chooseItem(); if (a) return a; }
      else if (act === 'party') { const a = await chooseSwitch(false); if (a) return a; }
      else if (act === 'run') { return { type: 'run' }; }
    }
  }

  async function chooseMove() {
    const mon = G.battle.active(battle.player);
    const items = mon.moves.map((mv, i) => {
      const m = G.move(mv.key);
      return { label: m.name, value: i, hint: m.type.slice(0, 3).toUpperCase() + ' ' + mv.pp + '/' + mv.ppMax, disabled: mv.pp <= 0 };
    });
    return G.gui.choice(items, { title: 'Choose a move', layerClass: 'battle-menu move-menu', cancelValue: null });
  }

  async function chooseItem() {
    const p = P();
    const keys = Object.keys(p.bag).filter((k) => p.bag[k] > 0);
    if (!keys.length) { await msg('Your Bag is empty!', 600); return null; }
    const items = keys.map((k) => ({ label: G.ITEMS[k].name, value: k, hint: '×' + p.bag[k] }));
    const chosen = await G.gui.choice(items, { title: 'Bag', layerClass: 'battle-menu', cancelValue: null });
    if (!chosen) return null;
    const it = G.ITEMS[chosen];
    if (it.kind === 'ball') {
      if (battle.kind === 'trainer') { await msg('You can\'t catch another Trainer\'s Pokémon!', 800); return null; }
      p.bag[chosen]--; return { type: 'ball', item: chosen };
    }
    if (it.kind === 'heal' || it.kind === 'revive' || it.kind === 'cure') {
      const target = await chooseTargetForItem(it);
      if (target == null) return null;
      p.bag[chosen]--; if (G.audio) G.audio.play('heal');
      return { type: 'item', item: chosen, targetIndex: target };
    }
    return null;
  }
  async function chooseTargetForItem(it) {
    const p = P();
    const items = p.party.map((m, i) => ({
      label: G.party.displayName(m), value: i,
      hint: m.hp + '/' + m.stats.maxHp + (m.status ? ' ' + m.status : ''),
      disabled: it.kind === 'revive' ? m.hp > 0 : m.hp <= 0,
    }));
    return G.gui.choice(items, { title: 'Use on which Pokémon?', layerClass: 'battle-menu', cancelValue: null });
  }

  async function chooseSwitch(forced) {
    const p = P();
    const items = p.party.map((m, i) => ({
      label: G.party.displayName(m), value: i,
      hint: 'Lv' + m.level + '  ' + m.hp + '/' + m.stats.maxHp,
      disabled: m.hp <= 0 || i === battle.player.i,
    }));
    const v = await G.gui.choice(items, { title: forced ? 'Choose your next Pokémon' : 'Switch to…', layerClass: 'battle-menu', cancelable: !forced, cancelValue: null });
    if (v == null) return null;
    return forced ? v : { type: 'switch', index: v };
  }

  async function run(cfg) {
    // intro
    if (battle.kind === 'trainer') {
      await msg((cfg.foeName || 'A Trainer') + ' wants to battle!', 900);
      await msg((cfg.foeName || 'The Trainer') + ' sent out ' + G.party.displayName(G.battle.active(battle.foe)) + '!', 800);
    } else {
      await msg('A wild ' + G.battle.active(battle.foe).species + ' appeared!', 900);
    }
    await msg('Go! ' + G.party.displayName(G.battle.active(battle.player)) + '!', 700);

    while (!battle.over) {
      const action = await chooseAction();
      const res = G.battle.doTurn(battle, action);
      await playEvents(res.events);
      if (battle.over) break;
      if (res.needsPlayerSwitch) {
        const idx = await chooseSwitch(true);
        if (idx != null) { G.battle.forceSwitch(battle, 'player', idx); setSprite('ply', G.battle.active(battle.player)); updateBar('ply'); await msg('Go! ' + G.party.displayName(G.battle.active(battle.player)) + '!', 600); }
      }
    }
    await finish();
  }

  async function finish() {
    const result = battle.result;
    if (result === 'win' && battle.kind === 'trainer') { /* messages already shown by engine text events */ }
    // process evolutions queued during the battle
    for (const ev of evolves) { await doEvolve(ev.mon, ev.to); }
    await wait(200);
    cleanup();
    resolveFn({ result, caught: battle.caught || null });
  }

  async function doEvolve(mon, toName) {
    await G.gui.dialogue(['Huh? ' + G.party.displayName(mon) + ' is evolving!']);
    if (G.audio) G.audio.play('evolve');
    G.party.evolve(mon, toName);
    G.party.ownDex(P(), toName);
    await G.gui.dialogue(['Congratulations! Your Pokémon evolved into ' + toName + '!']);
  }

  function cleanup() { const layer = document.getElementById('battle-root'); if (layer) layer.remove(); }

  G.battlescene = { start };
})();

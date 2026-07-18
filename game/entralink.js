/* entralink.js — the Entralink, 1:1 with the Black/White loop:
 *  - The menu warps you INTO the Entralink map (like the C-Gear), from the
 *    very start of the game.
 *  - The glowing Entree tree = Game Sync: tuck in a Pokémon and enter the
 *    Dream World (opens as an overlay).
 *  - Pokémon befriended in the Dream World wake up in the ENTREE FOREST at
 *    the north of the map: battle them there and a ball NEVER fails; they
 *    join your party with their Dream World Hidden Ability.
 *  - The white bridges east/west lead to a friend's world (crossover).
 *  - The warp pads return you exactly where you were. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const el = (t, a, k) => G.gui.el(t, a, k);
  const P = () => G.game.player;
  const DW_SAVE_KEY = 'dreamworld_save_v1';

  // ---------- warp in / out ----------
  async function warpIn() {
    const p = P();
    if (p.map === 'entralink') { G.gui.toast('You are already in the Entralink.'); return; }
    p.entralinkReturn = { map: p.map, x: p.x, y: p.y, dir: p.dir };
    if (G.audio) G.audio.play('warp');
    await G.gui.fade('out', 350);
    G.world.enter('entralink', 9, 7, 'up');
    await G.gui.fade('in', 350);
    if (!p.flags.entralink_intro) {
      p.flags.entralink_intro = true;
      G.save.save(p);
      await G.gui.dialogue([
        'Whoa! You were pulled into the ENTRALINK — the mysterious realm at the heart of Unova!',
        'Touch the glowing Entree tree to Game Sync into the Dream World.',
        'Friends you make there will wake up in the Entree Forest, just north. In that forest, a Poké Ball never fails!',
      ]);
    }
  }

  async function exitPrompt() {
    const p = P();
    const yes = await G.gui.confirm(null, { title: 'Step on the warp pad and return to Unova?', yes: 'Return', no: 'Stay' });
    if (!yes) return false;
    const ret = p.entralinkReturn || { map: 'nuvema', x: 9, y: 11, dir: 'down' };
    if (G.audio) G.audio.play('warp');
    await G.gui.fade('out', 350);
    G.world.enter(ret.map, ret.x, ret.y, ret.dir || 'down');
    await G.gui.fade('in', 350);
    return true;
  }

  // ---------- Entree tree (Game Sync) ----------
  async function gameSyncMenu() {
    const v = await G.gui.choice([
      { label: '🌙 Game Sync — enter the Dream World', value: 'dream' },
      { label: '↔ Cross over to a friend\'s world', value: 'crossover' },
      { label: '✖ Not now', value: null },
    ], { title: 'The Entree shimmers softly...', cancelValue: null });
    if (v === 'dream') { await G.gui.dialogue(['A Pokémon is tucked in beside the Entree...', 'Sweet dreams. Game Sync, start!']); await open(); }
    else if (v === 'crossover') await open('crossover');
  }

  async function bridgePrompt() {
    await G.link.friendMenu();
  }

  // ---------- Dream World save bridge (the Entree Forest pipeline) ----------
  function readDreamSave() {
    try { const raw = localStorage.getItem(DW_SAVE_KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }

  // Befriended Dream World Pokémon not yet brought through the forest.
  function dreamMons() {
    const s = readDreamSave();
    if (!s || !Array.isArray(s.box)) return [];
    const p = P();
    return s.box.filter((m) => m && m.uid && !p.flags['dw_claim_' + m.uid]).slice(0, 8);
  }

  function assignSlots(map) {
    const mons = dreamMons();
    const out = [];
    (map.dreamSlots || []).forEach((s, i) => { if (mons[i]) out.push({ x: s.x, y: s.y, dm: mons[i] }); });
    return out;
  }

  // Gen-5 has no fairy type — map Dream World fairy-types back to normal.
  function bwTypes(types) {
    const t = (types || ['normal']).map((x) => (x === 'fairy' ? 'normal' : x));
    return [...new Set(t)];
  }

  const TYPE_MOVES = {
    normal: ['tackle', 'headbutt'], fire: ['ember', 'flamewheel'], water: ['watergun', 'bubblebeam'],
    grass: ['vinewhip', 'razorleaf'], electric: ['thundershock', 'spark'], ice: ['iceshard', 'aurorabeam'],
    fighting: ['lowkick', 'doublekick'], poison: ['poisonsting', 'headbutt'], ground: ['mudslap', 'dig_'],
    flying: ['peck', 'wingattack'], psychic: ['confusion', 'psybeam'], bug: ['bugbite', 'strugglebug'],
    rock: ['rockthrow', 'rocktomb'], ghost: ['lick', 'hex'], dragon: ['dragonbreath', 'dragonclaw'],
    dark: ['bite', 'suckerpunch'], steel: ['metalclaw', 'ironhead'],
  };

  // Make sure the species exists in the RPG data; synthesize an entry for
  // Dream-World-only species so they are fully usable in battle.
  function ensureSpecies(dm) {
    if (G.SPECIES[dm.name]) return dm.name;
    const types = bwTypes(dm.types);
    const tm = TYPE_MOVES[types[0]] || TYPE_MOVES.normal;
    const ls = [[1, 'tackle'], [1, tm[0]], [7, tm[1]], [13, 'quickattack']]
      .filter((e, i, arr) => arr.findIndex((x) => x[1] === e[1]) === i);
    G.SPECIES[dm.name] = {
      dex: dm.speciesId, name: dm.name, types,
      base: [55, 60, 55, 60, 55, 60], ability: dm.ability || 'Run Away',
      catchRate: 190, exp: 64, ls, evo: null,
    };
    return dm.name;
  }

  function makeDreamMon(dm) {
    const name = ensureSpecies(dm);
    const level = Math.max(5, dm.level || 5);
    const mon = G.party.makeMon(name, level, { shiny: !!dm.shiny, nickname: dm.nickname || '' });
    if (dm.ability) mon.ability = dm.ability; // the Dream World Hidden Ability
    return mon;
  }

  function markClaimed(dm) {
    const p = P();
    p.flags['dw_claim_' + dm.uid] = true;
    // 1:1 with BW: a tucked-in Pokémon leaves the Dream World for the forest.
    try {
      const raw = localStorage.getItem(DW_SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        s.box = (s.box || []).filter((m) => !m || m.uid !== dm.uid);
        if (s.gift && s.gift.uid === dm.uid) s.gift = null;
        localStorage.setItem(DW_SAVE_KEY, JSON.stringify(s));
      }
    } catch (e) { /* keep the flag as the source of truth */ }
    G.save.save(p);
  }

  // Battle a drowsy forest Pokémon — in the Entree Forest a ball never fails.
  async function encounterDream(spot) {
    const p = P();
    const dm = spot.dm;
    const dname = dm.nickname || dm.name;
    if (!p.party.length) { await G.gui.dialogue([dname + ' is dreaming peacefully...', 'You need a partner Pokémon of your own before it can join you!']); return; }
    await G.gui.dialogue(['A drowsy ' + dname + ' is dozing at the forest\'s edge...', 'It remembers you from the Dream World! It stirs awake!']);
    G.party.seeDex(p, dm.name);
    const foe = makeDreamMon(dm);
    const res = await G.game.startBattle({ kind: 'wild', foeParty: [foe], dreamForest: true });
    if (res.result === 'caught' && res.caught) {
      if (dm.ability) res.caught.ability = dm.ability;
      const where = G.party.addToParty(p, res.caught);
      markClaimed(dm);
      G.world.refreshDreamSpots();
      if (G.audio) G.audio.play('win');
      await G.gui.dialogue([
        dname + ' came through the Entree Forest to your world!',
        '✨ It kept its Dream World Hidden Ability: ' + (dm.ability || res.caught.ability) + '!',
        where === 'party' ? 'It joined your party!' : 'It was sent to your PC Box.',
      ]);
    } else if (res.result === 'win') {
      await G.gui.dialogue([dname + ' drifted back to sleep...', 'It will keep waiting for you here.']);
    } else if (res.result === 'ran') {
      await G.gui.dialogue([dname + ' curled back up under the Entree.']);
    }
    G.game.updateHud && G.game.updateHud();
  }

  // ---------- Dream World overlay (Game Sync) ----------
  let open_ = false;
  function open(view) {
    if (open_) return Promise.resolve();
    open_ = true;
    if (G.audio) G.audio.play('warp');
    return new Promise((resolve) => {
      const frame = el('iframe', { class: 'entralink-frame', title: 'Dream World' });
      // Bundled single-file build embeds the Dream World as srcdoc; otherwise
      // load the standalone dreamworld.html.
      if (window.DREAMWORLD_HTML_B64) { try { frame.srcdoc = decodeURIComponent(escape(atob(window.DREAMWORLD_HTML_B64))); } catch (e) { frame.src = 'dreamworld.html'; } }
      else frame.src = 'dreamworld.html';
      if (view) frame.addEventListener('load', () => {
        try { frame.contentWindow.postMessage({ dw: 'view', view }, '*'); } catch (e) {}
      });
      const header = el('div', { class: 'entralink-header' }, [
        el('div', { class: 'entralink-title' }, ['↔ ', el('b', {}, 'Entralink'), ' — Game Sync: Dream World']),
        el('button', { class: 'entralink-close', onclick: () => close() }, '✕ Wake up'),
      ]);
      const panel = el('div', { class: 'entralink-panel' }, [header, frame]);
      const overlay = el('div', { class: 'ui-layer entralink-layer' }, panel);
      overlay.id = 'entralink-overlay';
      (document.getElementById('game-ui') || document.body).appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));
      G.input.setEnabled(false);
      let done = false;
      function close() {
        if (done) return; done = true; open_ = false;
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
        G.input.setEnabled(true);
        if (G.audio) { G.audio.play('warp'); G.audio.startMusic((G.world.mapObj() && G.world.mapObj().music) || 'town'); }
        // New dream friends may be waiting in the forest now.
        G.world.refreshDreamSpots();
        resolve();
      }
      const onKey = (e) => { if (e.key === 'Escape') { close(); window.removeEventListener('keydown', onKey); } };
      window.addEventListener('keydown', onKey);
    });
  }

  G.entralink = { warpIn, exitPrompt, gameSyncMenu, bridgePrompt, encounterDream, assignSlots, dreamMons, open };
})();

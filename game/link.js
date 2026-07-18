/* link.js — serverless "play with a friend" over share codes / links.
 *  - Battle a friend's REAL team from a code (they battle yours the same way).
 *  - Send a Pokémon to a friend as a gift code / link.
 * Everything is encoded into text — no server, no accounts — so it works even
 * inside the hosted single-file build. A friend just pastes a code, or opens a
 * link like  <game-url>#battle=UNOVA-B1....  /  #gift=UNOVA-P1.... */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const el = (t, a, k) => G.gui.el(t, a, k);
  const P = () => G.game.player;
  const BATTLE_PREFIX = 'UNOVA-B1.';
  const GIFT_PREFIX = 'UNOVA-P1.';

  function enc(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
  function dec(s) { return JSON.parse(decodeURIComponent(escape(atob(s)))); }

  // Compact, self-contained Pokémon record (no dependency on the importer's data).
  function packMon(m) {
    return { s: m.species, dex: m.dex, ty: m.types, b: monBase(m), a: m.ability, l: m.level, m: m.moves.map((x) => x.key), sh: !!m.shiny, n: m.nickname || '' };
  }
  function monBase(m) {
    const sp = G.species(m.species);
    return sp ? sp.base : [55, 60, 55, 60, 55, 60];
  }
  // Register a species from a packed record if we don't already know it,
  // then build a live Pokémon.
  function hydrate(pm) {
    if (!G.SPECIES[pm.s]) {
      G.SPECIES[pm.s] = { dex: pm.dex, name: pm.s, types: pm.ty || ['normal'], base: pm.b || [55, 60, 55, 60, 55, 60], ability: pm.a || 'Run Away', catchRate: 120, exp: 120, ls: [[1, (pm.m && pm.m[0]) || 'tackle']], evo: null };
    }
    const moves = (pm.m && pm.m.length ? pm.m : ['tackle']).filter((k) => G.MOVES[k]).slice(0, 4);
    const mon = G.party.makeMon(pm.s, pm.l || 5, { moves: moves.length ? moves : ['tackle'], shiny: pm.sh, nickname: pm.n });
    if (pm.a) mon.ability = pm.a;
    if (pm.ty) mon.types = pm.ty;
    return mon;
  }

  function myTeamCode() {
    const p = P();
    return BATTLE_PREFIX + enc({ v: 1, name: p.name, gender: p.gender, team: p.party.map(packMon) });
  }
  function monGiftCode(mon) { return GIFT_PREFIX + enc({ v: 1, from: P().name, mon: packMon(mon) }); }
  function gameUrl() { return location.origin + location.pathname; }

  function parse(code, prefix) {
    const clean = String(code || '').trim().replace(/\s+/g, '');
    const i = clean.indexOf(prefix);
    if (i < 0) throw new Error('bad code');
    return dec(clean.slice(i + prefix.length));
  }

  // ---------- clipboard + code modal ----------
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); G.gui.toast('Copied!', {}); return; }
    catch (e) {}
    const ta = el('textarea', {}); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); G.gui.toast('Copied!', {}); } catch (e2) { G.gui.toast('Select the text and copy it.', {}); }
    ta.remove();
  }
  function showCode(title, code, blurb) {
    return new Promise((resolve) => {
      const box = el('textarea', { class: 'link-code', readonly: 'readonly', rows: '4' });
      box.value = code;
      const link = gameUrl() + '#' + (code.startsWith(BATTLE_PREFIX) ? 'battle=' : 'gift=') + encodeURIComponent(code);
      const panel = el('div', { class: 'link-panel' }, [
        el('div', { class: 'link-title' }, title),
        blurb ? el('div', { class: 'link-blurb' }, blurb) : null,
        box,
        el('div', { class: 'link-actions' }, [
          el('button', { class: 'link-btn', onclick: () => copy(code) }, '⧉ Copy code'),
          el('button', { class: 'link-btn', onclick: () => copy(link) }, '🔗 Copy link'),
          el('button', { class: 'link-btn done', onclick: () => close() }, 'Done'),
        ]),
      ]);
      const overlay = el('div', { class: 'ui-layer link-layer' }, panel);
      (document.getElementById('game-ui') || document.body).appendChild(overlay);
      box.focus(); box.select();
      const off = G.input.on('press', (b) => { if (b === 'b') close(); });
      function close() { off(); overlay.remove(); resolve(); }
    });
  }
  function askCode(title, placeholder) {
    return new Promise((resolve) => {
      const box = el('textarea', { class: 'link-code', rows: '4', placeholder: placeholder || 'Paste your friend\'s code here' });
      const panel = el('div', { class: 'link-panel' }, [
        el('div', { class: 'link-title' }, title),
        box,
        el('div', { class: 'link-actions' }, [
          el('button', { class: 'link-btn done', onclick: () => submit() }, '✓ Load'),
          el('button', { class: 'link-btn', onclick: () => close(null) }, 'Cancel'),
        ]),
      ]);
      const overlay = el('div', { class: 'ui-layer link-layer' }, panel);
      (document.getElementById('game-ui') || document.body).appendChild(overlay);
      box.focus();
      G.input.setEnabled(false);
      function done(v) { G.input.setEnabled(true); overlay.remove(); resolve(v); }
      function submit() { done(box.value); }
      function close(v) { done(v); }
    });
  }

  // ---------- flows ----------
  async function battleFriend(codeMaybe) {
    const raw = codeMaybe || await askCode('⚔ Battle a friend', 'Paste your friend\'s UNOVA-B1 team code');
    if (!raw) return;
    let data;
    try { data = parse(raw, BATTLE_PREFIX); } catch (e) { await G.gui.dialogue(['That isn\'t a valid battle code.', 'Ask your friend for their "battle link" from their Entralink.']); return; }
    if (!data.team || !data.team.length) { await G.gui.dialogue(['That team code was empty.']); return; }
    if (!P().party.length) { await G.gui.dialogue(['You need a Pokémon of your own before you can battle!']); return; }
    const foe = data.team.slice(0, 6).map(hydrate);
    const name = (data.name || 'Rival') + '\'s team';
    await G.gui.dialogue(['A challenge from ' + (data.name || 'a friend') + ' crossed the bridge!', (data.name || 'Your friend') + ' wants to battle with their team of ' + foe.length + '!']);
    const res = await G.game.startBattle({ kind: 'trainer', foeParty: foe, foeName: (data.name || 'Rival') });
    if (res.result === 'win') {
      const prize = 3000;
      P().money += prize; G.save.save(P()); G.game.updateHud && G.game.updateHud();
      if (G.audio) G.audio.play('win');
      await G.gui.dialogue(['You beat ' + (data.name || 'your friend') + '\'s team! You earned ¥' + prize + '.', 'Send them YOUR battle link for a rematch!']);
    } else if (res.result === 'lose') {
      await G.gui.dialogue([(data.name || 'Your friend') + '\'s team was too strong this time!']);
    }
    G.game.updateHud && G.game.updateHud();
  }

  async function sendPokemon() {
    const p = P();
    const roster = p.party.concat(p.boxes[0] || []);
    if (!roster.length) { await G.gui.dialogue(['You have no Pokémon to send yet.']); return; }
    const i = await G.gui.choice(roster.map((m, idx) => ({
      label: (m.shiny ? '✦ ' : '') + G.party.displayName(m), value: idx, hint: 'Lv' + m.level,
    })).concat([{ label: '‹ Cancel', value: -1 }]), { title: 'Send which Pokémon? (they get a copy)', layerClass: 'bag-menu', cancelValue: -1 });
    if (i == null || i < 0) return;
    const code = monGiftCode(roster[i]);
    await showCode('🎁 Gift: ' + G.party.displayName(roster[i]), code, 'Send this code or link to a friend. They open it to receive ' + G.party.displayName(roster[i]) + ' with its moves & Ability.');
  }

  async function receiveGift(codeMaybe) {
    const raw = codeMaybe || await askCode('📥 Receive a Pokémon', 'Paste a friend\'s UNOVA-P1 gift code');
    if (!raw) return;
    let data;
    try { data = parse(raw, GIFT_PREFIX); } catch (e) { await G.gui.dialogue(['That isn\'t a valid gift code.']); return; }
    const mon = hydrate(data.mon);
    mon.from = 'friend'; mon.fromTrainer = data.from || 'a friend';
    const where = G.party.addToParty(P(), mon);
    if (G.audio) G.audio.play('catchgood');
    G.save.save(P()); G.game.updateHud && G.game.updateHud();
    await G.gui.dialogue([
      'A Pokémon arrived from ' + (data.from || 'a friend') + '!',
      (data.from || 'Your friend') + ' sent you ' + G.party.displayName(mon) + ' (Lv ' + mon.level + ', ' + mon.ability + ')!',
      where === 'party' ? 'It joined your party!' : 'It was sent to your PC Box.',
    ]);
  }

  async function myLink() {
    if (!P().party.length) { await G.gui.dialogue(['Catch a Pokémon first, then share your battle link!']); return; }
    await showCode('🔗 Your battle link', myTeamCode(), 'Send this to a friend. They open it to battle YOUR current team of ' + P().party.length + '. (It\'s a snapshot — update it anytime.)');
  }

  // Friend hub, opened from the Entralink white bridge.
  async function friendMenu() {
    while (true) {
      const v = await G.gui.choice([
        { label: '⚔ Battle a friend\'s team', value: 'battle' },
        { label: '🔗 Show my battle link', value: 'mylink' },
        { label: '🎁 Send a Pokémon', value: 'send' },
        { label: '📥 Receive a Pokémon', value: 'recv' },
        { label: '🌙 Visit dreams (Dream World)', value: 'dream' },
        { label: '‹ Back', value: null },
      ], { title: 'The bridge to a friend\'s world', cancelValue: null });
      if (v == null) return;
      if (v === 'battle') await battleFriend();
      else if (v === 'mylink') await myLink();
      else if (v === 'send') await sendPokemon();
      else if (v === 'recv') await receiveGift();
      else if (v === 'dream') { await G.entralink.open('crossover'); }
    }
  }

  // Handle a #battle= / #gift= link the game was opened with.
  function pendingFromHash() {
    const h = location.hash || '';
    let m = /[#&]battle=([^&]+)/.exec(h);
    if (m) return { kind: 'battle', code: decodeURIComponent(m[1]) };
    m = /[#&]gift=([^&]+)/.exec(h);
    if (m) return { kind: 'gift', code: decodeURIComponent(m[1]) };
    return null;
  }
  async function handlePending(pending) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    if (pending.kind === 'battle') await battleFriend(pending.code);
    else if (pending.kind === 'gift') await receiveGift(pending.code);
  }

  G.link = { myTeamCode, monGiftCode, friendMenu, battleFriend, sendPokemon, receiveGift, myLink, pendingFromHash, handlePending };
})();

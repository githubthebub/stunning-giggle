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
  const BATTLE_PREFIX = 'UNOVA-B2.';
  const GIFT_PREFIX = 'UNOVA-P2.';

  // ---- shared lookup tables (both players run the same game data) ----
  function tables() {
    const moveKeys = Object.keys(G.MOVES);
    const moveIndex = {}; moveKeys.forEach((k, i) => { moveIndex[k] = i; });
    const abil = [...new Set(Object.values(G.SPECIES).map((s) => s.ability))].sort();
    const abilIndex = {}; abil.forEach((a, i) => { abilIndex[a] = i; });
    const byDex = {}; Object.values(G.SPECIES).forEach((s) => { byDex[s.dex] = s.name; });
    return { moveKeys, moveIndex, abil, abilIndex, byDex, types: G.TYPES };
  }

  // ---- tiny binary writer / reader + url-safe base64 ----
  function bw() { const a = []; const enc = new TextEncoder(); return {
    u8: (v) => a.push(v & 255),
    u16: (v) => { a.push(v & 255); a.push((v >> 8) & 255); },
    str: (s) => { const b = enc.encode((s || '').slice(0, 40)); a.push(b.length & 255); for (const x of b) a.push(x); },
    bytes: () => Uint8Array.from(a),
  }; }
  function br(u8) { let p = 0; const dec = new TextDecoder(); return {
    u8: () => u8[p++],
    u16: () => { const v = u8[p] | (u8[p + 1] << 8); p += 2; return v; },
    str: () => { const n = u8[p++]; const s = dec.decode(u8.slice(p, p + n)); p += n; return s; },
  }; }
  function b64urlEnc(u8) { let bin = ''; for (const b of u8) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64urlDec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }

  function packMonBytes(w, m, T) {
    w.u16(m.dex); w.u8(Math.min(100, m.level || 1));
    const knownName = T.byDex[m.dex];
    const sp = knownName ? G.species(knownName) : null;
    const known = !!sp && knownName === m.species;
    const defAbil = sp ? sp.ability : null;
    const moves = (m.moves || []).map((x) => x.key).slice(0, 4);
    const nick = m.nickname || '';
    const custom = known && m.ability && m.ability !== defAbil;
    let flags = 0;
    if (m.shiny) flags |= 1;
    if (nick) flags |= 2;
    if (custom) flags |= 4;
    if (!known) flags |= 8;
    w.u8(flags);
    w.u8(moves.length);
    moves.forEach((k) => w.u8(T.moveIndex[k] != null ? T.moveIndex[k] : 0));
    if (custom) { const ai = T.abilIndex[m.ability]; if (ai != null && ai < 254) w.u8(ai); else { w.u8(254); w.str(m.ability); } }
    if (nick) w.str(nick);
    if (!known) {
      w.str(m.species);
      const ty = m.types || ['normal'];
      w.u8(ty.length); ty.forEach((t) => w.u8(Math.max(0, T.types.indexOf(t))));
      const base = (sp && sp.base) || [55, 60, 55, 60, 55, 60];
      for (let i = 0; i < 6; i++) w.u8(Math.min(255, base[i] || 55));
      w.str(m.ability || 'Run Away');
    }
  }
  // Returns a record hydrate() understands: {s,dex,ty,b,a,l,m,sh,n}
  function unpackMonRecord(r, T) {
    const dex = r.u16(), level = r.u8(), flags = r.u8();
    const shiny = !!(flags & 1), hasNick = !!(flags & 2), custom = !!(flags & 4), ext = !!(flags & 8);
    const mc = r.u8(); const moves = []; for (let i = 0; i < mc; i++) moves.push(T.moveKeys[r.u8()] || 'tackle');
    let ability = null;
    if (custom) { const ai = r.u8(); ability = (ai === 254) ? r.str() : T.abil[ai]; }
    const nick = hasNick ? r.str() : '';
    let name, types, base;
    if (ext) {
      name = r.str();
      const tc = r.u8(); types = []; for (let i = 0; i < tc; i++) types.push(T.types[r.u8()] || 'normal');
      base = []; for (let i = 0; i < 6; i++) base.push(r.u8());
      ability = r.str();
    } else {
      name = T.byDex[dex]; const sp = name ? G.species(name) : null;
      types = sp ? sp.types : ['normal']; base = sp ? sp.base : [55, 60, 55, 60, 55, 60];
      if (!ability) ability = sp ? sp.ability : 'Run Away';
    }
    return { s: name || ('Mon' + dex), dex, ty: types, b: base, a: ability || 'Run Away', l: level, m: moves, sh: shiny, n: nick };
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
    const p = P(); const T = tables(); const w = bw();
    w.u8(1); w.str(p.name || 'Rival');
    const team = p.party.slice(0, 6);
    w.u8(team.length);
    team.forEach((m) => packMonBytes(w, m, T));
    return BATTLE_PREFIX + b64urlEnc(w.bytes());
  }
  function monGiftCode(mon) {
    const T = tables(); const w = bw();
    w.u8(1); w.str(P().name || 'a friend');
    packMonBytes(w, mon, T);
    return GIFT_PREFIX + b64urlEnc(w.bytes());
  }
  function gameUrl() { return location.origin + location.pathname; }

  function stripPrefix(code, prefixes) {
    const clean = String(code || '').trim().replace(/\s+/g, '');
    for (const p of prefixes) { const i = clean.indexOf(p); if (i >= 0) return { body: clean.slice(i + p.length), prefix: p }; }
    return null;
  }
  // Old JSON format (v1) fallback so previously-shared codes still work.
  function decOldJson(body) { return JSON.parse(decodeURIComponent(escape(atob(body)))); }

  function parseTeam(code) {
    const s = stripPrefix(code, ['UNOVA-B2.', 'UNOVA-B1.']);
    if (!s) throw new Error('not a battle code');
    if (s.prefix === 'UNOVA-B1.') return decOldJson(s.body);
    const T = tables(); const r = br(b64urlDec(s.body));
    r.u8(); // version
    const name = r.str(); const n = r.u8(); const team = [];
    for (let i = 0; i < n; i++) team.push(unpackMonRecord(r, T));
    return { name, team };
  }
  function parseGift(code) {
    const s = stripPrefix(code, ['UNOVA-P2.', 'UNOVA-P1.']);
    if (!s) throw new Error('not a gift code');
    if (s.prefix === 'UNOVA-P1.') return decOldJson(s.body);
    const T = tables(); const r = br(b64urlDec(s.body));
    r.u8(); // version
    const from = r.str(); const mon = unpackMonRecord(r, T);
    return { from, mon };
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
      const link = gameUrl() + '#' + (/UNOVA-B/.test(code) ? 'battle=' : 'gift=') + code;
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
    try { data = parseTeam(raw); } catch (e) { await G.gui.dialogue(['That isn\'t a valid battle code.', 'Ask your friend for their "battle link" from their Entralink.']); return; }
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
    try { data = parseGift(raw); } catch (e) { await G.gui.dialogue(['That isn\'t a valid gift code.']); return; }
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

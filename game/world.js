/* world.js — the overworld scene: rendering, grid movement, collision,
 * HM field mechanics, wild encounters, NPC interaction, and warps. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const TS = 16, VIEW_W = 16, VIEW_H = 12, MOVE_MS = 140, ENC_RATE = 0.12;
  const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  let map = null, busy = false;
  let moving = false, moveT = 0, fromX = 0, fromY = 0, stepFrame = 0, animClock = 0;
  let bump = 0;
  let dreamSpots = []; // Entree Forest: befriended Dream World Pokémon
  const P = () => G.game.player;

  function enter(mapId, x, y, dir, opts) {
    opts = opts || {};
    map = G.maps.build(mapId);
    const p = P();
    p.map = mapId; if (x != null) p.x = x; if (y != null) p.y = y; if (dir) p.dir = dir;
    moving = false; moveT = 0; busy = false;
    // Surf state based on tile.
    const t = G.maps.tileAt(map, p.x, p.y);
    G.game.surfing = (t.terrain === 'water' || t.terrain === 'waterfall');
    // Track visited towns / heal points.
    if (map.npcs && map.npcs.some((n) => n.type === 'heal')) { if (p.visitedTowns.indexOf(mapId) < 0) p.visitedTowns.push(mapId); p.lastHeal = { map: mapId, x: p.x, y: p.y }; }
    else if (p.visitedTowns.indexOf(mapId) < 0 && (mapId === 'nuvema')) p.visitedTowns.push(mapId);
    applyDefeatedNpcs();
    refreshDreamSpots();
    if (G.audio) G.audio.startMusic(map.music || 'route');
    if (!opts.noSave) G.save.save(p);
    G.game.updateHud && G.game.updateHud();
  }

  function refreshDreamSpots() {
    dreamSpots = (map && map.id === 'entralink' && G.entralink) ? G.entralink.assignSlots(map) : [];
  }
  function dreamSpotAt(x, y) { return dreamSpots.find((s) => s.x === x && s.y === y); }

  function applyDefeatedNpcs() {
    const p = P();
    map.activeNpcs = (map.npcs || []).filter((n) => !((n.type === 'e4' || n.type === 'champion') && p.flags[n.id]));
    (map.npcs || []).forEach((n) => { n.beaten = !!p.flags['beat_' + n.id]; });
  }

  function npcAt(x, y) { return (map.activeNpcs || []).find((n) => n.x === x && n.y === y); }

  // Can the player stand on (x,y) given surf state?
  function passable(x, y) {
    const t = G.maps.tileAt(map, x, y);
    if (npcAt(x, y) || dreamSpotAt(x, y)) return false;
    if (t.terrain === 'water') return G.game.surfing || G.party.hasHM(P(), 'surf');
    if (t.terrain === 'waterfall') return G.game.surfing && G.party.hasHM(P(), 'waterfall');
    if (t.terrain === 'cut' || t.terrain === 'boulder' || t.terrain === 'sign') return false;
    if (t.solid) return false;
    return true;
  }

  function update(dt) {
    if (G.game.scene !== 'world' || !map) return;
    animClock += dt;
    if (moving) {
      moveT += dt / MOVE_MS;
      if (moveT >= 1) { moving = false; moveT = 0; onArrive(); }
      stepFrame = moveT < 0.5 ? 1 : 2;
      return;
    }
    if (bump > 0) bump -= dt;
    if (busy || G.gui.isBusy()) return;
    const dir = G.input.currentDir();
    if (dir) tryStep(dir);
    else stepFrame = 0;
  }

  function tryStep(dir) {
    const p = P(); p.dir = dir;
    const [dx, dy] = DIRV[dir];
    const nx = p.x + dx, ny = p.y + dy;
    const t = G.maps.tileAt(map, nx, ny);
    // Ledge: only hop when moving down onto a ledge.
    if (t.terrain === 'water' && !G.game.surfing) {
      if (G.party.hasHM(p, 'surf')) { startSurfPrompt(nx, ny); return; }
      doBump(); return;
    }
    if (!passable(nx, ny)) { doBump(); return; }
    // begin move
    fromX = p.x; fromY = p.y; p.x = nx; p.y = ny; moving = true; moveT = 0;
    if (G.audio && animClock % 2 < 1) {}
  }

  function doBump() { bump = 180; if (G.audio) G.audio.play('bump'); }

  async function startSurfPrompt(nx, ny) {
    busy = true;
    const yes = await G.gui.confirm(null, { title: 'The water is deep and clear. Surf?', yes: 'Surf', no: 'No' });
    if (yes) {
      G.game.surfing = true; if (G.audio) G.audio.play('hm');
      await G.gui.dialogue(['You surfed onto the water!']);
      const p = P(); fromX = p.x; fromY = p.y; p.x = nx; p.y = ny; moving = true; moveT = 0;
    }
    busy = false;
  }

  function onArrive() {
    const p = P();
    const t = G.maps.tileAt(map, p.x, p.y);
    // update surf state
    if (G.game.surfing && t.terrain !== 'water' && t.terrain !== 'waterfall') G.game.surfing = false;
    if (G.audio) G.audio.play('step');
    // Entralink specials: warp pads home, bridges to a friend's world.
    if (map.id === 'entralink') {
      const ch = G.maps.charAt(map, p.x, p.y);
      if (ch === 'v') { busy = true; G.entralink.exitPrompt().then(() => { busy = false; }); return; }
      if (ch === 'b' && (p.x <= 0 || p.x >= map.w - 1)) {
        const backX = p.x <= 0 ? 1 : map.w - 2;
        busy = true;
        G.entralink.bridgePrompt().then(() => { p.x = backX; busy = false; G.save.save(p); });
        return;
      }
      G.save.save(p);
      return; // no warps or wild encounters inside the Entralink
    }
    // warp?
    const w = (map.warps || []).find((w) => w.x === p.x && w.y === p.y);
    if (w) { doWarp(w); return; }
    // encounter?
    const onGrass = t.terrain === 'grass';
    const onWater = t.terrain === 'water' && G.game.surfing;
    if ((onGrass || onWater) && Math.random() < ENC_RATE) { startWildEncounter(onWater ? 'water' : 'grass'); return; }
    // keep walking if still holding a dir
    G.save.save(p);
  }

  async function doWarp(w) {
    busy = true;
    if (G.audio) G.audio.play('warp');
    await G.gui.fade('out', 260);
    enter(w.to, w.tx, w.ty, w.tdir, { noSave: false });
    await G.gui.fade('in', 260);
    busy = false;
  }

  // ---- wild encounter ----
  function pickEncounter(kind) {
    const table = (map.encounters && map.encounters[kind]) || null;
    if (!table || !table.length) return null;
    const total = table.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const en of table) { if ((r -= en.weight) < 0) { const lv = en.min + Math.floor(Math.random() * (en.max - en.min + 1)); return G.party.makeMon(en.species, lv); } }
    return null;
  }
  async function startWildEncounter(kind) {
    const foe = pickEncounter(kind); if (!foe) return;
    busy = true;
    G.party.seeDex(P(), foe.species);
    const res = await G.game.startBattle({ kind: 'wild', foeParty: [foe] });
    afterBattle(res);
    busy = false;
  }

  // ---- interaction (A button) ----
  async function interact() {
    if (!map || moving || busy || G.gui.isBusy() || G.game.scene !== 'world') return;
    const p = P();
    const [dx, dy] = DIRV[p.dir];
    const fx = p.x + dx, fy = p.y + dy;
    const npc = npcAt(fx, fy);
    if (npc) { npc.dir = opp(p.dir); return interactNpc(npc); }
    const spot = dreamSpotAt(fx, fy);
    if (spot) { busy = true; return G.entralink.encounterDream(spot).finally(() => { busy = false; }); }
    const t = G.maps.tileAt(map, fx, fy);
    if (t.terrain === 'entree') { busy = true; return G.entralink.gameSyncMenu().finally(() => { busy = false; }); }
    if (t.terrain === 'sign') { const s = (map.signs || []).find((s) => s.x === fx && s.y === fy); if (s) return G.gui.dialogue(s.text.split('\n')); return; }
    if (t.terrain === 'cut') {
      if (G.party.hasHM(p, 'cut')) { busy = true; if (G.audio) G.audio.play('hm'); await G.gui.dialogue(['You used Cut!']); G.maps.setChar(map, fx, fy, '.'); busy = false; }
      else await G.gui.dialogue(['A slim tree blocks the way. It looks like Cut could clear it.']);
      return;
    }
    if (t.terrain === 'boulder') {
      if (G.party.hasHM(p, 'strength')) { busy = true; if (G.audio) G.audio.play('hm'); await G.gui.dialogue(['You used Strength! The boulder rolled away!']); G.maps.setChar(map, fx, fy, '.'); busy = false; }
      else await G.gui.dialogue(['A huge boulder. It won\'t budge without Strength.']);
      return;
    }
    if (t.terrain === 'water' && !G.game.surfing && G.party.hasHM(p, 'surf')) { return startSurfPrompt(fx, fy); }
  }
  function opp(d) { return { up: 'down', down: 'up', left: 'right', right: 'left' }[d]; }

  async function interactNpc(npc) {
    busy = true;
    try {
      if (npc.type === 'talk') { await G.gui.dialogue(npc.lines, { speaker: npc.name }); }
      else if (npc.type === 'heal') { await G.gui.dialogue(npc.lines || ['Let me heal your Pokémon.'], { speaker: npc.name }); G.party.healParty(P().party); if (G.audio) G.audio.play('heal'); await G.gui.dialogue(['Your Pokémon are full of energy!'], { speaker: npc.name }); G.game.updateHud && G.game.updateHud(); G.save.save(P()); }
      else if (npc.type === 'shop') { await G.menu.openShop(npc); }
      else if (npc.type === 'starter') { await handleStarter(npc); }
      else if (npc.type === 'giver') { await handleGiver(npc); }
      else if (npc.type === 'trainer' || npc.type === 'leader' || npc.type === 'e4' || npc.type === 'champion') { await handleTrainer(npc); }
    } finally { busy = false; }
  }

  async function handleStarter(npc) {
    const p = P();
    if (p.party.length > 0) { await G.gui.dialogue(['Look after your partner, ' + p.name + '!'], { speaker: npc.name }); return; }
    await G.gui.dialogue(['Hello, ' + p.name + '! Ready to choose your first partner?', 'Snivy the Grass type, Tepig the Fire type, or Oshawott the Water type?'], { speaker: npc.name });
    const choice = await G.gui.choice([
      { label: '🌱 Snivy (Grass)', value: 'Snivy' },
      { label: '🔥 Tepig (Fire)', value: 'Tepig' },
      { label: '💧 Oshawott (Water)', value: 'Oshawott' },
    ], { title: 'Choose your partner', cancelable: false });
    const mon = G.party.makeMon(choice, 5);
    G.party.addToParty(p, mon);
    G.party.ownDex(p, choice);
    if (G.audio) G.audio.play('select');
    await G.gui.dialogue([choice + ' is with you now!', 'Head north on Route 1 to begin your journey. Good luck!'], { speaker: npc.name });
    G.save.save(p);
    G.game.updateHud && G.game.updateHud();
  }

  async function handleGiver(npc) {
    const p = P();
    if (p.flags[npc.flag]) { await G.gui.dialogue(['Hope those come in handy!'], { speaker: npc.name }); return; }
    if (npc.require) {
      const [k, v] = npc.require.split(':');
      const ok = k === 'badge' ? p.badges.indexOf(v) >= 0 : true;
      if (!ok) { await G.gui.dialogue(npc.denyLines || ['Come back later.'], { speaker: npc.name }); return; }
    }
    await G.gui.dialogue(npc.lines, { speaker: npc.name });
    if (npc.give.item) { p.bag[npc.give.item] = (p.bag[npc.give.item] || 0) + (npc.give.n || 1); }
    if (npc.give.hm) { if (p.hms.indexOf(npc.give.hm) < 0) p.hms.push(npc.give.hm); if (G.audio) G.audio.play('hm'); }
    p.flags[npc.flag] = true;
    G.save.save(p);
  }

  async function handleTrainer(npc) {
    const p = P();
    if (p.flags['beat_' + npc.id] && npc.type === 'trainer') { await G.gui.dialogue([npc.postLines ? npc.postLines[0] : 'Great battle earlier!'], { speaker: npc.name }); return; }
    if (p.flags['beat_' + npc.id] && (npc.type === 'leader')) { await G.gui.dialogue(['Your bond keeps growing. Well done!'], { speaker: npc.name }); return; }
    await G.gui.dialogue(npc.preLines || npc.lines || ['Let\'s battle!'], { speaker: npc.name });
    const foeParty = npc.team.map(([s, l]) => G.party.makeMon(s, l));
    const res = await G.game.startBattle({ kind: 'trainer', foeParty, foeName: npc.name });
    if (res.result === 'win') {
      p.flags['beat_' + npc.id] = true;
      p.money += npc.money || 0;
      if (G.audio) G.audio.play('coin');
      await G.gui.dialogue((npc.winLines || ['You won!']).concat(['You received ¥' + (npc.money || 0) + '!']), { speaker: npc.name });
      if (npc.type === 'leader') {
        if (p.badges.indexOf(npc.badge) < 0) p.badges.push(npc.badge);
        if (npc.hm && p.hms.indexOf(npc.hm) < 0) p.hms.push(npc.hm);
        if (G.audio) G.audio.play('win');
      }
      if (npc.type === 'e4' || npc.type === 'champion') {
        p.flags[npc.id] = true;
        if (npc.type === 'champion') { p.champion = true; p.flags.champion = true; if (G.audio) G.audio.play('win'); await championEnding(); }
        applyDefeatedNpcs();
      }
      G.game.updateHud && G.game.updateHud();
      G.save.save(p);
    } else {
      afterBattle(res);
    }
  }

  async function championEnding() {
    await G.gui.fade('out', 700);
    await G.gui.dialogue(['🎉  You are the Champion of Unova!  🎉', 'Your dream came true. Now visit the Entralink (press START) to enter the Dream World and cross over to other players!']);
    enter('nuvema', 9, 11, 'up');
    await G.gui.fade('in', 500);
  }

  function afterBattle(res) {
    const p = P();
    if (!res) return;
    if (res.result === 'caught' && res.caught) {
      const where = G.party.addToParty(p, res.caught);
      G.gui.toast((res.caught.nickname || res.caught.species) + ' joined your ' + (where === 'party' ? 'party' : 'PC') + '!', { kind: 'good' });
      G.game.updateHud && G.game.updateHud();
    } else if (res.result === 'lose') {
      whiteout();
    }
    G.save.save(p);
  }

  async function whiteout() {
    const p = P();
    await G.gui.dialogue(['You have no Pokémon left to fight...', 'You scurry back to safety.']);
    await G.gui.fade('out', 400);
    G.party.healParty(p.party);
    const h = p.lastHeal || { map: 'nuvema', x: 9, y: 11 };
    enter(h.map, h.x, h.y, 'down');
    await G.gui.fade('in', 400);
    G.game.updateHud && G.game.updateHud();
  }

  async function flyTo(mapId) {
    const target = G.maps.build(mapId);
    const w = (target.warps || [])[0];
    // land the player on the town corridor near a heal spot
    busy = true;
    await G.gui.fade('out', 300);
    const spot = flyLanding(mapId);
    enter(mapId, spot.x, spot.y, 'down');
    await G.gui.fade('in', 300);
    busy = false;
  }
  function flyLanding(mapId) {
    const m = G.maps.build(mapId);
    // stand just below the top corridor
    for (let y = 1; y < m.h; y++) { if (!G.tiles.get(m.grid[y][9]).solid) return { x: 9, y }; }
    return { x: 9, y: 1 };
  }

  // ---- rendering ----
  function render(ctx) {
    if (!map) return;
    const p = P();
    const px = p.x * TS + (moving ? (p.x - fromX) * 0 : 0);
    // interpolate pixel position
    let ppx = p.x * TS, ppy = p.y * TS;
    if (moving) { const t = moveT; ppx = (fromX + (p.x - fromX) * t) * TS; ppy = (fromY + (p.y - fromY) * t) * TS; }
    let camX = Math.round(ppx - VIEW_W * TS / 2 + TS / 2);
    let camY = Math.round(ppy - VIEW_H * TS / 2 + TS / 2);
    camX = Math.max(0, Math.min(camX, map.w * TS - VIEW_W * TS));
    camY = Math.max(0, Math.min(camY, map.h * TS - VIEW_H * TS));
    if (map.w * TS < VIEW_W * TS) camX = (map.w * TS - VIEW_W * TS) / 2;
    if (map.h * TS < VIEW_H * TS) camY = (map.h * TS - VIEW_H * TS) / 2;

    ctx.fillStyle = '#12131a'; ctx.fillRect(0, 0, VIEW_W * TS, VIEW_H * TS);
    const x0 = Math.floor(camX / TS), y0 = Math.floor(camY / TS);
    for (let y = y0 - 1; y <= y0 + VIEW_H + 1; y++) {
      for (let x = x0 - 1; x <= x0 + VIEW_W + 1; x++) {
        const ch = G.maps.charAt(map, x, y);
        const tile = G.tiles.get(ch);
        tile.draw(ctx, x * TS - camX, y * TS - camY, TS, animClock);
      }
    }
    // entities sorted by y
    const ents = [];
    (map.activeNpcs || []).forEach((n) => ents.push({ y: n.y, draw: (c) => G.sprites.drawCharacter(c, n.x * TS - camX, n.y * TS - camY, TS, { dir: n.dir, body: n.body, step: 0 }) }));
    dreamSpots.forEach((s) => ents.push({ y: s.y, draw: (c) => G.sprites.drawMonTile(c, s.dm.speciesId, s.dm.types, s.x * TS - camX, s.y * TS - camY, TS, animClock) }));
    ents.push({ y: p.y + 0.5, draw: (c) => {
      const dx = ppx - camX, dy = ppy - camY;
      if (G.game.surfing) { c.fillStyle = '#4d90d5'; c.beginPath(); c.ellipse(dx + TS / 2, dy + TS * 0.85, TS * 0.42, TS * 0.24, 0, 0, 7); c.fill(); }
      G.sprites.drawCharacter(c, dx, dy, TS, { dir: p.dir, body: p.gender === 'girl' ? '#e05a8a' : '#e05a6b', step: moving ? stepFrame : 0 });
    } });
    ents.sort((a, b) => a.y - b.y).forEach((en) => en.draw(ctx));
  }

  function init() {
    G.input.on('a', () => { if (G.game.scene === 'world') interact(); });
    G.input.on('start', () => { if (G.game.scene === 'world' && !busy && !G.gui.isBusy()) G.menu.openPause(); });
  }

  G.world = { init, enter, update, render, interact, flyTo, refreshDreamSpots, isBusy: () => busy, mapObj: () => map, TS, VIEW_W, VIEW_H };
})();

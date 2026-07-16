/* battle.js — turn-based battle engine. Produces an ordered event stream the
 * UI plays out. Pure logic (Node-testable via globalThis.G). */
(function (root) {
  'use strict';
  const G = (root.G = root.G || {});
  const P = () => G.party;

  function rand(n) { return Math.floor(Math.random() * n); }
  function chance(pct) { return Math.random() * 100 < pct; }
  function stageMul(s) { s = Math.max(-6, Math.min(6, s)); return s >= 0 ? (2 + s) / 2 : 2 / (2 - s); }

  function newSide(party, isPlayer) {
    return { party, i: 0, isPlayer, stages: freshStages(), flinch: false };
  }
  function freshStages() { return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }; }

  function create(cfg) {
    const b = {
      player: newSide(cfg.playerParty, true),
      foe: newSide(cfg.foeParty, false),
      kind: cfg.kind || 'wild',       // 'wild' | 'trainer'
      foeName: cfg.foeName || '',
      trainerClass: cfg.trainerClass || '',
      canCatch: cfg.kind !== 'trainer',
      dreamForest: !!cfg.dreamForest, // Entree Forest: a ball never fails
      money: cfg.money || 0,          // prize for trainer
      over: false,
      result: null,
      runAttempts: 0,
      turn: 0,
    };
    return b;
  }

  const active = (side) => side.party[side.i];
  function firstHealthy(side) { return side.party.findIndex((m) => m.hp > 0); }
  function anyHealthy(side) { return side.party.some((m) => m.hp > 0); }

  function effStat(mon, side, key) {
    const base = key === 'atk' ? mon.stats.atk : key === 'def' ? mon.stats.def
      : key === 'spa' ? mon.stats.spa : key === 'spd' ? mon.stats.spd : mon.stats.spe;
    let v = base * stageMul(side.stages[key]);
    if (key === 'spe' && mon.status === 'par') v *= 0.25;
    return v;
  }

  function damage(attacker, aside, defender, dside, move) {
    const m = G.move(move);
    const isPhys = m.cat === 'phys';
    const A = effStat(attacker, aside, isPhys ? 'atk' : 'spa');
    const D = effStat(defender, dside, isPhys ? 'def' : 'spd');
    const eff = G.typeEff(m.type, defender.types);
    if (eff === 0) return { dmg: 0, eff, crit: false };
    const stab = attacker.types.indexOf(m.type) >= 0 ? 1.5 : 1;
    const critRate = m.eff && m.eff.highCrit ? 0.125 : 0.0625;
    const crit = Math.random() < critRate;
    const rnd = (85 + rand(16)) / 100;
    let base = Math.floor(Math.floor(Math.floor((2 * attacker.level / 5 + 2) * m.power * A / D) / 50) + 2);
    let mod = stab * eff * rnd * (crit ? 1.5 : 1);
    if (attacker.status === 'brn' && isPhys) mod *= 0.5;
    return { dmg: Math.max(1, Math.floor(base * mod)), eff, crit };
  }

  function accuracyHit(attacker, aside, defender, dside, move) {
    const m = G.move(move);
    if (m.acc == null || m.acc > 100) return true; // never-miss (e.g. Aerial Ace 101)
    const ratio = stageMul(aside.stages.acc) / stageMul(dside.stages.eva);
    return Math.random() * 100 < m.acc * ratio;
  }

  // Foe AI: score each move by expected effectiveness; pick the best.
  function aiChoose(b) {
    const foe = active(b.foe), ply = active(b.player);
    let best = -1, choice = 0;
    active(b.foe).moves.forEach((mv, idx) => {
      if (mv.pp <= 0) return;
      const m = G.move(mv.key);
      let score;
      if (m.cat === 'status') {
        score = (m.eff && m.eff.status && !ply.status) ? 25 + rand(15) : 8 + rand(10);
      } else {
        const eff = G.typeEff(m.type, ply.types);
        const stab = foe.types.indexOf(m.type) >= 0 ? 1.5 : 1;
        score = m.power * eff * stab * (0.85 + Math.random() * 0.3);
      }
      if (score > best) { best = score; choice = idx; }
    });
    return { type: 'move', index: choice };
  }

  function pushMoveEvents(b, aside, dside, moveIndex, ev) {
    const attacker = active(aside), defender = active(dside);
    const mvSlot = attacker.moves[moveIndex];
    if (!mvSlot) return;
    const m = G.move(mvSlot.key);
    const aname = (aside.isPlayer ? '' : (b.kind === 'trainer' ? 'Foe ' : 'Wild ')) + P().displayName(attacker);

    // Can it move? (status)
    if (attacker.status === 'slp') {
      if (attacker.statusCounter > 0) { attacker.statusCounter--; }
      if (attacker.statusCounter > 0) { ev.push({ t: 'text', s: aname + ' is fast asleep.' }); return; }
      ev.push({ t: 'text', s: aname + ' woke up!' }); attacker.status = null;
    }
    if (attacker.status === 'frz') {
      if (m.type === 'fire' || chance(20)) { ev.push({ t: 'text', s: aname + ' thawed out!' }); attacker.status = null; }
      else { ev.push({ t: 'text', s: aname + ' is frozen solid!' }); return; }
    }
    if (attacker.status === 'par' && chance(25)) { ev.push({ t: 'text', s: aname + ' is paralyzed! It can\'t move!' }); return; }
    if (aside.flinch) { ev.push({ t: 'text', s: aname + ' flinched!' }); return; }

    if (mvSlot.pp <= 0) { ev.push({ t: 'text', s: aname + ' has no PP left!' }); return; }
    mvSlot.pp--;
    ev.push({ t: 'move', side: aside.isPlayer ? 'player' : 'foe', move: mvSlot.key, name: m.name, user: aname });

    // Accuracy
    if (m.cat !== 'status' || (m.eff && (m.eff.status || m.eff.stat && m.eff.target === 'foe'))) {
      if (!accuracyHit(attacker, aside, defender, dside, mvSlot.key)) {
        ev.push({ t: 'text', s: aname + '\'s attack missed!' }); return;
      }
    }

    // Damage
    let dealt = 0;
    if (m.cat !== 'status' && m.power > 0) {
      if (m.eff && m.eff.needsSleep && defender.status !== 'slp') { ev.push({ t: 'text', s: 'But it failed!' }); return; }
      const hits = m.eff && m.eff.multi ? m.eff.multi : 1;
      let totalEff = 1, anyCrit = false;
      for (let h = 0; h < hits; h++) {
        if (defender.hp <= 0) break;
        const r = damage(attacker, aside, defender, dside, mvSlot.key);
        totalEff = r.eff; anyCrit = anyCrit || r.crit;
        if (r.eff === 0) { ev.push({ t: 'text', s: 'It doesn\'t affect ' + P().displayName(defender) + '...' }); return; }
        const prevHp = defender.hp;
        defender.hp = Math.max(0, defender.hp - r.dmg);
        dealt += (prevHp - defender.hp); // actual HP lost (for recoil/drain)
        ev.push({ t: 'hp', side: dside.isPlayer ? 'player' : 'foe', hp: defender.hp, max: defender.stats.maxHp, dmg: r.dmg });
      }
      if (anyCrit) ev.push({ t: 'text', s: 'A critical hit!' });
      if (totalEff > 1) ev.push({ t: 'text', s: 'It\'s super effective!' });
      else if (totalEff < 1) ev.push({ t: 'text', s: 'It\'s not very effective...' });
      if (m.eff && m.eff.multi) ev.push({ t: 'text', s: 'Hit ' + m.eff.multi + ' times!' });
    }

    // Faint check on defender before applying secondary effects.
    if (defender.hp <= 0) { applyEndOfMove(b, attacker, aside, dealt, m, ev); ev.push({ t: 'faint', side: dside.isPlayer ? 'player' : 'foe', name: P().displayName(defender) }); return; }

    // Secondary / status-move effects
    applyEffect(b, attacker, aside, defender, dside, m, dealt, ev);
    applyEndOfMove(b, attacker, aside, dealt, m, ev);
  }

  function applyEndOfMove(b, attacker, aside, dealt, m, ev) {
    if (m.eff && m.eff.recoil && dealt > 0) {
      const rec = Math.max(1, Math.floor(dealt * m.eff.recoil));
      attacker.hp = Math.max(0, attacker.hp - rec);
      ev.push({ t: 'text', s: P().displayName(attacker) + ' is hit with recoil!' });
      ev.push({ t: 'hp', side: aside.isPlayer ? 'player' : 'foe', hp: attacker.hp, max: attacker.stats.maxHp, dmg: rec });
      if (attacker.hp <= 0) ev.push({ t: 'faint', side: aside.isPlayer ? 'player' : 'foe', name: P().displayName(attacker) });
    }
    if (m.eff && m.eff.drain && dealt > 0) {
      const heal = Math.max(1, Math.floor(dealt * m.eff.drain));
      const before = attacker.hp;
      attacker.hp = Math.min(attacker.stats.maxHp, attacker.hp + heal);
      if (attacker.hp !== before) {
        ev.push({ t: 'text', s: P().displayName(attacker) + ' drained energy!' });
        ev.push({ t: 'hp', side: aside.isPlayer ? 'player' : 'foe', hp: attacker.hp, max: attacker.stats.maxHp });
      }
    }
  }

  function setStatus(mon, side, status, ev, targetName) {
    if (mon.status) return false;
    if (status === 'brn' && mon.types.indexOf('fire') >= 0) return false;
    if (status === 'frz' && mon.types.indexOf('ice') >= 0) return false;
    if ((status === 'par') && mon.types.indexOf('electric') >= 0 && false) return false;
    mon.status = status;
    if (status === 'slp') mon.statusCounter = 1 + rand(3);
    if (status === 'tox') mon.statusCounter = 1;
    const label = { brn: 'was burned!', par: 'is paralyzed! It may be unable to move!', psn: 'was poisoned!', tox: 'was badly poisoned!', slp: 'fell asleep!', frz: 'was frozen solid!' };
    ev.push({ t: 'status', side: side.isPlayer ? 'player' : 'foe', status });
    ev.push({ t: 'text', s: targetName + ' ' + label[status] });
    return true;
  }

  function applyEffect(b, attacker, aside, defender, dside, m, dealt, ev) {
    const e = m.eff; if (!e) return;
    const foeName = (dside.isPlayer ? '' : (b.kind === 'trainer' ? 'Foe ' : 'Wild ')) + P().displayName(defender);
    const selfName = (aside.isPlayer ? '' : (b.kind === 'trainer' ? 'Foe ' : 'Wild ')) + P().displayName(attacker);
    const roll = (c) => c == null ? true : chance(c);

    if (e.status && roll(e.chance)) {
      const tgt = (m.cat === 'status') ? defender : defender; // all our status moves target foe
      const tside = dside;
      setStatus(tgt, tside, e.status, ev, foeName);
    }
    const doStat = (spec, isSelf) => {
      const tgt = isSelf ? attacker : defender;
      const tside = isSelf ? aside : dside;
      const tname = isSelf ? selfName : foeName;
      const before = tside.stages[spec.stat];
      tside.stages[spec.stat] = Math.max(-6, Math.min(6, before + spec.stage));
      const delta = tside.stages[spec.stat] - before;
      if (delta === 0) { ev.push({ t: 'text', s: tname + '\'s ' + statLabel(spec.stat) + ' won\'t go ' + (spec.stage > 0 ? 'higher' : 'lower') + '!' }); return; }
      const word = spec.stage > 0 ? (spec.stage >= 2 ? 'sharply rose' : 'rose') : (spec.stage <= -2 ? 'harshly fell' : 'fell');
      ev.push({ t: 'stat', side: tside.isPlayer ? 'player' : 'foe', stat: spec.stat, delta });
      ev.push({ t: 'text', s: tname + '\'s ' + statLabel(spec.stat) + ' ' + word + '!' });
    };
    if (e.stat && roll(e.chance)) {
      const isSelf = e.target === 'self';
      doStat({ stat: e.stat, stage: e.stage }, isSelf);
      if (e.also) doStat({ stat: e.also.stat, stage: e.also.stage }, isSelf);
    }
    if (e.heal) {
      const before = attacker.hp;
      attacker.hp = Math.min(attacker.stats.maxHp, attacker.hp + Math.floor(attacker.stats.maxHp * e.heal));
      if (attacker.hp !== before) { ev.push({ t: 'text', s: selfName + ' regained health!' }); ev.push({ t: 'hp', side: aside.isPlayer ? 'player' : 'foe', hp: attacker.hp, max: attacker.stats.maxHp }); }
    }
    if (e.flinch && defender.hp > 0 && roll(e.flinch)) { dside.flinch = true; }
  }

  function statLabel(s) { return { atk: 'Attack', def: 'Defense', spa: 'Sp. Atk', spd: 'Sp. Def', spe: 'Speed', acc: 'accuracy', eva: 'evasiveness' }[s]; }

  function endOfTurn(b, side, ev) {
    const mon = active(side); if (mon.hp <= 0) return;
    const name = (side.isPlayer ? '' : (b.kind === 'trainer' ? 'Foe ' : 'Wild ')) + P().displayName(mon);
    if (mon.status === 'brn' || mon.status === 'psn') {
      const dmg = Math.max(1, Math.floor(mon.stats.maxHp / (mon.status === 'brn' ? 16 : 8)));
      mon.hp = Math.max(0, mon.hp - dmg);
      ev.push({ t: 'text', s: name + ' is hurt by its ' + (mon.status === 'brn' ? 'burn!' : 'poison!') });
      ev.push({ t: 'hp', side: side.isPlayer ? 'player' : 'foe', hp: mon.hp, max: mon.stats.maxHp, dmg });
    } else if (mon.status === 'tox') {
      const dmg = Math.max(1, Math.floor(mon.stats.maxHp * mon.statusCounter / 16));
      mon.statusCounter++;
      mon.hp = Math.max(0, mon.hp - dmg);
      ev.push({ t: 'text', s: name + ' is hurt by poison!' });
      ev.push({ t: 'hp', side: side.isPlayer ? 'player' : 'foe', hp: mon.hp, max: mon.stats.maxHp, dmg });
    }
    if (mon.hp <= 0) ev.push({ t: 'faint', side: side.isPlayer ? 'player' : 'foe', name: P().displayName(mon) });
  }

  // Award exp to the player's active mon when a foe faints.
  function awardExp(b, faintedFoe, ev) {
    const winner = active(b.player);
    if (winner.hp <= 0) return;
    const s = G.species(faintedFoe.species);
    const gain = Math.floor((s.exp * faintedFoe.level) / 5) * (b.kind === 'trainer' ? 1.5 : 1);
    ev.push({ t: 'text', s: P().displayName(winner) + ' gained ' + gain + ' EXP!' });
    const events = P().gainExp(winner, gain);
    events.forEach((e2) => {
      if (e2.type === 'level') ev.push({ t: 'text', s: P().displayName(winner) + ' grew to Lv. ' + e2.level + '!', level: true });
      else if (e2.type === 'learn') ev.push({ t: 'text', s: P().displayName(winner) + ' learned ' + G.move(e2.key).name + '!' });
      else if (e2.type === 'evolve') ev.push({ t: 'evolve', mon: winner, to: e2.to });
    });
  }

  // ---- Public turn resolution ----
  function playerMove(b, action, ev) {
    // returns true if the player's action consumes the turn (move) vs instant (switch/item handled outside)
    return action;
  }

  function doTurn(b, action) {
    const ev = [];
    b.turn++;
    const ply = b.player, foe = b.foe;
    ply.flinch = false; foe.flinch = false;

    // Non-attacking player actions resolve first, then foe attacks.
    let playerActed = false;
    if (action.type === 'switch') {
      const idx = action.index;
      if (idx !== ply.i && ply.party[idx] && ply.party[idx].hp > 0) {
        ev.push({ t: 'text', s: P().displayName(active(ply)) + ', come back!' });
        ply.i = idx; ply.stages = freshStages();
        ev.push({ t: 'switch', side: 'player', monIndex: idx });
        ev.push({ t: 'text', s: 'Go! ' + P().displayName(active(ply)) + '!' });
      }
      playerActed = true;
    } else if (action.type === 'item') {
      applyItem(b, action, ev);
      playerActed = true;
    } else if (action.type === 'ball') {
      const caught = tryCatch(b, action.item, ev);
      if (caught) { b.over = true; b.result = 'caught'; ev.push({ t: 'end', result: 'caught' }); return finalize(b, ev); }
      playerActed = true; // failed catch consumes turn
    } else if (action.type === 'run') {
      if (b.kind === 'trainer') { ev.push({ t: 'text', s: 'You can\'t run from a Trainer battle!' }); return { events: ev }; }
      b.runAttempts++;
      const pSpe = active(ply).stats.spe, fSpe = active(foe).stats.spe;
      const odds = pSpe > fSpe ? 100 : 50 + b.runAttempts * 15 + (pSpe - fSpe);
      if (chance(odds)) { ev.push({ t: 'text', s: 'Got away safely!' }); b.over = true; b.result = 'ran'; ev.push({ t: 'end', result: 'ran' }); return finalize(b, ev); }
      ev.push({ t: 'text', s: 'Can\'t escape!' });
      playerActed = true;
    }

    const foeAction = aiChoose(b);

    if (action.type === 'move' && !playerActed) {
      // Determine order by priority then speed.
      const pm = G.move(active(ply).moves[action.index].key);
      const fm = G.move(active(foe).moves[foeAction.index].key);
      const pPri = (pm.eff && pm.eff.priority) || 0;
      const fPri = (fm.eff && fm.eff.priority) || 0;
      let playerFirst;
      if (pPri !== fPri) playerFirst = pPri > fPri;
      else {
        const ps = effStat(active(ply), ply, 'spe'), fs = effStat(active(foe), foe, 'spe');
        playerFirst = ps === fs ? Math.random() < 0.5 : ps > fs;
      }
      const order = playerFirst
        ? [[ply, foe, action.index], [foe, ply, foeAction.index]]
        : [[foe, ply, foeAction.index], [ply, foe, action.index]];
      for (const [aside, dside, mi] of order) {
        if (b.over) break;
        if (active(aside).hp <= 0 || active(dside).hp <= 0) continue;
        pushMoveEvents(b, aside, dside, mi, ev);
        checkFaints(b, ev);
        if (b.over) break;
      }
    } else if (playerActed && !b.over) {
      // Foe still gets to attack after a switch/item/failed-catch/failed-run.
      if (active(foe).hp > 0 && active(ply).hp > 0) {
        pushMoveEvents(b, foe, ply, foeAction.index, ev);
        checkFaints(b, ev);
      }
    }

    if (b.over) return finalize(b, ev);

    // End-of-turn residual damage (player then foe).
    endOfTurn(b, ply, ev); checkFaints(b, ev);
    if (!b.over) { endOfTurn(b, foe, ev); checkFaints(b, ev); }

    if (b.over) return finalize(b, ev);
    return { events: ev, needsPlayerSwitch: active(ply).hp <= 0, needsFoeSwitch: active(foe).hp <= 0 };
  }

  function checkFaints(b, ev) {
    // Foe active fainted -> award exp, maybe next foe, else win.
    if (active(b.foe).hp <= 0) {
      const fainted = active(b.foe);
      awardExp(b, fainted, ev);
      const next = firstHealthy(b.foe);
      if (next >= 0 && next !== b.foe.i) {
        if (b.kind === 'trainer') {
          b.foe.i = next; b.foe.stages = freshStages();
          ev.push({ t: 'text', s: (b.foeName || 'Trainer') + ' sent out ' + P().displayName(active(b.foe)) + '!' });
          ev.push({ t: 'switch', side: 'foe', monIndex: next });
        }
      } else if (!anyHealthy(b.foe)) {
        b.over = true; b.result = 'win';
        if (b.kind === 'trainer') ev.push({ t: 'text', s: 'You defeated ' + (b.foeName || 'the Trainer') + '!' });
        ev.push({ t: 'end', result: 'win' });
      }
    }
    if (active(b.player).hp <= 0 && !anyHealthy(b.player)) {
      b.over = true; b.result = 'lose';
      ev.push({ t: 'text', s: 'You have no Pokémon left!' });
      ev.push({ t: 'end', result: 'lose' });
    }
  }

  function forceSwitch(b, side, index) {
    const s = side === 'player' ? b.player : b.foe;
    s.i = index; s.stages = freshStages();
    return active(s);
  }

  function applyItem(b, action, ev) {
    const it = G.ITEMS[action.item];
    const mon = b.player.party[action.targetIndex != null ? action.targetIndex : b.player.i];
    if (!it || !mon) return;
    if (it.kind === 'heal') {
      const before = mon.hp;
      mon.hp = Math.min(mon.stats.maxHp, mon.hp + it.amount);
      if (it.cure) { mon.status = null; mon.statusCounter = 0; }
      ev.push({ t: 'text', s: 'Used ' + it.name + ' on ' + P().displayName(mon) + '.' });
      ev.push({ t: 'hp', side: 'player', hp: mon.hp, max: mon.stats.maxHp });
    } else if (it.kind === 'revive') {
      mon.hp = Math.max(1, Math.floor(mon.stats.maxHp * it.amount)); mon.status = null;
      ev.push({ t: 'text', s: P().displayName(mon) + ' was revived!' });
      ev.push({ t: 'hp', side: 'player', hp: mon.hp, max: mon.stats.maxHp });
    } else if (it.kind === 'cure') {
      if (it.status.indexOf(mon.status) >= 0) { mon.status = null; mon.statusCounter = 0; ev.push({ t: 'text', s: P().displayName(mon) + ' was cured!' }); }
    }
  }

  function tryCatch(b, ballKey, ev) {
    const foe = active(b.foe);
    const ball = G.ITEMS[ballKey] || { bonus: 1, name: 'Poké Ball' };
    ev.push({ t: 'text', s: 'You threw a ' + ball.name + '!' });
    ev.push({ t: 'ballthrow' });
    const s = G.species(foe.species);
    const statusBonus = (foe.status === 'slp' || foe.status === 'frz') ? 2.5 : (foe.status ? 1.5 : 1);
    const a = ((3 * foe.stats.maxHp - 2 * foe.hp) * s.catchRate * ball.bonus * statusBonus) / (3 * foe.stats.maxHp);
    let shakes = 0;
    if (b.dreamForest) shakes = 4; // Entree Forest: never fails
    else if (a >= 255) shakes = 4;
    else {
      const bVal = 1048560 / Math.sqrt(Math.sqrt(16711680 / a));
      for (let i = 0; i < 4; i++) { if (rand(65536) < bVal) shakes++; else break; }
    }
    ev.push({ t: 'shakes', n: Math.min(shakes, 3) });
    if (shakes >= 4) { ev.push({ t: 'text', s: 'Gotcha! ' + foe.species + ' was caught!' }); b.caught = foe; return true; }
    ev.push({ t: 'text', s: ['Oh no! It broke free!', 'Aww! So close!', 'Argh! Almost had it!'][Math.min(shakes, 2)] });
    return false;
  }

  function finalize(b, ev) { return { events: ev, over: true, result: b.result }; }

  G.battle = { create, doTurn, forceSwitch, active, firstHealthy, anyHealthy, tryCatch, stageMul, damage, typeEff: G.typeEff };
})(typeof window !== 'undefined' ? window : globalThis);

// Shellfire Isles — battle engine. Pure logic, no DOM: runs in the browser for
// the adventure and in Node for server-refereed multiplayer battles.

import { SPECIES, MOVES, typeEff } from './data.js';

let uid = 1;

export function calcStats(base, level) {
  const [hp, atk, def, spa, spd, spe] = base;
  const s = v => Math.floor((2 * v * level) / 100) + 5;
  return {
    hp: Math.floor((2 * hp * level) / 100) + level + 10,
    atk: s(atk), def: s(def), spa: s(spa), spd: s(spd), spe: s(spe),
  };
}

export function movesAtLevel(speciesId, level) {
  const sp = SPECIES[speciesId];
  return sp.moves.filter(([lv]) => lv <= level).map(([, m]) => m).slice(-4);
}

export function makeMon(speciesId, level, moveIds = null, nick = null) {
  const sp = SPECIES[speciesId];
  const stats = calcStats(sp.base, level);
  const moves = (moveIds || movesAtLevel(speciesId, level))
    .map(id => ({ id, pp: MOVES[id].pp, maxPp: MOVES[id].pp }));
  return {
    uid: 'm' + (uid++), sp: speciesId, nick: nick || sp.n, level,
    xp: Math.pow(level, 3), stats, hp: stats.hp, moves, status: null, sleepTurns: 0,
  };
}

export function serializeMon(m) {
  return { sp: m.sp, nick: m.nick, level: m.level, moves: m.moves.map(x => x.id) };
}
export function reviveMonFrom(d) {
  const known = SPECIES[d.sp] ? d.sp : 'dewfin';
  const lv = Math.max(1, Math.min(100, d.level | 0 || 5));
  const ids = (d.moves || []).filter(id => MOVES[id]).slice(0, 4);
  const m = makeMon(known, lv, ids.length ? ids : null);
  if (typeof d.nick === 'string' && d.nick.trim()) m.nick = String(d.nick).slice(0, 14);
  return m;
}

export function xpForLevel(l) { return Math.pow(l, 3); }

const STAGE_MULT = st => (st >= 0 ? (2 + st) / 2 : 2 / (2 - st));
const ACC_MULT = st => (st >= 0 ? (3 + st) / 3 : 3 / (3 - st));

function freshStages() { return { atk:0, def:0, spa:0, spd:0, spe:0, acc:0 }; }

// A battle "side" is { team: [mon...], active: index, stages, name, flinch }.
export function makeSide(team, name) {
  return { team, active: firstHealthy(team), stages: freshStages(), name, flinch: false };
}
function firstHealthy(team) { const i = team.findIndex(m => m.hp > 0); return i < 0 ? 0 : i; }
export function activeMon(side) { return side.team[side.active]; }
export function sideHasHealthy(side) { return side.team.some(m => m.hp > 0); }

export function makeBattle(sideA, sideB, opts = {}) {
  return { a: sideA, b: sideB, turn: 0, over: false, winner: null, opts };
}

function effAtk(mon, side, cat, crit) {
  const raw = cat === 'P' ? mon.stats.atk : mon.stats.spa;
  let st = cat === 'P' ? side.stages.atk : side.stages.spa;
  if (crit && st < 0) st = 0;
  let v = raw * STAGE_MULT(st);
  if (mon.status === 'brn' && cat === 'P') v *= 0.5;
  return v;
}
function effDef(mon, side, cat, crit) {
  const raw = cat === 'P' ? mon.stats.def : mon.stats.spd;
  let st = cat === 'P' ? side.stages.def : side.stages.spd;
  if (crit && st > 0) st = 0;
  return raw * STAGE_MULT(st);
}
export function effSpe(mon, side) {
  let v = mon.stats.spe * STAGE_MULT(side.stages.spe);
  if (mon.status === 'par') v *= 0.25;
  return v;
}

const STAT_NAMES = { atk:'Attack', def:'Defense', spa:'Sp. Attack', spd:'Sp. Defense', spe:'Speed', acc:'accuracy' };
const STATUS_NAMES = { brn:'burned', par:'paralyzed', psn:'poisoned', slp:'asleep' };

function applyStages(ev, side, who, changes, rng) {
  for (const [stat, delta] of Object.entries(changes)) {
    const cur = side.stages[stat];
    const next = Math.max(-6, Math.min(6, cur + delta));
    if (next === cur) {
      ev.push({ t:'msg', text:`${who}'s ${STAT_NAMES[stat]} won't go any ${delta > 0 ? 'higher' : 'lower'}!` });
    } else {
      side.stages[stat] = next;
      const word = delta >= 2 ? 'rose sharply' : delta === 1 ? 'rose' : delta === -1 ? 'fell' : 'fell harshly';
      ev.push({ t:'stat', text:`${who}'s ${STAT_NAMES[stat]} ${word}!` });
    }
  }
}

function inflictStatus(ev, mon, who, status, rng) {
  if (mon.status || mon.hp <= 0) { ev.push({ t:'msg', text:'But it failed!' }); return; }
  mon.status = status;
  if (status === 'slp') mon.sleepTurns = 1 + Math.floor(rng() * 3);
  ev.push({ t:'status', mon: mon.uid, status, text:`${who} was ${STATUS_NAMES[status]}!` });
}

// Executes one mon's chosen move. Mutates state, appends events.
function doMove(battle, atkKey, moveSlot, rng, ev) {
  const atkSide = battle[atkKey], defSide = battle[atkKey === 'a' ? 'b' : 'a'];
  const user = activeMon(atkSide), target = activeMon(defSide);
  if (user.hp <= 0) return;

  if (atkSide.flinch) { atkSide.flinch = false; ev.push({ t:'msg', text:`${label(atkSide)} flinched!` }); return; }
  if (user.status === 'slp') {
    if (user.sleepTurns > 0) { user.sleepTurns--; ev.push({ t:'msg', text:`${label(atkSide)} is fast asleep.` }); return; }
    user.status = null; ev.push({ t:'status', mon:user.uid, status:null, text:`${label(atkSide)} woke up!` });
  }
  if (user.status === 'par' && rng() < 0.25) { ev.push({ t:'msg', text:`${label(atkSide)} is paralyzed! It can't move!` }); return; }

  const slot = user.moves[moveSlot];
  if (!slot || slot.pp <= 0) { ev.push({ t:'msg', text:`${label(atkSide)} has no moves left!` }); return; }
  slot.pp--;
  const mv = MOVES[slot.id];
  ev.push({ t:'move', side:atkKey, move:slot.id, text:`${label(atkSide)} used ${mv.n}!` });

  const accStages = atkSide.stages.acc - 0; // defender evasion not modeled
  const acc = mv.cat === 'T' ? (mv.fx?.fxAcc ?? 100) : mv.acc;
  if (acc && rng() * 100 >= acc * ACC_MULT(accStages)) {
    ev.push({ t:'miss', text:'The attack missed!' });
    return;
  }

  if (mv.cat === 'T') {
    const fx = mv.fx || {};
    if (fx.heal) {
      const amt = Math.min(user.stats.hp - user.hp, Math.floor(user.stats.hp * fx.heal));
      if (amt <= 0) ev.push({ t:'msg', text:'But it failed!' });
      else { user.hp += amt; ev.push({ t:'heal', side:atkKey, mon:user.uid, amt, hp:user.hp, text:`${label(atkSide)} regained health!` }); }
    }
    if (fx.self) applyStages(ev, atkSide, label(atkSide), fx.self, rng);
    if (fx.foe) applyStages(ev, defSide, label(defSide), fx.foe, rng);
    for (const st of ['brn','par','psn','slp']) if (fx[st]) inflictStatus(ev, target, label(defSide), st, rng);
    return;
  }

  // Damage
  const sp = SPECIES[user.sp];
  const critChance = mv.fx?.highCrit ? 1/8 : 1/16;
  const crit = rng() < critChance;
  const eff = typeEff(mv.t, SPECIES[target.sp].t);
  if (eff === 0) { ev.push({ t:'msg', text:`It doesn't affect ${label(defSide)}...` }); return; }
  const stab = sp.t.includes(mv.t) ? 1.5 : 1;
  const a = effAtk(user, atkSide, mv.cat, crit);
  const d = effDef(target, defSide, mv.cat, crit);
  let dmg = Math.floor(Math.floor(Math.floor(2 * user.level / 5 + 2) * mv.pow * a / d) / 50) + 2;
  dmg = Math.floor(dmg * stab * eff * (crit ? 1.5 : 1) * (0.85 + rng() * 0.15));
  dmg = Math.max(1, dmg);
  target.hp = Math.max(0, target.hp - dmg);
  ev.push({ t:'dmg', side:atkKey === 'a' ? 'b' : 'a', mon:target.uid, amt:dmg, hp:target.hp, crit, eff,
            text: crit ? 'A critical hit!' : null });
  if (eff > 1) ev.push({ t:'msg', text:"It's super effective!" });
  else if (eff < 1) ev.push({ t:'msg', text:"It's not very effective..." });

  if (target.hp > 0 && mv.fx) {
    const fx = mv.fx;
    if (fx.flinch && rng() * 100 < fx.flinch) defSide.flinch = true;
    for (const st of ['brn','par','psn','slp'])
      if (fx[st] && rng() * 100 < fx[st]) inflictStatus(ev, target, label(defSide), st, rng);
    if (fx.foe && rng() * 100 < (fx.chance ?? 100)) applyStages(ev, defSide, label(defSide), fx.foe, rng);
    if (fx.self && rng() * 100 < (fx.selfChance ?? 100)) applyStages(ev, atkSide, label(atkSide), fx.self, rng);
  }
  if (target.hp <= 0) ev.push({ t:'faint', side: atkKey === 'a' ? 'b' : 'a', mon:target.uid, text:`${label(defSide)} fainted!` });
}

function label(side) { return activeMon(side).nick; }

function endOfTurn(battle, ev, rng) {
  for (const key of ['a','b']) {
    const side = battle[key], mon = activeMon(side);
    side.flinch = false;
    if (mon.hp <= 0) continue;
    if (mon.status === 'brn' || mon.status === 'psn') {
      const amt = Math.max(1, Math.floor(mon.stats.hp / 8));
      mon.hp = Math.max(0, mon.hp - amt);
      ev.push({ t:'dmg', side:key, mon:mon.uid, amt, hp:mon.hp, eff:1,
                text:`${mon.nick} is hurt by its ${mon.status === 'brn' ? 'burn' : 'poison'}!` });
      if (mon.hp <= 0) ev.push({ t:'faint', side:key, mon:mon.uid, text:`${mon.nick} fainted!` });
    }
  }
}

function checkEnd(battle, ev) {
  const aAlive = sideHasHealthy(battle.a), bAlive = sideHasHealthy(battle.b);
  if (aAlive && bAlive) return false;
  battle.over = true;
  battle.winner = aAlive ? 'a' : bAlive ? 'b' : null;
  ev.push({ t:'end', winner: battle.winner });
  return true;
}

// actions: {type:'move', slot} | {type:'switch', to}
export function resolveTurn(battle, actA, actB, rng = Math.random) {
  const ev = [];
  battle.turn++;

  // Switches happen first (both, ordered by speed for flavor only).
  for (const [key, act] of [['a', actA], ['b', actB]]) {
    if (act.type === 'switch') doSwitch(battle, key, act.to, ev);
  }

  const order = [];
  if (actA.type === 'move') order.push(['a', actA]);
  if (actB.type === 'move') order.push(['b', actB]);
  order.sort(([ka, aa], [kb, ab]) => {
    const pa = MOVES[activeMon(battle[ka]).moves[aa.slot]?.id]?.pri || 0;
    const pb = MOVES[activeMon(battle[kb]).moves[ab.slot]?.id]?.pri || 0;
    if (pa !== pb) return pb - pa;
    const sa = effSpe(activeMon(battle.a), battle.a), sb = effSpe(activeMon(battle.b), battle.b);
    const da = ka === 'a' ? sa : sb, db = kb === 'a' ? sa : sb;
    if (da !== db) return db - da;
    return rng() < 0.5 ? -1 : 1;
  });

  for (const [key, act] of order) {
    if (battle.over) break;
    doMove(battle, key, act.slot, rng, ev);
    if (checkEnd(battle, ev)) return ev;
  }
  if (!battle.over) {
    endOfTurn(battle, ev, rng);
    checkEnd(battle, ev);
  }
  return ev;
}

export function doSwitch(battle, key, to, ev) {
  const side = battle[key];
  if (!side.team[to] || side.team[to].hp <= 0 || to === side.active) return;
  const oldName = activeMon(side).hp > 0 ? activeMon(side).nick : null;
  side.active = to;
  side.stages = freshStages();
  side.flinch = false;
  ev.push({ t:'switch', side:key, to, text:`${side.name} sent out ${activeMon(side).nick}!`, out:oldName });
}

// Simple AI: prefers the highest-expected-damage move, sometimes randomizes.
export function aiChoose(battle, key, rng = Math.random) {
  const side = battle[key], foe = battle[key === 'a' ? 'b' : 'a'];
  const mon = activeMon(side), target = activeMon(foe);
  const usable = mon.moves.map((m, i) => ({ m, i })).filter(x => x.m.pp > 0);
  if (!usable.length) return { type:'move', slot:0 };
  if (rng() < 0.15) return { type:'move', slot: usable[Math.floor(rng() * usable.length)].i };
  let best = usable[0], bestScore = -1;
  for (const x of usable) {
    const mv = MOVES[x.m.id];
    let score;
    if (mv.cat === 'T') score = battle.turn <= 1 ? 45 : 12;
    else score = mv.pow * typeEff(mv.t, SPECIES[target.sp].t) * (SPECIES[mon.sp].t.includes(mv.t) ? 1.5 : 1) * (mv.acc || 100) / 100;
    if (score > bestScore) { bestScore = score; best = x; }
  }
  return { type:'move', slot: best.i };
}

// Catching (adventure only).
export function tryCatch(mon, orbMult, rng = Math.random) {
  const sp = SPECIES[mon.sp];
  const statusBonus = mon.status === 'slp' ? 2 : mon.status ? 1.5 : 1;
  const a = ((3 * mon.stats.hp - 2 * mon.hp) * sp.catch * orbMult * statusBonus) / (3 * mon.stats.hp);
  const shakes = [];
  for (let i = 0; i < 3; i++) shakes.push(rng() * 255 < a);
  return { caught: shakes.every(Boolean), shakes: shakes.findIndex(s => !s) === -1 ? 3 : shakes.findIndex(s => !s) };
}

// XP + level-ups. Returns events; newMoves lists moves learned (auto-taught if a slot is free).
export function awardXp(mon, faintedSp, faintedLevel) {
  const gain = Math.max(1, Math.floor(SPECIES[faintedSp].xp * faintedLevel / 7));
  mon.xp += gain;
  const ev = [{ t:'xp', amt: gain, text:`${mon.nick} gained ${gain} EXP!` }];
  while (mon.level < 100 && mon.xp >= xpForLevel(mon.level + 1)) {
    mon.level++;
    const old = mon.stats;
    mon.stats = calcStats(SPECIES[mon.sp].base, mon.level);
    mon.hp = Math.min(mon.stats.hp, mon.hp + (mon.stats.hp - old.hp));
    ev.push({ t:'levelup', level: mon.level, text:`${mon.nick} grew to level ${mon.level}!` });
    for (const [lv, mid] of SPECIES[mon.sp].moves) {
      if (lv === mon.level && !mon.moves.some(s => s.id === mid)) {
        if (mon.moves.length < 4) {
          mon.moves.push({ id: mid, pp: MOVES[mid].pp, maxPp: MOVES[mid].pp });
          ev.push({ t:'learn', move: mid, text:`${mon.nick} learned ${MOVES[mid].n}!` });
        } else {
          ev.push({ t:'canlearn', move: mid, text:`${mon.nick} wants to learn ${MOVES[mid].n}.` });
        }
      }
    }
  }
  return ev;
}

export function healMon(m) {
  m.hp = m.stats.hp; m.status = null; m.sleepTurns = 0;
  for (const s of m.moves) s.pp = s.maxPp;
}

// Rental team for hub visitors who don't have an adventure save.
export function rentalTeam(rng = Math.random) {
  const pool = Object.keys(SPECIES);
  const picks = [];
  while (picks.length < 6) {
    const sp = pool[Math.floor(rng() * pool.length)];
    if (!picks.includes(sp)) picks.push(sp);
  }
  return picks.map(sp => makeMon(sp, 50));
}

// Normalize an imported team to level 50 for fair hub battles.
export function flat50(team) {
  return team.map(m => {
    const c = makeMon(m.sp, 50, m.moves.map(s => s.id));
    c.nick = m.nick;
    return c;
  });
}

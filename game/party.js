/* party.js — Pokémon instances, stats, XP/leveling, evolution, and the
 * player save-state (party, bag, badges, money, pokedex, boxes, flags). */
(function (root) {
  'use strict';
  const G = (root.G = root.G || {});
  const IV = 15; // flat IV for every stat (simple, consistent)

  let _uid = 1;
  function uid() { return 'm' + (_uid++) + '_' + Math.floor(Math.random() * 1e6).toString(36); }

  function expForLevel(l) { return l * l * l; } // medium-fast

  function statAt(base, level, isHP) {
    if (isHP) return Math.floor(((2 * base + IV) * level) / 100) + level + 10;
    return Math.floor(((2 * base + IV) * level) / 100) + 5;
  }

  function computeStats(speciesName, level) {
    const s = G.species(speciesName);
    const b = s.base;
    return {
      maxHp: statAt(b[0], level, true),
      atk: statAt(b[1], level),
      def: statAt(b[2], level),
      spa: statAt(b[3], level),
      spd: statAt(b[4], level),
      spe: statAt(b[5], level),
    };
  }

  function movesForLevel(speciesName, level) {
    const s = G.species(speciesName);
    const learned = s.ls.filter(([lv]) => lv <= level).map(([, m]) => m);
    // dedupe keep order, take last 4
    const seen = new Set(); const out = [];
    for (let i = learned.length - 1; i >= 0 && out.length < 4; i--) {
      if (!seen.has(learned[i])) { seen.add(learned[i]); out.unshift(learned[i]); }
    }
    return out.map((k) => ({ key: k, pp: G.move(k).pp, ppMax: G.move(k).pp }));
  }

  function makeMon(speciesName, level, opts) {
    opts = opts || {};
    const s = G.species(speciesName);
    if (!s) throw new Error('Unknown species ' + speciesName);
    const stats = computeStats(speciesName, level);
    const mon = {
      uid: uid(),
      species: speciesName,
      dex: s.dex,
      nickname: opts.nickname || '',
      level,
      exp: expForLevel(level),
      types: s.types.slice(),
      ability: s.ability,
      moves: opts.moves ? opts.moves.map((k) => ({ key: k, pp: G.move(k).pp, ppMax: G.move(k).pp })) : movesForLevel(speciesName, level),
      stats,
      hp: stats.maxHp,
      status: null,          // 'brn'|'par'|'psn'|'tox'|'slp'|'frz'
      statusCounter: 0,      // sleep turns / toxic counter
      shiny: opts.shiny || (Math.random() < 1 / 512),
      original: opts.original || null,
    };
    if (opts.moves) { mon.moves = opts.moves.map((k) => ({ key: k, pp: G.move(k).pp, ppMax: G.move(k).pp })); }
    return mon;
  }

  function displayName(mon) { return mon.nickname || mon.species; }
  function isFainted(mon) { return mon.hp <= 0; }

  function healMon(mon) {
    mon.hp = mon.stats.maxHp;
    mon.status = null; mon.statusCounter = 0;
    mon.moves.forEach((m) => { m.pp = m.ppMax; });
  }
  function healParty(party) { party.forEach(healMon); }

  // Recompute stats after a level change, preserving current HP ratio bonus.
  function recalc(mon) {
    const before = mon.stats.maxHp;
    mon.stats = computeStats(mon.species, mon.level);
    mon.hp += (mon.stats.maxHp - before); // level-up gives the HP delta
    if (mon.hp > mon.stats.maxHp) mon.hp = mon.stats.maxHp;
    if (mon.hp < 0) mon.hp = 0;
  }

  // Add experience; returns an array of event strings (level ups, moves, evo).
  function gainExp(mon, amount) {
    const events = [];
    mon.exp += amount;
    while (mon.level < 100 && mon.exp >= expForLevel(mon.level + 1)) {
      mon.level++;
      recalc(mon);
      events.push({ type: 'level', level: mon.level, mon });
      // learn moves at this level
      const s = G.species(mon.species);
      s.ls.filter(([lv]) => lv === mon.level).forEach(([, key]) => {
        if (mon.moves.find((m) => m.key === key)) return;
        if (mon.moves.length < 4) {
          mon.moves.push({ key, pp: G.move(key).pp, ppMax: G.move(key).pp });
          events.push({ type: 'learn', key, mon });
        } else {
          events.push({ type: 'learnFull', key, mon }); // UI offers to forget a move
        }
      });
      // evolution by level
      if (s.evo && mon.level >= s.evo.lvl) {
        events.push({ type: 'evolve', to: s.evo.to, mon });
      }
    }
    return events;
  }

  function evolve(mon, toName) {
    const ratio = mon.hp / mon.stats.maxHp;
    mon.species = toName;
    const ns = G.species(toName);
    mon.dex = ns.dex;
    mon.types = ns.types.slice();
    mon.ability = ns.ability;
    mon.stats = computeStats(toName, mon.level);
    mon.hp = Math.max(1, Math.round(mon.stats.maxHp * ratio));
    // learn any evolution/level moves it now qualifies for that it lacks
    ns.ls.filter(([lv]) => lv <= mon.level).forEach(([, key]) => {
      if (!mon.moves.find((m) => m.key === key) && mon.moves.length < 4) {
        mon.moves.push({ key, pp: G.move(key).pp, ppMax: G.move(key).pp });
      }
    });
  }

  // ---------------- Player state ----------------
  function newPlayer() {
    return {
      name: 'Hilbert',
      gender: 'boy',
      money: 3000,
      party: [],
      boxes: [[]],           // PC storage
      bag: { potion: 5, pokeball: 5 },
      badges: [],            // e.g. ['basic','toxic','insect','bolt']
      hms: [],               // ['cut','fly','surf','strength','waterfall']
      pokedex: {},           // speciesName -> 'seen'|'own'
      flags: {},             // arbitrary story/world flags
      visitedTowns: [],      // for Fly
      map: 'nuvema',
      x: 9, y: 11, dir: 'up',
      champion: false,
      playtime: 0,
    };
  }

  function seeDex(p, name) { if (p.pokedex[name] !== 'own') p.pokedex[name] = 'seen'; }
  function ownDex(p, name) { p.pokedex[name] = 'own'; }

  function addToParty(p, mon) {
    ownDex(p, mon.species);
    if (p.party.length < 6) { p.party.push(mon); return 'party'; }
    p.boxes[0].push(mon); return 'box';
  }

  function hasHM(p, hm) { return p.hms.indexOf(hm) >= 0; }

  G.party = {
    uid, expForLevel, computeStats, movesForLevel, makeMon, displayName, isFainted,
    healMon, healParty, recalc, gainExp, evolve, newPlayer, seeDex, ownDex,
    addToParty, hasHM, IV,
  };
})(typeof window !== 'undefined' ? window : globalThis);

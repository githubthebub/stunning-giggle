/* maps.js — the world: tile maps, warps, signs, NPCs, trainers, encounters.
 * All maps are 20 wide with a walkable corridor at x=9. Tile legend:
 *   . grass  , tallgrass(enc)  q desert-grass(enc)  c cave(enc)  d desert
 *   C cave  P path  f flowers  = bridge  W water(surf)  F waterfall
 *   # tree  T cut-tree  R rock  B boulder  H wall  r roof  g gymwall
 *   G gymfloor  n counter  M interior  D door(warp)  S sign  L ledge */
(function () {
  'use strict';
  const G = (window.G = window.G || {});

  const e = (species, min, max, weight) => ({ species, min, max, weight: weight || 10 });

  // Reusable rows (all exactly 20 chars, corridor char at index 9).
  const BORDER = '####################';
  const DOORR  = '#########D##########';
  const CORR_G = '#........P.........#';   // grass/route corridor
  const OPEN   = '#..................#';
  const WATER  = '#WWWWWWWWWWWWWWWWWW#';
  // Town building block: nurse/clerk (left, 'M'), gym (right, 'G').
  const TWN2 = '#..rrrr..P..gggg...#';
  const TWN3 = '#..HMMH..P..gGGg...#';
  const TWN4 = '#..HMMH..P..gGGg...#';
  const TWN5 = '#..HDHH..P..ggDg...#';

  const MAPS = {
    nuvema: {
      name: 'Nuvema Town', music: 'town',
      rows: [
        DOORR,
        CORR_G,
        '#..rrr...P...rrr...#',
        '#..rHr...P...rHr...#',
        '#..rDr...P...rDr...#',
        CORR_G, CORR_G,
        '#..ffff..P..ffff...#',
        CORR_G, CORR_G, CORR_G, CORR_G, CORR_G,
        BORDER,
      ],
      warps: [{ x: 9, y: 0, to: 'route1', tx: 9, ty: 14, tdir: 'up' }],
      signs: [{ x: 3, y: 10, text: 'NUVEMA TOWN\n"Where every dream begins."' }],
      npcs: [
        { id: 'prof', x: 4, y: 6, dir: 'down', body: '#5a8a4a', name: 'Prof. Juniper', type: 'starter' },
        { id: 'mom', x: 14, y: 6, dir: 'down', body: '#c96f9a', name: 'Mom', type: 'heal', lines: ['Off on your journey? Let me heal your team first!'] },
      ],
    },

    route1: {
      name: 'Route 1', music: 'route',
      encounters: { grass: [e('Patrat', 2, 4, 30), e('Lillipup', 2, 4, 30), e('Pidove', 3, 5, 25), e('Purrloin', 3, 5, 15)] },
      rows: [
        DOORR,
        '#,,,.....P.....,,,,#',
        '#,,,,....P....,,,,,#',
        '#,,,,,...P...,,,,,,#',
        '#...,....P...,,....#',
        '#........P.........#',
        '#....,...P...,,,,..#',
        '#........P...,,,,..#',
        '#,,,.....P........,#',
        '#,,,,....P.....,,,,#',
        '#,,,,,...P....,,,,,#',
        '#...,....P........,#',
        CORR_G, CORR_G, CORR_G,
        DOORR,
      ],
      warps: [
        { x: 9, y: 0, to: 'striaton', tx: 9, ty: 14, tdir: 'up' },
        { x: 9, y: 15, to: 'nuvema', tx: 9, ty: 1, tdir: 'down' },
      ],
      signs: [{ x: 3, y: 5, text: 'ROUTE 1\nTall grass rustles with wild Pokémon.' }],
      npcs: [
        { id: 'r1t1', x: 5, y: 12, dir: 'right', body: '#6a6ad0', name: 'Youngster Joey', type: 'trainer',
          team: [['Patrat', 4], ['Lillipup', 5]], money: 200, lines: ['My Patrat is in the top percentage!'] },
      ],
    },

    striaton: {
      name: 'Striaton City', music: 'town',
      rows: [
        DOORR, CORR_G, TWN2, TWN3, TWN4, TWN5, CORR_G, CORR_G,
        CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, DOORR,
      ],
      warps: [
        { x: 9, y: 15, to: 'route1', tx: 9, ty: 1, tdir: 'down' },
        { x: 9, y: 0, to: 'desert', tx: 9, ty: 12, tdir: 'up' },
      ],
      signs: [{ x: 5, y: 7, text: 'STRIATON CITY\nHome of the Striaton Gym.' }],
      npcs: [
        { id: 'nurse1', x: 4, y: 3, dir: 'down', body: '#e56a8a', name: 'Nurse', type: 'heal', lines: ['Welcome! Let me heal your Pokémon.'] },
        { id: 'clerk1', x: 5, y: 3, dir: 'down', body: '#5a8ac0', name: 'Clerk', type: 'shop', stock: ['potion', 'superpotion', 'pokeball', 'greatball', 'antidote', 'awakening'] },
        { id: 'leader1', x: 13, y: 3, dir: 'down', body: '#4aa85e', name: 'Cilan', type: 'leader',
          badge: 'trio', hm: 'cut', hmName: 'Cut', money: 1500,
          team: [['Patrat', 12], ['Lillipup', 13], ['Herdier', 15]],
          preLines: ['I\'m Cilan, a Striaton Gym Leader!', 'Show me the bond you share with your Pokémon!'],
          winLines: ['Bravo! Here is the Trio Badge.', 'And take HM01 — Cut! It fells the small trees blocking your path.'] },
        { id: 'towns1', x: 7, y: 9, dir: 'down', body: '#8a7a5a', name: 'Boy', type: 'talk', lines: ['A skinny tree blocks the desert to the north.', 'Only Cut can clear it — beat the Gym to learn it!'] },
      ],
    },

    desert: {
      name: 'Desert Resort', music: 'route',
      encounters: { grass: [e('Darumaka', 12, 16, 22), e('Sandile', 12, 16, 28), e('Scraggy', 13, 16, 20), e('Drilbur', 13, 16, 18), e('Darmanitan', 17, 19, 4)] },
      rows: [
        DOORR,
        '#ddddddddTddddddddd#',
        '#dqqqddddddddddqqqd#',
        '#dqqqddBddddddqqqqd#',
        '#dqqqddddddddddqqqd#',
        '#dddddddddddddddddd#',
        '#ddqqqqdddddddqqqdd#',
        '#ddqqqqddddBddqqqdd#',
        '#dddddddddddddddddd#',
        '#ddqqqdddddddddqqdd#',
        '#ddqqqdddddddddqqdd#',
        '#dddddddddddddddddd#',
        '#dddddddddddddddddd#',
        DOORR,
      ],
      warps: [
        { x: 9, y: 13, to: 'striaton', tx: 9, ty: 1, tdir: 'down' },
        { x: 9, y: 0, to: 'nacrene', tx: 9, ty: 12, tdir: 'up' },
      ],
      signs: [{ x: 16, y: 4, text: 'DESERT RESORT\nDarumaka doze in the dunes — they evolve into mighty Darmanitan!' }],
      npcs: [
        { id: 'd_t1', x: 6, y: 6, dir: 'down', body: '#c07a4a', name: 'Backpacker Rion', type: 'trainer',
          team: [['Sandile', 14], ['Scraggy', 14]], money: 400, lines: ['The desert toughens Trainer and Pokémon alike!'] },
        { id: 'd_item', x: 12, y: 2, dir: 'down', body: '#8a7a5a', name: 'Hiker', type: 'giver',
          give: { item: 'ultraball', n: 5 }, flag: 'desert_gift', lines: ['You cleared the Cut tree! Take these Ultra Balls — great for catching Darumaka.'] },
      ],
    },

    nacrene: {
      name: 'Nacrene City', music: 'town',
      rows: [
        DOORR, CORR_G, TWN2, TWN3, TWN4, TWN5, CORR_G,
        CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, DOORR,
      ],
      warps: [
        { x: 9, y: 13, to: 'desert', tx: 9, ty: 2, tdir: 'down' },
        { x: 9, y: 0, to: 'route3', tx: 9, ty: 14, tdir: 'up' },
      ],
      signs: [{ x: 5, y: 7, text: 'NACRENE CITY\nA city of art with a formidable Gym.' }],
      npcs: [
        { id: 'nurse2', x: 4, y: 3, dir: 'down', body: '#e56a8a', name: 'Nurse', type: 'heal', lines: ['Let me heal your team!'] },
        { id: 'clerk2', x: 5, y: 3, dir: 'down', body: '#5a8ac0', name: 'Clerk', type: 'shop', stock: ['potion', 'superpotion', 'hyperpotion', 'greatball', 'ultraball', 'revive', 'antidote', 'awakening'] },
        { id: 'leader2', x: 13, y: 3, dir: 'down', body: '#c99a4a', name: 'Lenora', type: 'leader',
          badge: 'basic', hm: 'strength', hmName: 'Strength', money: 3000,
          team: [['Watchog', 18], ['Herdier', 18], ['Stoutland', 20]],
          preLines: ['I\'m Lenora. Show me the results of your training!'],
          winLines: ['Wonderful! The Basic Badge is yours.', 'Take HM04 — Strength! Now you can roll away boulders.'] },
        { id: 'fly_giver', x: 7, y: 8, dir: 'down', body: '#8f6fd6', name: 'Pilot', type: 'giver',
          give: { hm: 'fly', hmName: 'Fly' }, flag: 'got_fly', require: 'badge:basic',
          lines: ['You bested Lenora? Then you\'re ready for the sky.', 'Take HM02 — Fly! Warp to any city you\'ve visited from the menu.'],
          denyLines: ['Beat the Nacrene Gym first, then we\'ll talk about flying.'] },
      ],
    },

    route3: {
      name: 'Route 3', music: 'route',
      encounters: { grass: [e('Blitzle', 16, 19, 26), e('Roggenrola', 16, 19, 26), e('Sewaddle', 16, 19, 24), e('Timburr', 17, 19, 24)] },
      rows: [
        DOORR,
        '#,,,,....P....,,,,,#',
        '#,,,,....P....,,,,,#',
        '#,,,,....P....,,,,,#',
        CORR_G,
        '#........B.........#',
        CORR_G,
        '#........B.........#',
        CORR_G,
        '#,,,,....P....,,,,,#',
        '#,,,,....P....,,,,,#',
        CORR_G, CORR_G, CORR_G, CORR_G,
        DOORR,
      ],
      warps: [
        { x: 9, y: 15, to: 'nacrene', tx: 9, ty: 1, tdir: 'down' },
        { x: 9, y: 0, to: 'castelia', tx: 9, ty: 14, tdir: 'up' },
      ],
      signs: [{ x: 3, y: 4, text: 'ROUTE 3\nBoulders block the way. Only Strength can move them.' }],
      npcs: [
        { id: 'r3t1', x: 13, y: 3, dir: 'down', body: '#6a6ad0', name: 'Hiker Bruno', type: 'trainer',
          team: [['Roggenrola', 17], ['Timburr', 18]], money: 500, lines: ['You rolled the boulders away? You\'re strong!'] },
      ],
    },

    castelia: {
      name: 'Castelia City', music: 'town',
      rows: [
        DOORR, CORR_G, TWN2, TWN3, TWN4, TWN5, CORR_G, CORR_G,
        CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, CORR_G, DOORR,
      ],
      warps: [
        { x: 9, y: 15, to: 'route3', tx: 9, ty: 1, tdir: 'down' },
        { x: 9, y: 0, to: 'route4', tx: 9, ty: 12, tdir: 'up' },
      ],
      signs: [{ x: 5, y: 7, text: 'CASTELIA CITY\nThe sea route north demands the power of Surf.' }],
      npcs: [
        { id: 'nurse3', x: 4, y: 3, dir: 'down', body: '#e56a8a', name: 'Nurse', type: 'heal', lines: ['Rest your team before you cross the sea!'] },
        { id: 'clerk3', x: 5, y: 3, dir: 'down', body: '#5a8ac0', name: 'Clerk', type: 'shop', stock: ['superpotion', 'hyperpotion', 'fullrestore', 'ultraball', 'revive', 'antidote', 'awakening'] },
        { id: 'leader3', x: 13, y: 3, dir: 'down', body: '#4a90c0', name: 'Marlon', type: 'leader',
          badge: 'wave', hm: 'surf', hmName: 'Surf', money: 4500,
          team: [['Palpitoad', 24], ['Swanna', 25], ['Seismitoad', 26]],
          preLines: ['Yo! I\'m Marlon, the sea\'s own Gym Leader!'],
          winLines: ['Haha, you\'re strong! Take the Wave Badge.', 'And HM03 — Surf! Ride across any water. Face the sea and press A.'] },
      ],
    },

    route4: {
      name: 'Route 4 (Sea)', music: 'route',
      encounters: { water: [e('Tympole', 22, 25, 40), e('Ducklett', 22, 25, 40), e('Palpitoad', 24, 26, 20)] },
      rows: [
        DOORR, WATER, WATER,
        '#WWWW###WWWWWWWWWWW#',
        '#WWWW#S#WWWWWWWWWWW#',
        '#WWWW###WWWWWWWWWWW#',
        WATER, WATER, WATER, WATER, WATER,
        '#WWWW.....WWWWWWWWW#',
        '#WWWW.....WWWWWWWWW#',
        DOORR,
      ],
      warps: [
        { x: 9, y: 13, to: 'castelia', tx: 9, ty: 1, tdir: 'down' },
        { x: 9, y: 0, to: 'opelucid', tx: 9, ty: 14, tdir: 'up' },
      ],
      signs: [{ x: 5, y: 4, text: 'ROUTE 4\nOpen sea. Surf onward — a great city lies to the north.' }],
      npcs: [],
    },

    opelucid: {
      name: 'Opelucid City', music: 'town',
      rows: [
        DOORR, WATER,
        '#WWWWWWWWWFWWWWWWWW#',
        WATER, WATER,
        CORR_G, TWN2, TWN3, TWN4, TWN5, CORR_G,
        CORR_G, CORR_G, CORR_G, CORR_G, DOORR,
      ],
      warps: [
        { x: 9, y: 15, to: 'route4', tx: 9, ty: 1, tdir: 'down' },
        { x: 9, y: 0, to: 'victory_road', tx: 9, ty: 14, tdir: 'up' },
      ],
      signs: [{ x: 5, y: 11, text: 'OPELUCID CITY\nSurf north and climb the Waterfall to reach Victory Road.' }],
      npcs: [
        { id: 'nurse4', x: 4, y: 7, dir: 'down', body: '#e56a8a', name: 'Nurse', type: 'heal', lines: ['The League is close. Let me heal your team.'] },
        { id: 'clerk4', x: 5, y: 7, dir: 'down', body: '#5a8ac0', name: 'Clerk', type: 'shop', stock: ['hyperpotion', 'fullrestore', 'ultraball', 'revive'] },
        { id: 'leader4', x: 13, y: 7, dir: 'down', body: '#8a5ac0', name: 'Drayden', type: 'leader',
          badge: 'legend', hm: 'waterfall', hmName: 'Waterfall', money: 6000,
          team: [['Krokorok', 28], ['Excadrill', 30], ['Darmanitan', 31]],
          preLines: ['I am Drayden. Only the resolute pass beyond this city.'],
          winLines: ['Superb! The Legend Badge is yours.', 'Take HM05 — Waterfall! Now, surf to the falls and climb.'] },
      ],
    },

    victory_road: {
      name: 'Victory Road', music: 'route',
      encounters: { grass: [e('Krokorok', 33, 37, 24), e('Gurdurr', 33, 37, 24), e('Boldore', 33, 37, 22), e('Zorua', 34, 37, 14), e('Darmanitan', 34, 38, 16)] },
      rows: [
        DOORR,
        '#CCCCCCCCCCCCCCCCCC#',
        '#CccCC...C....cccC.#',
        '#CccCC...C....cccC.#',
        '#CCCCC...C....CCCCC#',
        '#....C...C........C#',
        '#..RRC.WWWWW...RR..#',
        '#....C.WWWWW.......#',
        '#..RRC.WWWWW...RR..#',
        '#....C...C........C#',
        '#CccCC...C....cccC.#',
        '#CccCC...C....cccC.#',
        '#....C...C........C#',
        '#........P.........#',
        '#........P.........#',
        DOORR,
      ],
      warps: [
        { x: 9, y: 15, to: 'opelucid', tx: 9, ty: 6, tdir: 'down' },
        { x: 9, y: 0, to: 'league', tx: 9, ty: 14, tdir: 'up' },
      ],
      signs: [],
      npcs: [
        { id: 'vr_t1', x: 13, y: 2, dir: 'down', body: '#6a6ad0', name: 'Veteran Cathy', type: 'trainer',
          team: [['Boldore', 34], ['Krokorok', 35]], money: 1800, lines: ['You climbed the falls. The League is just beyond.'] },
      ],
    },

    league: {
      name: 'Pokémon League', music: 'town',
      rows: [
        BORDER,
        '#.......ggggg......#',
        '#.......gGGGg......#',
        '#.......gGGGg......#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        '#........G.........#',
        DOORR,
      ],
      warps: [
        { x: 9, y: 15, to: 'victory_road', tx: 9, ty: 14, tdir: 'up' },
      ],
      signs: [],
      npcs: [
        { id: 'e4_1', x: 9, y: 12, dir: 'down', body: '#5269ac', name: 'Elite Four Shauntal', type: 'e4', order: 1, block: true,
          money: 6000, team: [['Cofagrigus', 48], ['Lampent', 48], ['Chandelure', 50]],
          preLines: ['I am Shauntal of the Elite Four. My ghosts will haunt your dreams!'],
          winLines: ['Beautiful battling. The path is open — move on.'] },
        { id: 'e4_2', x: 9, y: 10, dir: 'down', body: '#5a5366', name: 'Elite Four Grimsley', type: 'e4', order: 2, block: true,
          money: 6000, team: [['Liepard', 48], ['Scrafty', 48], ['Krookodile', 49], ['Zoroark', 50]],
          preLines: ['Grimsley, of the dark. Show me a beautiful defeat — yours.'],
          winLines: ['A clean loss for me. Onward with you.'] },
        { id: 'e4_3', x: 9, y: 8, dir: 'down', body: '#f97176', name: 'Elite Four Caitlin', type: 'e4', order: 3, block: true,
          money: 6000, team: [['Musharna', 48], ['Sigilyph', 48], ['Gothitelle', 50], ['Reuniclus', 50]],
          preLines: ['Caitlin. My mind — and my Pokémon — are made up.'],
          winLines: ['Impressive focus. Continue.'] },
        { id: 'e4_4', x: 9, y: 6, dir: 'down', body: '#ce4069', name: 'Elite Four Marshal', type: 'e4', order: 4, block: true,
          money: 6000, team: [['Throh', 48], ['Sawk', 49], ['Mienshao', 50], ['Conkeldurr', 52]],
          preLines: ['Marshal! I will strike with everything I have!'],
          winLines: ['Raw strength wasn\'t enough. The Champion awaits above.'] },
        { id: 'champion', x: 9, y: 2, dir: 'down', body: '#e0a24a', name: 'Champion Alder', type: 'champion', order: 5, block: true,
          money: 12000, team: [['Bouffalant', 50], ['Krookodile', 52], ['Conkeldurr', 52], ['Chandelure', 53], ['Volcarona', 54], ['Zoroark', 54]],
          preLines: ['I\'m Alder, the Champion. Let me feel the bond you\'ve built!'],
          winLines: ['...Marvelous. You and your Pokémon are true partners.', 'You are the new Champion of Unova! Your dream has come true.'] },
      ],
    },
  };

  function build(id) {
    const m = MAPS[id];
    if (!m) return null;
    if (!m._built) {
      m.id = id;
      m.h = m.rows.length;
      m.w = Math.max.apply(null, m.rows.map((r) => r.length));
      m.grid = m.rows.map((r) => r.padEnd(m.w, '#').split(''));
      // Stamp sign tiles so they are interactable/solid.
      (m.signs || []).forEach((s) => { if (m.grid[s.y] && !G.tiles.get(m.grid[s.y][s.x]).terrain) m.grid[s.y][s.x] = 'S'; });
      m._built = true;
    }
    return m;
  }
  function tileAt(m, x, y) { return (x < 0 || y < 0 || y >= m.h || x >= m.w) ? G.tiles.get(' ') : G.tiles.get(m.grid[y][x]); }
  function charAt(m, x, y) { return (x < 0 || y < 0 || y >= m.h || x >= m.w) ? ' ' : m.grid[y][x]; }
  function setChar(m, x, y, ch) { if (y >= 0 && y < m.h && x >= 0 && x < m.w) m.grid[y][x] = ch; }

  function validate() {
    const errs = [];
    Object.keys(MAPS).forEach((id) => {
      const m = build(id);
      const lens = new Set(m.rows.map((r) => r.length));
      if (lens.size > 1) errs.push(id + ': rows differ in length ' + JSON.stringify([...lens]));
      (m.warps || []).concat(m.surfExits || []).forEach((w) => {
        if (!MAPS[w.to]) { errs.push(id + ': warp -> unknown map ' + w.to); return; }
        const t = build(w.to);
        if (w.tx < 0 || w.ty < 0 || w.tx >= t.w || w.ty >= t.h) { errs.push(id + '->' + w.to + ': target OOB ' + JSON.stringify([w.tx, w.ty])); return; }
        const tt = G.tiles.get(t.grid[w.ty][w.tx]);
        if (tt.solid && tt.terrain !== 'water') errs.push(id + '->' + w.to + ': lands on SOLID "' + t.grid[w.ty][w.tx] + '" at ' + JSON.stringify([w.tx, w.ty]));
      });
      (m.npcs || []).forEach((n) => {
        if (n.x < 0 || n.y < 0 || n.x >= m.w || n.y >= m.h) { errs.push(id + ': npc ' + n.id + ' OOB'); return; }
        const nt = G.tiles.get(m.grid[n.y][n.x]);
        if (nt.solid && nt.terrain !== 'water') errs.push(id + ': npc ' + n.id + ' on SOLID "' + m.grid[n.y][n.x] + '" at ' + JSON.stringify([n.x, n.y]));
      });
    });
    return errs;
  }

  G.maps = { MAPS, build, tileAt, charAt, setChar, validate };
})();

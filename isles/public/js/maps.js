// Shellfire Isles — world maps. ASCII grids with a legend, plus NPCs, warps,
// wild encounter tables, and ground items. All original layouts and writing.

// Legend:
//  G grass   T tall grass   P path    F flowers   W water   ~ waterfall
//  R tree    C cut tree     B strength boulder    K cracked rock
//  M mountain wall  c cave floor  m cave wall  S sand  L ledge(grass deco)
//  . interior floor  # interior wall  g gym wall  h house wall  r roof  b blue roof
//  D door(warp)  d mat/exit  s sign  H healer desk  U pc/storage  O shop counter  V statue
// Anything in WALK below is walkable.

export const WALK = new Set(['G','P','F','S','.','d','T','c','L','s_walk']);
export const SURFABLE = new Set(['W']);

const cinderport = {
  id: 'cinderport', name: 'Cinderport', kind: 'town', town: true,
  music: 'town',
  grid: [
    'MMMMMMMMMMMMMMMMMMMMMM',
    'MGGGGGRRGGGGGGRRGGGGGM',
    'MGrrrrGGGGGGGGGGbbbbGM',
    'MGrrrrGGFFGGFFGGbbbbGM',
    'MGhhhhGGGGGGGGGGhhhhGM',
    'MGhDhhGPPPPPPPPGhhDhGM',
    'MGGPGGGPGGGGGGPGGGPGGM',
    'MGGPPPPPGGsGGGPPPPPGGM',
    'MGGGGGGPGGGGGGPGGGGGGM',
    'MRGGFGGPPPPPPPPGGFGGRM',
    'MRGGGGGGGGPGGGGGGGGGRM',
    'MGgggggGGGPGGGGGGGGGGM',
    'MGgggggGGGPGGSSSSSSSSM',
    'MGggDggGGGPGGSSSSSSSSM',
    'MGGGPGGGGGPGGSWWWWWWWM',
    'MGGGPPPPPPPGGSWWWWWWWM',
    'MGGGGGGGGGPGGSWWWWWWWM',
    'MMMMMMMMMGPGMMMMMMMMMM',
  ],
  // grid exits: bottom path leads to Route 7
  edges: { bottom: { to:'route7', align: 10 } },
  warps: [
    { x:3,  y:5,  to:'resthouse_c', tx:4, ty:7 },   // west house = Rest House
    { x:18, y:5,  to:'hubhouse',    tx:4, ty:7 },   // east house = Island Link
    { x:4,  y:13, to:'gym7',        tx:5, ty:10 },  // Cinder Gym
  ],
  signs: [
    { x:10, y:7, text:'CINDERPORT — Gateway to the southern isles.\nGym 7: Leader PYRA, the Caldera Rose.' },
  ],
  npcs: [
    { x:8, y:10, dir:'down', pal:'sailor', name:'Sailor Bruna',
      lines:["Six badges already? The whole harbor's talking about you.", 'PYRA runs the gym by the docks. Fire types. Bring water... you have, haven\'t you?'] },
    { x:15, y:9, dir:'left', pal:'kid', name:'Deckhand Milo',
      lines:['The Island Link house up there lets you trade and battle with folks on OTHER islands.', 'Even friends far away — they just open the Link in a browser!'] },
  ],
  items: [],
  encounters: null,
};

const route7 = {
  id: 'route7', name: 'Route 7', kind: 'route',
  music: 'route',
  grid: [
    'MMMMMMMMMGPGMMMMMMMMMM',
    'MGGGGTTGGGPGGGTTTGGGGM',
    'MGGTTTTGGGPGGGTTTTGGGM',
    'MRGGTTGGGGPGGGGTTGGGRM',
    'MRGGGGGCGGPGGGGGGGGGRM',
    'MGGsGGGGGGPGGGCGGGGGGM',
    'MGGGGWWWWGPGGGGGGWWWWM',
    'MGGGWWWWWGPGGGGWWWWW~M',
    'MGGGWWSGWGPGGGWWGGWWWM',
    'MGGGWWGGWGPGGGWWGSWWWM',
    'MGGGGWWWWGPGGGGWWWWWWM',
    'MGGGGGGGGGPGGGGGGGGGGM',
    'MGTTTGGGGGPGGGGGTTTGGM',
    'MGTTTTGGGGPGGGGTTTTTGM',
    'MGGTTGGCGGPGGGGGTTGGGM',
    'MGGGGGGGGGPGGGGGGGGGGM',
    'MMMMMMMMMGPGMMMMMMMMMM',
  ],
  edges: { top: { to:'cinderport', align: 10 }, bottom: { to:'granitehollow', align: 10 } },
  warps: [],
  signs: [
    { x:3, y:5, text:'ROUTE 7 — North: Cinderport. South: Granite Hollow.\nThe falls to the east hide something, sailors say.' },
  ],
  // secret grove is up the waterfall (east pond) — handled as a warp on the fall tile
  waterfallWarp: { x:20, y:7, to:'secretgrove', tx:5, ty:8 },
  npcs: [
    { x:6, y:12, dir:'right', pal:'scout', name:'Scout Fern',
      trainer: { flag:'t_fern', team:[['sproutle',31],['puffowl',32]], reward:640,
        intro:'My scouts report a strong trainer coming... it\'s you!', win:'Reported: too strong.', after:'The falls east of here can be climbed with Waterfall!' },
      lines:[] },
    { x:16, y:3, dir:'down', pal:'kid', name:'Bug Kid Tomo',
      trainer: { flag:'t_tomo', team:[['gloomoth',32],['zaplet',31]], reward:620,
        intro:'My Gloomoth dims every lantern in Cinderport!', win:'Lights out for me...', after:'Granite Hollow to the south is PITCH BLACK. Bring Flash.' },
      lines:[] },
  ],
  items: [
    { x:6, y:8, item:'superpotion', qty:2, flag:'i_r7a' },   // on the sand islet — needs Surf
    { x:17, y:9, item:'ultraorb', qty:2, flag:'i_r7b' },     // east pond islet — needs Surf
  ],
  encounters: {
    grass: [['sproutle',[30,33]],['puffowl',[30,33]],['zaplet',[30,33]],['emberimp',[31,34]],['frostkit',[32,34],0.08]],
    water: [['dewfin',[30,34]]],
  },
};

const secretgrove = {
  id: 'secretgrove', name: 'Secret Grove', kind: 'route',
  music: 'grove',
  grid: [
    'MMMMMMMMMMMM',
    'MRRGGFFGGRRM',
    'MRGGTTTTGGRM',
    'MGGTTTTTTGGM',
    'MGFTTVTTTFGM',
    'MGGTTTTTTGGM',
    'MRGGTTTTGGRM',
    'MRRGGGGGGRRM',
    'MGGGGGsGGGGM',
    'MMMMM~MMMMMM',
  ],
  edges: {},
  warps: [],
  fallExit: { x:5, y:9, to:'route7', tx:20, ty:8 },
  signs: [{ x:6, y:8, text:'SECRET GROVE — Only the falls know the way.' }],
  npcs: [],
  items: [{ x:5, y:4, item:'hyperpotion', qty:3, flag:'i_sg1' }],
  encounters: { grass: [['mindmite',[36,39]],['bramblade',[36,38]],['terradon',[38,40],0.1]] },
};

const granitehollow = {
  id: 'granitehollow', name: 'Granite Hollow', kind: 'cave', dark: true,
  music: 'cave',
  grid: [
    'mmmmmmmmmmcpcmmmmmmmmm',
    'mccccmmmmmcccmmmcccccm',
    'mcKccmmmmccccmmmccKccm',
    'mccccmmccccmccmmcccccm',
    'mccccBcccmmmccBccccccm',
    'mmmccmmccmmmmccmmccmmm',
    'mmcccmmmccmcccmmmcccmm',
    'mcccmmmmmccccmmmmmcccm',
    'mccmmcccccmmccccccmccm',
    'mccKcccmmmmmmmcccKcccm',
    'mccccmmmcccccmmmcccccm',
    'mmccccccccBccccccccmmm',
    'mmmcccccccccccccccmmmm',
    'mmmmmmmmmmcpcmmmmmmmmm',
  ],
  edges: { top: { to:'route7', align: 10 }, bottom: { to:'verdantia', align: 10 } },
  warps: [],
  signs: [],
  npcs: [
    { x:6, y:8, dir:'right', pal:'hiker', name:'Hiker Odo',
      trainer: { flag:'t_odo', team:[['gravelim',33],['gravelim',34],['boulderox',35]], reward:1050,
        intro:'Even in the dark I heard you coming!', win:'Solid as rock you are.', after:'Push the big boulders with Strength — they hide shortcuts.' },
      lines:[] },
  ],
  items: [
    { x:2, y:1, item:'revive', qty:2, flag:'i_gh1' },    // beside a cracked rock
    { x:18, y:1, item:'hyperpotion', qty:2, flag:'i_gh2' },
  ],
  encounters: { grass: null, cave: [['gravelim',[33,36]],['gloomoth',[33,36]],['mindmite',[34,37]],['boulderox',[35,37],0.08]] },
};

const verdantia = {
  id: 'verdantia', name: 'Verdantia', kind: 'town', town: true,
  music: 'town',
  grid: [
    'MMMMMMMMMMcPcMMMMMMMMM',
    'MGGGGGGGGGGPGGGGGGGGGM',
    'MGrrrrGGGGGPGGGGFFGGGM',
    'MGrrrrGGFGGPGGGGGGGGGM',
    'MGhhhhGGGGGPGGgggggGGM',
    'MGhDhhGGGGGPGGgggggGGM',
    'MGGPGGGGGGGPGGggDggGGM',
    'MGGPPPPPPPPPGGGGPGGGGM',
    'MGGGGGGGGGGPPPPPPGGGGM',
    'MGGFFGGsGGGPGGGGGGGGGM',
    'MRGGGGGGGGGPGGGGRRGGRM',
    'MRGGGGGGGGGPGGGGRRGGRM',
    'MMMMMMMMMMMPMMMMMMMMMM',
    'MMMMMMMMMMMPMMMMMMMMMM',
  ],
  edges: { top: { to:'granitehollow', align: 11 }, bottom: { to:'victoryroad', align: 11 } },
  warps: [
    { x:3,  y:5, to:'resthouse_v', tx:4, ty:7 },
    { x:16, y:6, to:'gym8',        tx:5, ty:10 },
  ],
  signs: [{ x:7, y:9, text:'VERDANTIA — The garden above the Hollow.\nGym 8: Leader TERRA, the Unshakable.\nSouth: Victory Gate (8 badges required).' }],
  npcs: [
    { x:6, y:3, dir:'down', pal:'elder', name:'Elder Rue',
      lines:['TERRA has never been moved. Not by flood, not by storm.', 'Ground types shrug off lightning. Water and grass, though...'] },
  ],
  items: [],
  encounters: null,
};

const victoryroad = {
  id: 'victoryroad', name: 'Victory Gate', kind: 'route',
  music: 'victory',
  grid: [
    'MMMMMMMMMMMPMMMM',
    'MGGGGGGGGGGPGGGM',
    'MGggggggGGGPGGGM',
    'MGggggggGBGPGGGM',
    'MGggDgggGGGPGGGM',
    'MGGGPGGGGGGPGGGM',
    'MGGGPPPPPPPPGGGM',
    'MGGGGGGGGGGGGGGM',
    'MGGsGGGGGGGGGGGM',
    'MMMMMMMMMMMPMMMM',
  ],
  edges: { top: { to:'verdantia', align: 11 }, bottom: null },
  gate: { badgeCount: 8, x:11, msg:'The gatekeeper stops you.\n"Champions only past this point — all EIGHT badges, please."' },
  gatekeeper: { x:11, y:7 },
  warps: [{ x:4, y:4, to:'champhall', tx:5, ty:10 }],
  signs: [{ x:3, y:8, text:'VICTORY GATE — Beyond waits the Champion of the Isles.' }],
  npcs: [],
  items: [],
  encounters: null,
};

// ---------- interiors ----------
function interior(rows) { return rows; }

const resthouse = (id, backTo, bx, by) => ({
  id, name: 'Rest House', kind: 'interior',
  music: 'house',
  grid: interior([
    '#########',
    '#.H...U.#',
    '#.......#',
    '#..O....#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#...d...#',
    '#########',
  ]),
  edges: {},
  warps: [{ x:4, y:7, to:backTo, tx:bx, ty:by, isExit:true }],
  signs: [],
  npcs: [
    { x:2, y:1, dir:'down', pal:'nurse', name:'Keeper Lily', healer: true, noBlock:true,
      lines:['Welcome to the Rest House! Your team is fighting fit now. Come back any time!'] },
    { x:3, y:3, dir:'down', pal:'sailor', name:'Clerk Bo', shop: ['potion','superpotion','hyperpotion','cureall','revive','orb','greatorb','ultraorb'], noBlock:true,
      lines:[] },
  ],
  storage: { x:6, y:1 },
  items: [], encounters: null,
});

const hubhouse = {
  id:'hubhouse', name:'Island Link', kind:'interior',
  music: 'house',
  grid: interior([
    '#########',
    '#.U...U.#',
    '#.......#',
    '#...V...#',
    '#.......#',
    '#.......#',
    '#.......#',
    '#...d...#',
    '#########',
  ]),
  edges: {},
  warps: [{ x:4, y:7, to:'cinderport', tx:18, ty:6, isExit:true }],
  signs: [],
  npcs: [
    { x:4, y:2, dir:'down', pal:'elder', name:'Link Warden', noBlock:true,
      hubTerminal: true,
      lines:[] },
  ],
  items: [], encounters: null,
};

const gym7 = {
  id:'gym7', name:'Cinder Gym', kind:'interior', gym:7,
  music: 'gym',
  grid: interior([
    'ggggggggggg',
    'g....V....g',
    'g.........g',
    'g..g...g..g',
    'g.........g',
    'g..g...g..g',
    'g.........g',
    'g..g...g..g',
    'g.........g',
    'g.........g',
    'g....d....g',
    'ggggggggggg',
  ]),
  edges: {},
  warps: [{ x:5, y:10, to:'cinderport', tx:4, ty:14, isExit:true }],
  signs: [],
  npcs: [
    { x:2, y:8, dir:'right', pal:'kid', name:'Kindler Ash',
      trainer: { flag:'t_ash', team:[['emberimp',36],['emberimp',36]], reward:720,
        intro:'Only embers ahead — hope you packed water!', win:'Doused!', after:'PYRA\'s Pyroclast is part ROCK. Think about it.' }, lines:[] },
    { x:8, y:5, dir:'left', pal:'scout', name:'Flame Dancer Io',
      trainer: { flag:'t_io', team:[['cinderfang',37]], reward:740,
        intro:'Dance with my Cinderfang!', win:'The dance is done.', after:'The Leader waits by the brazier.' }, lines:[] },
    { x:5, y:2, dir:'down', pal:'pyra', name:'Leader Pyra', gymLeader: 7,
      trainer: { flag:'t_pyra', team:[['emberimp',38],['cinderfang',39],['pyroclast',41]], reward:4100, badge:6,
        intro:'I am PYRA, the Caldera Rose. My flames have never met a tide they couldn\'t boil. Show me yours!',
        win:'...The tide wins. Take the CINDER BADGE — badge seven is yours.',
        after:'Head south through Granite Hollow. TERRA awaits — and beyond her, the Champion.' },
      lines:[] },
  ],
  items: [], encounters: null,
};

const gym8 = {
  id:'gym8', name:'Terra Gym', kind:'interior', gym:8,
  music: 'gym',
  grid: interior([
    'ggggggggggg',
    'g....V....g',
    'g.........g',
    'g.B.....B.g',
    'g.........g',
    'g....g....g',
    'g.B.....B.g',
    'g.........g',
    'g.........g',
    'g.........g',
    'g....d....g',
    'ggggggggggg',
  ]),
  edges: {},
  warps: [{ x:5, y:10, to:'verdantia', tx:16, ty:7, isExit:true }],
  signs: [],
  npcs: [
    { x:2, y:7, dir:'right', pal:'hiker', name:'Ridge Runner Kai',
      trainer: { flag:'t_kai', team:[['gravelim',39],['terradon',40]], reward:800,
        intro:'The ground itself fights for us!', win:'Ground... shaken.', after:'TERRA\'s Terradon flies. Electric won\'t save you there... or will it?' }, lines:[] },
    { x:5, y:2, dir:'down', pal:'terra', name:'Leader Terra', gymLeader: 8,
      trainer: { flag:'t_terra', team:[['gravelim',41],['boulderox',42],['terradon',44]], reward:4800, badge:7,
        intro:'I am TERRA. Storms pass. Tides retreat. The earth remains. Let us see what remains of YOU.',
        win:'The earth... moves. The TERRA BADGE is yours — all eight. The Victory Gate is open to you.',
        after:'South of town stands the Victory Gate. The Champion of the Isles waits beyond.' },
      lines:[] },
  ],
  items: [], encounters: null,
};

const champhall = {
  id:'champhall', name:'Hall of the Champion', kind:'interior',
  music: 'champion',
  grid: interior([
    'ggggggggggg',
    'g.V.....V.g',
    'g.........g',
    'g.........g',
    'g....?....g',
    'g.........g',
    'g.........g',
    'g.........g',
    'g.........g',
    'g.........g',
    'g....d....g',
    'ggggggggggg',
  ]).map(r => r.replace('?', '.')),
  edges: {},
  warps: [{ x:5, y:10, to:'victoryroad', tx:4, ty:5, isExit:true }],
  signs: [],
  npcs: [
    { x:5, y:4, dir:'down', pal:'champ', name:'Champion Avery', champion: true,
      trainer: { flag:'t_avery', team:[['galehawk',46],['pyroclast',46],['bramblade',47],['terradon',47],['torrentoise',49]], reward:9900,
        intro:'So you\'re the one who walked through fire and stone to get here. I\'m AVERY — Champion of the Shellfire Isles. Every wave, every ember, every gust in this hall answers to me. Let\'s make this one for the histories!',
        win:'...Magnificent. The Isles have a new Champion. YOU.',
        after:'Champion! The Island Link is buzzing about you. Go battle the world — you\'ve earned it.' },
      lines:[] },
  ],
  items: [], encounters: null,
};

export const MAPS = {
  cinderport, route7, secretgrove, granitehollow, verdantia, victoryroad,
  resthouse_c: resthouse('resthouse_c', 'cinderport', 3, 6),
  resthouse_v: resthouse('resthouse_v', 'verdantia', 3, 6),
  hubhouse, gym7, gym8, champhall,
};

export const FLY_TOWNS = ['cinderport', 'verdantia'];
export const START = { map:'cinderport', x:10, y:8, dir:'down' };

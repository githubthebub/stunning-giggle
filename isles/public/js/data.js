// Shellfire Isles — original game data (creatures, moves, types, trainers).
// Everything here is original work: no third-party characters, names, or assets.

export const TYPES = ['Normal','Fire','Water','Grass','Electric','Ice','Ground','Flying','Psychic','Bug','Rock','Dark'];

// EFF[attacker][defender] — omitted pairs are 1x.
export const EFF = {
  Normal:   { Rock:.5 },
  Fire:     { Fire:.5, Water:.5, Grass:2, Ice:2, Bug:2, Rock:.5 },
  Water:    { Fire:2, Water:.5, Grass:.5, Ground:2, Rock:2 },
  Grass:    { Fire:.5, Water:2, Grass:.5, Ground:2, Rock:2, Flying:.5, Bug:.5 },
  Electric: { Water:2, Electric:.5, Grass:.5, Ground:0, Flying:2 },
  Ice:      { Fire:.5, Water:.5, Grass:2, Ice:.5, Ground:2, Flying:2 },
  Ground:   { Fire:2, Electric:2, Grass:.5, Flying:0, Bug:.5, Rock:2 },
  Flying:   { Electric:.5, Grass:2, Bug:2, Rock:.5 },
  Psychic:  { Psychic:.5, Dark:0 },
  Bug:      { Fire:.5, Grass:2, Psychic:2, Dark:2, Flying:.5 },
  Rock:     { Fire:2, Ice:2, Flying:2, Bug:2, Ground:.5 },
  Dark:     { Psychic:2, Dark:.5 },
};

export function typeEff(atk, defTypes) {
  let m = 1;
  for (const d of defTypes) {
    const row = EFF[atk];
    if (row && row[d] !== undefined) m *= row[d];
  }
  return m;
}

// cat: 'P' physical, 'S' special, 'T' status.
// fx: { brn/par/psn/slp: %chance, flinch: %, heal: fraction, highCrit: true,
//       self: {stat:stages}, foe: {stat:stages}, fxAcc: acc for pure-status moves }
// field: overworld ability granted by knowing this move.
export const MOVES = {
  tackle:     { n:'Tackle',       t:'Normal',   cat:'P', pow:40,  acc:100, pp:35 },
  quickstrike:{ n:'Quick Strike', t:'Normal',   cat:'P', pow:40,  acc:100, pp:30, pri:1 },
  bodyslam:   { n:'Body Slam',    t:'Normal',   cat:'P', pow:85,  acc:100, pp:15, fx:{ par:30 } },
  shellbash:  { n:'Shell Bash',   t:'Normal',   cat:'P', pow:70,  acc:100, pp:20, fx:{ self:{ def:1 }, selfChance:100 } },
  hypervoice: { n:'Hyper Voice',  t:'Normal',   cat:'S', pow:90,  acc:100, pp:10 },
  growl:      { n:'Growl',        t:'Normal',   cat:'T', pp:40, fx:{ foe:{ atk:-1 } } },
  harden:     { n:'Harden',       t:'Normal',   cat:'T', pp:30, fx:{ self:{ def:1 } } },
  quicken:    { n:'Quicken',      t:'Normal',   cat:'T', pp:30, fx:{ self:{ spe:2 } } },
  strength:   { n:'Strength',     t:'Normal',   cat:'P', pow:80,  acc:100, pp:15, field:'strength' },
  cut:        { n:'Cut',          t:'Normal',   cat:'P', pow:50,  acc:95,  pp:30, field:'cut' },

  ember:      { n:'Ember',        t:'Fire',     cat:'S', pow:40,  acc:100, pp:25, fx:{ brn:10 } },
  flamelash:  { n:'Flame Lash',   t:'Fire',     cat:'P', pow:75,  acc:100, pp:15, fx:{ brn:10 } },
  infernoburst:{n:'Inferno Burst',t:'Fire',     cat:'S', pow:110, acc:85,  pp:5,  fx:{ brn:10 } },
  cinderveil: { n:'Cinder Veil',  t:'Fire',     cat:'T', pp:15, fx:{ brn:100, fxAcc:85 } },

  splashshot: { n:'Splash Shot',  t:'Water',    cat:'S', pow:40,  acc:100, pp:25 },
  jetstream:  { n:'Jet Stream',   t:'Water',    cat:'P', pow:40,  acc:100, pp:20, pri:1 },
  surf:       { n:'Surf',         t:'Water',    cat:'S', pow:90,  acc:100, pp:15, field:'surf' },
  waterfall:  { n:'Waterfall',    t:'Water',    cat:'P', pow:80,  acc:100, pp:15, fx:{ flinch:20 }, field:'waterfall' },
  geyser:     { n:'Geyser',       t:'Water',    cat:'S', pow:110, acc:80,  pp:5 },
  bubbleshield:{n:'Bubble Shield',t:'Water',    cat:'T', pp:20, fx:{ self:{ def:1, spd:1 } } },

  vinelash:   { n:'Vine Lash',    t:'Grass',    cat:'P', pow:45,  acc:100, pp:25 },
  leafedge:   { n:'Leaf Edge',    t:'Grass',    cat:'P', pow:90,  acc:100, pp:15, fx:{ highCrit:true } },
  sporecloud: { n:'Spore Cloud',  t:'Grass',    cat:'T', pp:15, fx:{ slp:100, fxAcc:75 } },
  photomend:  { n:'Photo Mend',   t:'Grass',    cat:'T', pp:5,  fx:{ heal:.5 } },

  spark:      { n:'Spark',        t:'Electric', cat:'P', pow:65,  acc:100, pp:20, fx:{ par:30 } },
  staticburst:{ n:'Static Burst', t:'Electric', cat:'S', pow:80,  acc:100, pp:15, fx:{ par:10 } },
  stormbolt:  { n:'Storm Bolt',   t:'Electric', cat:'S', pow:110, acc:70,  pp:5,  fx:{ par:30 } },
  flash:      { n:'Flash',        t:'Electric', cat:'T', pp:20, fx:{ foe:{ acc:-1 } }, field:'flash' },

  frostshard: { n:'Frost Shard',  t:'Ice',      cat:'P', pow:40,  acc:100, pp:25, pri:1 },
  frostbeam:  { n:'Frost Beam',   t:'Ice',      cat:'S', pow:90,  acc:100, pp:10, fx:{ foe:{ spe:-1 }, chance:10 } },
  hailrazor:  { n:'Hail Razor',   t:'Ice',      cat:'P', pow:70,  acc:95,  pp:15 },

  mudshot:    { n:'Mud Shot',     t:'Ground',   cat:'S', pow:55,  acc:95,  pp:15, fx:{ foe:{ spe:-1 }, chance:100 } },
  quake:      { n:'Quake',        t:'Ground',   cat:'P', pow:100, acc:100, pp:10 },
  sandveil:   { n:'Sand Veil',    t:'Ground',   cat:'T', pp:15, fx:{ foe:{ acc:-1 } } },

  windslash:  { n:'Wind Slash',   t:'Flying',   cat:'P', pow:60,  acc:100, pp:25 },
  skydive:    { n:'Sky Dive',     t:'Flying',   cat:'P', pow:100, acc:90,  pp:10 },
  fly:        { n:'Fly',          t:'Flying',   cat:'P', pow:85,  acc:95,  pp:15, field:'fly' },
  preen:      { n:'Preen',        t:'Flying',   cat:'T', pp:5,  fx:{ heal:.5 } },

  mindray:    { n:'Mind Ray',     t:'Psychic',  cat:'S', pow:65,  acc:100, pp:20 },
  mindcrush:  { n:'Mind Crush',   t:'Psychic',  cat:'S', pow:90,  acc:100, pp:10, fx:{ foe:{ spd:-1 }, chance:10 } },
  dreamhaze:  { n:'Dream Haze',   t:'Psychic',  cat:'T', pp:15, fx:{ slp:100, fxAcc:65 } },

  swarmdrone: { n:'Swarm Drone',  t:'Bug',      cat:'S', pow:80,  acc:100, pp:10 },
  venomcoat:  { n:'Venom Coat',   t:'Bug',      cat:'T', pp:15, fx:{ psn:100, fxAcc:90 } },
  pinprick:   { n:'Pin Prick',    t:'Bug',      cat:'P', pow:50,  acc:100, pp:25 },

  stonetoss:  { n:'Stone Toss',   t:'Rock',     cat:'P', pow:50,  acc:90,  pp:25 },
  rockslide:  { n:'Rockslide',    t:'Rock',     cat:'P', pow:75,  acc:90,  pp:10, fx:{ flinch:30 } },
  rocksmash:  { n:'Rock Smash',   t:'Rock',     cat:'P', pow:55,  acc:100, pp:15, fx:{ foe:{ def:-1 }, chance:50 }, field:'rocksmash' },

  bite:       { n:'Bite',         t:'Dark',     cat:'P', pow:60,  acc:100, pp:25, fx:{ flinch:20 } },
  duskslash:  { n:'Dusk Slash',   t:'Dark',     cat:'P', pow:70,  acc:100, pp:15, fx:{ highCrit:true } },
};

// base: [hp, atk, def, spa, spd, spe]
// moves: [level, moveId] — a fresh creature knows the last 4 at/below its level.
// look: parameters for the procedural pixel-art painter in art.js.
export const SPECIES = {
  torrentoise: {
    n:'Torrentoise', t:['Water'], base:[82,85,105,88,102,55], catch:45, xp:240,
    dex:'The geyser vent on its back can blast a jet of water strong enough to punch through stone.',
    moves:[[1,'tackle'],[1,'splashshot'],[8,'harden'],[14,'jetstream'],[20,'bite'],[26,'shellbash'],[30,'surf'],[34,'waterfall'],[38,'bubbleshield'],[44,'geyser']],
    look:{ shape:'bulky', c1:'#3f74c9', c2:'#274a86', belly:'#e8d9a8', features:['shell','spout'] },
  },
  galehawk: {
    n:'Galehawk', t:['Flying','Normal'], base:[70,85,62,60,62,112], catch:90, xp:170,
    dex:'It rides thermal currents between the isles for days without landing.',
    moves:[[1,'tackle'],[1,'windslash'],[9,'quickstrike'],[16,'growl'],[24,'fly'],[32,'preen'],[40,'skydive']],
    look:{ shape:'slim', c1:'#b98a4e', c2:'#7d5a2e', belly:'#efe6cf', features:['wings','crest'] },
  },
  bramblade: {
    n:'Bramblade', t:['Grass'], base:[72,105,75,60,72,95], catch:90, xp:180,
    dex:'The leaf blades on its forearms are honed on granite until they gleam.',
    moves:[[1,'tackle'],[1,'vinelash'],[10,'cut'],[18,'sporecloud'],[26,'quicken'],[34,'leafedge'],[42,'photomend']],
    look:{ shape:'slim', c1:'#5aa845', c2:'#33702a', belly:'#cde6a8', features:['blade','sprout'] },
  },
  boulderox: {
    n:'Boulderox', t:['Rock','Ground'], base:[95,112,122,45,62,35], catch:70, xp:210,
    dex:'It shoulders landslides aside to clear paths for its herd.',
    moves:[[1,'tackle'],[1,'stonetoss'],[10,'harden'],[16,'rocksmash'],[24,'strength'],[32,'rockslide'],[40,'quake']],
    look:{ shape:'bulky', c1:'#9b8f7d', c2:'#635a4c', belly:'#c9bda6', features:['rockplates','horns'] },
  },
  voltlynx: {
    n:'Voltlynx', t:['Electric'], base:[65,72,60,108,75,116], catch:90, xp:185,
    dex:'Its whiskers store static; a flick of its head lights up a whole cavern.',
    moves:[[1,'tackle'],[1,'spark'],[9,'flash'],[15,'quicken'],[23,'staticburst'],[31,'bite'],[41,'stormbolt']],
    look:{ shape:'slim', c1:'#e8c33c', c2:'#a8821e', belly:'#f7ecc0', features:['ears','bolt','whiskers'] },
  },
  cinderfang: {
    n:'Cinderfang', t:['Fire','Dark'], base:[75,112,70,85,65,100], catch:70, xp:200,
    dex:'It hunts at dusk; the embers along its spine flare when it lunges.',
    moves:[[1,'tackle'],[1,'ember'],[10,'bite'],[17,'growl'],[25,'flamelash'],[33,'duskslash'],[43,'infernoburst']],
    look:{ shape:'slim', c1:'#c9502e', c2:'#7d2a16', belly:'#e8b46a', features:['fangs','tailflame','mask'] },
  },
  puffowl: {
    n:'Puffowl', t:['Flying'], base:[62,55,55,68,70,88], catch:190, xp:90,
    dex:'A round night-flyer whose feathers muffle every wingbeat.',
    moves:[[1,'tackle'],[1,'windslash'],[12,'growl'],[20,'quickstrike'],[30,'skydive']],
    look:{ shape:'round', c1:'#8d7a9e', c2:'#5a4a6b', belly:'#d9cfe0', features:['wings','ears'] },
  },
  emberimp: {
    n:'Emberimp', t:['Fire'], base:[58,72,50,80,55,90], catch:160, xp:110,
    dex:'A mischievous spark-sprite that naps inside warm chimneys.',
    moves:[[1,'ember'],[1,'quickstrike'],[14,'growl'],[22,'flamelash'],[34,'infernoburst']],
    look:{ shape:'round', c1:'#d96a35', c2:'#8d3a1a', belly:'#f0c070', features:['horns','tailflame'] },
  },
  dewfin: {
    n:'Dewfin', t:['Water'], base:[60,58,60,75,68,85], catch:180, xp:100,
    dex:'Schools of Dewfin leap the harbor swells at dawn.',
    moves:[[1,'splashshot'],[1,'tackle'],[13,'jetstream'],[21,'bubbleshield'],[31,'surf']],
    look:{ shape:'round', c1:'#4aa0d9', c2:'#2a6b9e', belly:'#cfe8f5', features:['fins'] },
  },
  sproutle: {
    n:'Sproutle', t:['Grass'], base:[62,62,66,60,66,70], catch:180, xp:95,
    dex:'The sprout on its head tilts to face the sun all day long.',
    moves:[[1,'tackle'],[1,'vinelash'],[12,'growl'],[20,'sporecloud'],[30,'leafedge']],
    look:{ shape:'round', c1:'#6bb85a', c2:'#3e7d33', belly:'#d9edb0', features:['sprout'] },
  },
  zaplet: {
    n:'Zaplet', t:['Electric'], base:[55,50,45,80,55,95], catch:180, xp:95,
    dex:'It clings to ship masts in storms, sipping stray lightning.',
    moves:[[1,'spark'],[1,'tackle'],[12,'flash'],[22,'staticburst'],[34,'stormbolt']],
    look:{ shape:'round', c1:'#e8d34a', c2:'#a8921e', belly:'#f7f0b8', features:['bolt','crest'] },
  },
  gravelim: {
    n:'Gravelim', t:['Rock'], base:[70,85,100,40,50,40], catch:150, xp:120,
    dex:'It naps as an ordinary boulder until someone treads on it.',
    moves:[[1,'tackle'],[1,'stonetoss'],[12,'harden'],[20,'rocksmash'],[30,'rockslide'],[38,'quake']],
    look:{ shape:'round', c1:'#8d8578', c2:'#57503f', belly:'#b0a894', features:['rockplates'] },
  },
  gloomoth: {
    n:'Gloomoth', t:['Bug','Dark'], base:[65,60,55,85,70,90], catch:140, xp:130,
    dex:'Its wing-dust dims lanterns so it can feed in the dark.',
    moves:[[1,'pinprick'],[1,'growl'],[14,'venomcoat'],[22,'swarmdrone'],[32,'duskslash']],
    look:{ shape:'round', c1:'#6b5a8d', c2:'#3e3357', belly:'#b0a0c9', features:['mothwings','ears'] },
  },
  frostkit: {
    n:'Frostkit', t:['Ice'], base:[60,65,55,85,70,95], catch:120, xp:140,
    dex:'Rare on the warm isles — it rides drift-ice down from the north.',
    moves:[[1,'frostshard'],[1,'tackle'],[14,'growl'],[22,'hailrazor'],[34,'frostbeam']],
    look:{ shape:'slim', c1:'#a8d9e8', c2:'#5a94b0', belly:'#f0f8fc', features:['ears','tail'] },
  },
  mindmite: {
    n:'Mindmite', t:['Psychic','Bug'], base:[60,45,50,95,80,85], catch:120, xp:145,
    dex:'It reads intentions a heartbeat early, which makes it maddening to swat.',
    moves:[[1,'pinprick'],[1,'mindray'],[16,'dreamhaze'],[24,'swarmdrone'],[36,'mindcrush']],
    look:{ shape:'round', c1:'#c96ba8', c2:'#8d3e70', belly:'#e8c0d9', features:['crest','whiskers'] },
  },
  terradon: {
    n:'Terradon', t:['Ground','Flying'], base:[85,100,80,60,70,95], catch:45, xp:220,
    dex:'A cliff-gliding hunter that surfs rockslides on outstretched wings.',
    moves:[[1,'tackle'],[1,'mudshot'],[15,'windslash'],[24,'rockslide'],[33,'fly'],[42,'quake']],
    look:{ shape:'slim', c1:'#b0885a', c2:'#6b4e2a', belly:'#e0cba0', features:['wings','horns','tail'] },
  },
  pyroclast: {
    n:'Pyroclast', t:['Fire','Rock'], base:[85,95,105,90,70,50], catch:45, xp:230,
    dex:'Slag drips from its back plates; it sleeps in live calderas.',
    moves:[[1,'ember'],[1,'stonetoss'],[16,'harden'],[24,'flamelash'],[33,'rockslide'],[42,'infernoburst']],
    look:{ shape:'bulky', c1:'#a84a2e', c2:'#57231a', belly:'#e8863c', features:['rockplates','tailflame'] },
  },
};

export const ITEMS = {
  potion:      { n:'Potion',       kind:'heal',  amt:20,  price:200,  desc:'Restores 20 HP.' },
  superpotion: { n:'Super Potion', kind:'heal',  amt:60,  price:700,  desc:'Restores 60 HP.' },
  hyperpotion: { n:'Hyper Potion', kind:'heal',  amt:120, price:1500, desc:'Restores 120 HP.' },
  cureall:     { n:'Cure-All',     kind:'status',          price:400,  desc:'Cures any status problem.' },
  revive:      { n:'Revive',       kind:'revive', amt:.5,  price:1500, desc:'Revives a fainted creature to half HP.' },
  orb:         { n:'Capture Orb',  kind:'orb',   mult:1,   price:200,  desc:'A device for catching wild creatures.' },
  greatorb:    { n:'Great Orb',    kind:'orb',   mult:1.5, price:600,  desc:'A high-grade Capture Orb.' },
  ultraorb:    { n:'Ultra Orb',    kind:'orb',   mult:2,   price:1200, desc:'A top-grade Capture Orb.' },
};

export const BADGES = [
  { n:'Tide Badge',   c:'#4aa0d9' }, { n:'Bloom Badge', c:'#6bb85a' },
  { n:'Static Badge', c:'#e8c33c' }, { n:'Gale Badge',  c:'#b0a8d9' },
  { n:'Dream Badge',  c:'#c96ba8' }, { n:'Dusk Badge',  c:'#6b5a8d' },
  { n:'Cinder Badge', c:'#d96a35' }, { n:'Terra Badge', c:'#b0885a' },
];

// The player begins with these six — every field move covered.
export const STARTING_PARTY = [
  { sp:'torrentoise', lv:38 },  // Surf, Waterfall
  { sp:'galehawk',    lv:36 },  // Fly
  { sp:'bramblade',   lv:36 },  // Cut
  { sp:'boulderox',   lv:36 },  // Strength, Rock Smash
  { sp:'voltlynx',    lv:36 },  // Flash
  { sp:'cinderfang',  lv:36 },
];

export const FIELD_MOVE_INFO = {
  cut:       'Chop down small trees that block the path.',
  fly:       'Fly instantly to any town you have visited.',
  surf:      'Ride across open water.',
  strength:  'Shove huge boulders aside.',
  flash:     'Light up pitch-black caves.',
  rocksmash: 'Shatter cracked rocks.',
  waterfall: 'Climb waterfalls while surfing.',
};

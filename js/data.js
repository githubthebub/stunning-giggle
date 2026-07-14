/* data.js — static game data for Pokémon Dream World.
 * Species use their National Dex id so we can pull official artwork,
 * with a procedural fallback sprite if the network is unavailable. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});

  // Type -> accent colour (used for fallback sprites, chips, and theming).
  const TYPES = {
    normal:  '#9fa19f', fire:    '#ff7a52', water:   '#4d90d5',
    grass:   '#63bb5b', electric:'#f4d23c', ice:     '#74cec0',
    fighting:'#ce4069', poison:  '#ab6ac8', ground:  '#d97845',
    flying:  '#8fa9de', psychic: '#f97176', bug:     '#90c12c',
    rock:    '#c7b78b', ghost:   '#5269ac', dark:    '#5a5366',
    dragon:  '#0a6dc4', steel:   '#5a8ea1', fairy:   '#ec8fe6',
  };

  // Dream World areas — the "Island of Dreams". Each spawns themed Pokémon.
  const AREAS = [
    { id: 'forest',   name: 'Pleasant Forest', emoji: '🌳', blurb: 'A hushed wood where dreaming Pokémon nap in the ferns.',  sky: ['#bfe9b0', '#7fc98f'] },
    { id: 'sky',      name: 'Windswept Sky',   emoji: '🌤️', blurb: 'Islands drift on the breeze high above the clouds.',        sky: ['#bfe0ff', '#8fbdf0'] },
    { id: 'sea',      name: 'Sparkling Sea',   emoji: '🌊', blurb: 'Warm shallows shimmer with sleepy water Pokémon.',          sky: ['#a9e4ef', '#66c3d9'] },
    { id: 'mountain', name: 'Rugged Mountain', emoji: '⛰️', blurb: 'Craggy slopes hide tough Pokémon dozing in caves.',         sky: ['#e6cfa8', '#c99f6d'] },
    { id: 'manor',    name: 'Spooky Manor',    emoji: '👻', blurb: 'A moonlit house where shadowy Pokémon come out to play.',    sky: ['#b6a8d6', '#6a5f97'] },
    { id: 'meadow',   name: 'Pretty Meadow',   emoji: '🌸', blurb: 'A sweet field of flowers full of gentle friends.',          sky: ['#ffd6e8', '#f7a8cf'] },
  ];

  // Rarity weights used when spawning wild dream Pokémon.
  const RARITY = { common: 60, uncommon: 28, rare: 12 };

  // Species roster. ability = the Dream World "Hidden Ability".
  // r = rarity. Every area has commons through rares for variety.
  const S = (id, name, types, ability, area, r) => ({ id, name, types, ability, area, rarity: r || 'common' });
  const SPECIES = [
    // Pleasant Forest
    S(1,   'Bulbasaur', ['grass', 'poison'], 'Chlorophyll',  'forest', 'uncommon'),
    S(10,  'Caterpie',  ['bug'],             'Run Away',      'forest', 'common'),
    S(16,  'Pidgey',    ['normal', 'flying'],'Big Pecks',     'forest', 'common'),
    S(43,  'Oddish',    ['grass', 'poison'], 'Run Away',      'forest', 'common'),
    S(548, 'Petilil',   ['grass'],           'Chlorophyll',   'forest', 'uncommon'),
    S(540, 'Sewaddle',  ['bug', 'grass'],    'Overcoat',      'forest', 'common'),
    S(511, 'Pansage',   ['grass'],           'Overgrow',      'forest', 'uncommon'),
    S(546, 'Cottonee',  ['grass', 'fairy'],  'Chlorophyll',   'forest', 'common'),
    S(420, 'Cherubi',   ['grass'],           'Chlorophyll',   'forest', 'rare'),

    // Windswept Sky
    S(519, 'Pidove',    ['normal', 'flying'],'Rivalry',       'sky', 'common'),
    S(333, 'Swablu',    ['normal', 'flying'],'Cloud Nine',    'sky', 'uncommon'),
    S(396, 'Starly',    ['normal', 'flying'],'Reckless',      'sky', 'common'),
    S(163, 'Hoothoot',  ['normal', 'flying'],'Tinted Lens',   'sky', 'common'),
    S(175, 'Togepi',    ['fairy'],           'Super Luck',    'sky', 'rare'),
    S(627, 'Rufflet',   ['normal', 'flying'],'Hustle',        'sky', 'uncommon'),
    S(21,  'Spearow',   ['normal', 'flying'],'Sniper',        'sky', 'common'),

    // Sparkling Sea
    S(54,  'Psyduck',   ['water'],           'Swift Swim',    'sea', 'common'),
    S(183, 'Marill',    ['water', 'fairy'],  'Sap Sipper',    'sea', 'common'),
    S(194, 'Wooper',    ['water', 'ground'], 'Unaware',       'sea', 'common'),
    S(418, 'Buizel',    ['water'],           'Water Veil',    'sea', 'uncommon'),
    S(515, 'Panpour',   ['water'],           'Torrent',       'sea', 'uncommon'),
    S(535, 'Tympole',   ['water'],           'Water Absorb',  'sea', 'common'),
    S(60,  'Poliwag',   ['water'],           'Swift Swim',    'sea', 'common'),
    S(147, 'Dratini',   ['dragon'],          'Marvel Scale',  'sea', 'rare'),

    // Rugged Mountain
    S(74,  'Geodude',   ['rock', 'ground'],  'Sand Veil',     'mountain', 'common'),
    S(66,  'Machop',    ['fighting'],        'Steadfast',     'mountain', 'common'),
    S(231, 'Phanpy',    ['ground'],          'Sand Veil',     'mountain', 'common'),
    S(104, 'Cubone',    ['ground'],          'Battle Armor',  'mountain', 'uncommon'),
    S(529, 'Drilbur',   ['ground'],          'Mold Breaker',  'mountain', 'uncommon'),
    S(532, 'Timburr',   ['fighting'],        'Iron Fist',     'mountain', 'common'),
    S(447, 'Riolu',     ['fighting'],        'Prankster',     'mountain', 'rare'),
    S(443, 'Gible',     ['dragon', 'ground'],'Rough Skin',    'mountain', 'rare'),

    // Spooky Manor
    S(92,  'Gastly',    ['ghost', 'poison'], 'Levitate',      'manor', 'common'),
    S(355, 'Duskull',   ['ghost'],           'Frisk',         'manor', 'common'),
    S(200, 'Misdreavus',['ghost'],           'Levitate',      'manor', 'uncommon'),
    S(607, 'Litwick',   ['ghost', 'fire'],   'Infiltrator',   'manor', 'uncommon'),
    S(509, 'Purrloin',  ['dark'],            'Prankster',     'manor', 'common'),
    S(198, 'Murkrow',   ['dark', 'flying'],  'Prankster',     'manor', 'common'),
    S(228, 'Houndour',  ['dark', 'fire'],    'Unnerve',       'manor', 'uncommon'),
    S(577, 'Solosis',   ['psychic'],         'Regenerator',   'manor', 'rare'),

    // Pretty Meadow
    S(172, 'Pichu',     ['electric'],        'Lightning Rod', 'meadow', 'common'),
    S(173, 'Cleffa',    ['fairy'],           'Friend Guard',  'meadow', 'common'),
    S(174, 'Igglybuff', ['normal', 'fairy'], 'Friend Guard',  'meadow', 'common'),
    S(300, 'Skitty',    ['normal'],          'Wonder Skin',   'meadow', 'common'),
    S(179, 'Mareep',    ['electric'],        'Plus',          'meadow', 'uncommon'),
    S(572, 'Minccino',  ['normal'],          'Skill Link',    'meadow', 'uncommon'),
    S(517, 'Munna',     ['psychic'],         'Telepathy',     'meadow', 'common'),
    S(133, 'Eevee',     ['normal'],          'Anticipation',  'meadow', 'rare'),
    S(440, 'Happiny',   ['normal'],          'Friend Guard',  'meadow', 'rare'),
  ];

  // Starter partners — the Pokémon you first send to sleep (BW starters).
  const STARTERS = [
    S(495, 'Snivy',    ['grass'], 'Contrary',  'meadow'),
    S(498, 'Tepig',    ['fire'],  'Thick Fat', 'meadow'),
    S(501, 'Oshawott', ['water'], 'Shell Armor','sea'),
  ];

  // Berries you can grow in the Dream Garden.
  const BERRIES = {
    oran:   { name: 'Oran Berry',   emoji: '🔵', growMs: 20 * 1000,  yield: [1, 3], points: 6,  color: '#5aa9e0' },
    cheri:  { name: 'Cheri Berry',  emoji: '🍒', growMs: 30 * 1000,  yield: [1, 3], points: 8,  color: '#e2506a' },
    pecha:  { name: 'Pecha Berry',  emoji: '🍑', growMs: 45 * 1000,  yield: [1, 4], points: 10, color: '#f39ab8' },
    rawst:  { name: 'Rawst Berry',  emoji: '🫐', growMs: 45 * 1000,  yield: [1, 4], points: 10, color: '#6fa8d6' },
    sitrus: { name: 'Sitrus Berry', emoji: '🟡', growMs: 60 * 1000,  yield: [2, 4], points: 14, color: '#e6c34a' },
    leppa:  { name: 'Leppa Berry',  emoji: '🍎', growMs: 90 * 1000,  yield: [2, 5], points: 20, color: '#d24d4d' },
  };

  // House furniture you can buy with Dream Points and place in your room.
  const FURNITURE = [
    { id: 'bed',     name: 'Cozy Bed',      emoji: '🛏️', cost: 30 },
    { id: 'rug',     name: 'Soft Rug',      emoji: '🟪', cost: 15 },
    { id: 'lamp',    name: 'Dream Lamp',    emoji: '💡', cost: 20 },
    { id: 'plant',   name: 'Potted Plant',  emoji: '🪴', cost: 18 },
    { id: 'plush',   name: 'Pokémon Plush', emoji: '🧸', cost: 25 },
    { id: 'tv',      name: 'Television',    emoji: '📺', cost: 40 },
    { id: 'table',   name: 'Round Table',   emoji: '🪑', cost: 22 },
    { id: 'clock',   name: 'Wall Clock',    emoji: '🕰️', cost: 16 },
    { id: 'balloon', name: 'Party Balloon', emoji: '🎈', cost: 12 },
    { id: 'cake',    name: 'Sweet Cake',    emoji: '🍰', cost: 28 },
    { id: 'star',    name: 'Star Light',    emoji: '⭐', cost: 35 },
    { id: 'poster',  name: 'Poster',        emoji: '🖼️', cost: 14 },
  ];

  // Trainer avatars to pick from.
  const AVATARS = ['🧑‍🎤', '👩‍🚀', '🧙', '🧑‍🌾', '🦸', '🧑‍🎨', '👦', '👧', '🧑', '🐱'];

  // Fast lookup by id.
  const BY_ID = {};
  [...SPECIES, ...STARTERS].forEach((s) => { BY_ID[s.id] = s; });

  DW.data = {
    TYPES, AREAS, RARITY, SPECIES, STARTERS, BERRIES, FURNITURE, AVATARS,
    speciesById: (id) => BY_ID[id] || null,
    typeColor: (t) => TYPES[t] || '#9fa19f',
    areaById: (id) => AREAS.find((a) => a.id === id) || null,
  };
})();

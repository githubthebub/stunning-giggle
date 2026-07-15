/* data.js — core game data: types, moves, species, items, trainers.
 * Pure data + lookups. Safe to load in Node (attaches to globalThis.G). */
(function (root) {
  'use strict';
  const G = (root.G = root.G || {});

  // ---------------- Types ----------------
  const TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel'];
  const TYPE_COLOR = {
    normal:'#9fa19f', fire:'#ff7a52', water:'#4d90d5', electric:'#f4d23c', grass:'#63bb5b',
    ice:'#74cec0', fighting:'#ce4069', poison:'#ab6ac8', ground:'#d97845', flying:'#8fa9de',
    psychic:'#f97176', bug:'#90c12c', rock:'#c7b78b', ghost:'#5269ac', dragon:'#0a6dc4',
    dark:'#5a5366', steel:'#5a8ea1',
  };
  // Effectiveness chart: CHART[attacker][defender] = multiplier (default 1).
  const X = {}; TYPES.forEach(t => X[t] = {});
  const set = (a, map) => Object.assign(X[a], map);
  set('normal',   { rock:.5, ghost:0, steel:.5 });
  set('fire',     { fire:.5, water:.5, grass:2, ice:2, bug:2, rock:.5, dragon:.5, steel:2 });
  set('water',    { fire:2, water:.5, grass:.5, ground:2, rock:2, dragon:.5 });
  set('electric', { water:2, electric:.5, grass:.5, ground:0, flying:2, dragon:.5 });
  set('grass',    { fire:.5, water:2, grass:.5, poison:.5, ground:2, flying:.5, bug:.5, rock:2, dragon:.5, steel:.5 });
  set('ice',      { fire:.5, water:.5, grass:2, ice:.5, ground:2, flying:2, dragon:2, steel:.5 });
  set('fighting', { normal:2, ice:2, poison:.5, flying:.5, psychic:.5, bug:.5, rock:2, ghost:0, dark:2, steel:2 });
  set('poison',   { grass:2, poison:.5, ground:.5, rock:.5, ghost:.5, steel:0 });
  set('ground',   { fire:2, electric:2, grass:.5, poison:2, flying:0, bug:.5, rock:2, steel:2 });
  set('flying',   { electric:.5, grass:2, fighting:2, bug:2, rock:.5, steel:.5 });
  set('psychic',  { fighting:2, poison:2, psychic:.5, dark:0, steel:.5 });
  set('bug',      { fire:.5, grass:2, fighting:.5, poison:.5, flying:.5, psychic:2, ghost:.5, dark:2, steel:.5 });
  set('rock',     { fire:2, ice:2, fighting:.5, ground:.5, flying:2, bug:2, steel:.5 });
  set('ghost',    { normal:0, psychic:2, ghost:2, dark:.5 });
  set('dragon',   { dragon:2, steel:.5 });
  set('dark',     { fighting:.5, psychic:2, ghost:2, dark:.5 });
  set('steel',    { fire:.5, water:.5, electric:.5, ice:2, rock:2, steel:.5 });

  function typeEff(atkType, defTypes) {
    let m = 1;
    (Array.isArray(defTypes) ? defTypes : [defTypes]).forEach(d => {
      const v = X[atkType] && X[atkType][d];
      m *= (v === undefined ? 1 : v);
    });
    return m;
  }

  // ---------------- Moves ----------------
  // cat: phys|spec|status. eff: optional {status,chance,stat,stage,target,recoil,drain,flinch,heal,highCrit,multi,priority}
  const mv = (name, type, cat, power, acc, pp, eff) => ({ name, type, cat, power, acc, pp: pp, eff: eff || null });
  const MOVES = {
    tackle:      mv('Tackle','normal','phys',40,100,35),
    scratch:     mv('Scratch','normal','phys',40,100,35),
    pound:       mv('Pound','normal','phys',40,100,35),
    quickattack: mv('Quick Attack','normal','phys',40,100,30,{priority:1}),
    headbutt:    mv('Headbutt','normal','phys',70,100,15,{flinch:30}),
    bodyslam:    mv('Body Slam','normal','phys',85,100,15,{status:'par',chance:30}),
    return_:     mv('Return','normal','phys',90,100,20),
    facade:      mv('Facade','normal','phys',70,100,20),
    hyperbeam:   mv('Hyper Beam','normal','spec',150,90,5,{recharge:true}),
    growl:       mv('Growl','normal','status',0,100,40,{stat:'atk',stage:-1,target:'foe'}),
    tailwhip:    mv('Tail Whip','normal','status',0,100,30,{stat:'def',stage:-1,target:'foe'}),
    leer:        mv('Leer','normal','status',0,100,30,{stat:'def',stage:-1,target:'foe'}),
    workup:      mv('Work Up','normal','status',0,100,30,{stat:'atk',stage:1,target:'self',also:{stat:'spa',stage:1}}),
    ember:       mv('Ember','fire','spec',40,100,25,{status:'brn',chance:10}),
    flamewheel:  mv('Flame Wheel','fire','phys',60,100,25,{status:'brn',chance:10}),
    firefang:    mv('Fire Fang','fire','phys',65,95,15,{status:'brn',chance:10,flinch:10}),
    firepunch:   mv('Fire Punch','fire','phys',75,100,15,{status:'brn',chance:10}),
    flamethrower:mv('Flamethrower','fire','spec',90,100,15,{status:'brn',chance:10}),
    flareblitz:  mv('Flare Blitz','fire','phys',120,100,15,{recoil:.33,status:'brn',chance:10}),
    fireblast:   mv('Fire Blast','fire','spec',110,85,5,{status:'brn',chance:10}),
    watergun:    mv('Water Gun','water','spec',40,100,25),
    bubblebeam:  mv('Bubble Beam','water','spec',65,100,20,{stat:'spe',stage:-1,target:'foe',chance:10}),
    aquatail:    mv('Aqua Tail','water','phys',90,90,10),
    surf_:       mv('Surf','water','spec',90,100,15),
    waterfall_:  mv('Waterfall','water','phys',80,100,15,{flinch:20}),
    hydropump:   mv('Hydro Pump','water','spec',110,80,5),
    scald:       mv('Scald','water','spec',80,100,15,{status:'brn',chance:30}),
    thundershock:mv('Thunder Shock','electric','spec',40,100,30,{status:'par',chance:10}),
    spark:       mv('Spark','electric','phys',65,100,20,{status:'par',chance:30}),
    thunderbolt: mv('Thunderbolt','electric','spec',90,100,15,{status:'par',chance:10}),
    wildcharge:  mv('Wild Charge','electric','phys',90,100,15,{recoil:.25}),
    thunderwave: mv('Thunder Wave','electric','status',0,90,20,{status:'par',target:'foe'}),
    vinewhip:    mv('Vine Whip','grass','phys',45,100,25),
    razorleaf:   mv('Razor Leaf','grass','phys',55,95,25,{highCrit:true}),
    megadrain:   mv('Mega Drain','grass','spec',40,100,15,{drain:.5}),
    gigadrain:   mv('Giga Drain','grass','spec',75,100,10,{drain:.5}),
    leafblade:   mv('Leaf Blade','grass','phys',90,100,15,{highCrit:true}),
    energyball:  mv('Energy Ball','grass','spec',90,100,10,{stat:'spd',stage:-1,target:'foe',chance:10}),
    leafstorm:   mv('Leaf Storm','grass','spec',130,90,5,{stat:'spa',stage:-2,target:'self'}),
    icefang:     mv('Ice Fang','ice','phys',65,95,15,{status:'frz',chance:10,flinch:10}),
    iceshard:    mv('Ice Shard','ice','phys',40,100,30,{priority:1}),
    icebeam:     mv('Ice Beam','ice','spec',90,100,10,{status:'frz',chance:10}),
    aurorabeam:  mv('Aurora Beam','ice','spec',65,100,20,{stat:'atk',stage:-1,target:'foe',chance:10}),
    karatechop:  mv('Karate Chop','fighting','phys',50,100,25,{highCrit:true}),
    doublekick:  mv('Double Kick','fighting','phys',30,100,30,{multi:2}),
    lowkick:     mv('Low Kick','fighting','phys',60,100,20),
    brickbreak:  mv('Brick Break','fighting','phys',75,100,15),
    machpunch:   mv('Mach Punch','fighting','phys',40,100,30,{priority:1}),
    hammerarm:   mv('Hammer Arm','fighting','phys',100,90,10,{stat:'spe',stage:-1,target:'self'}),
    closecombat: mv('Close Combat','fighting','phys',120,100,5,{stat:'def',stage:-1,target:'self',also:{stat:'spd',stage:-1}}),
    superpower:  mv('Superpower','fighting','phys',120,100,5,{stat:'atk',stage:-1,target:'self',also:{stat:'def',stage:-1}}),
    poisonsting: mv('Poison Sting','poison','phys',15,100,35,{status:'psn',chance:30}),
    sludgebomb:  mv('Sludge Bomb','poison','spec',90,100,10,{status:'psn',chance:30}),
    toxic:       mv('Toxic','poison','status',0,90,10,{status:'tox',target:'foe'}),
    mudslap:     mv('Mud-Slap','ground','spec',20,100,10,{stat:'acc',stage:-1,target:'foe'}),
    magnitude:   mv('Magnitude','ground','phys',70,100,30),
    dig_:        mv('Dig','ground','phys',80,100,10),
    earthquake:  mv('Earthquake','ground','phys',100,100,10),
    bulldoze:    mv('Bulldoze','ground','phys',60,100,20,{stat:'spe',stage:-1,target:'foe'}),
    gust:        mv('Gust','flying','spec',40,100,35),
    peck:        mv('Peck','flying','phys',35,100,35),
    wingattack:  mv('Wing Attack','flying','phys',60,100,35),
    aerialace:   mv('Aerial Ace','flying','phys',60,101,20),
    airslash:    mv('Air Slash','flying','spec',75,95,15,{flinch:30}),
    bravebird:   mv('Brave Bird','flying','phys',120,100,15,{recoil:.33}),
    fly_:        mv('Fly','flying','phys',90,95,15),
    confusion:   mv('Confusion','psychic','spec',50,100,25),
    psybeam:     mv('Psybeam','psychic','spec',65,100,20),
    psychic_:    mv('Psychic','psychic','spec',90,100,10,{stat:'spd',stage:-1,target:'foe',chance:10}),
    zenheadbutt: mv('Zen Headbutt','psychic','phys',80,90,15,{flinch:20}),
    hypnosis:    mv('Hypnosis','psychic','status',0,60,20,{status:'slp',target:'foe'}),
    dreameater:  mv('Dream Eater','psychic','spec',100,100,15,{drain:.5,needsSleep:true}),
    calmmind:    mv('Calm Mind','psychic','status',0,100,20,{stat:'spa',stage:1,target:'self',also:{stat:'spd',stage:1}}),
    bugbite:     mv('Bug Bite','bug','phys',60,100,20),
    strugglebug: mv('Struggle Bug','bug','spec',50,100,20,{stat:'spa',stage:-1,target:'foe'}),
    xscissor:    mv('X-Scissor','bug','phys',80,100,15),
    bugbuzz:     mv('Bug Buzz','bug','spec',90,100,10,{stat:'spd',stage:-1,target:'foe',chance:10}),
    uturn:       mv('U-turn','bug','phys',70,100,20),
    rockthrow:   mv('Rock Throw','rock','phys',50,90,15),
    rocktomb:    mv('Rock Tomb','rock','phys',60,95,15,{stat:'spe',stage:-1,target:'foe'}),
    rockslide:   mv('Rock Slide','rock','phys',75,90,10,{flinch:30}),
    stoneedge:   mv('Stone Edge','rock','phys',100,80,5,{highCrit:true}),
    powergem:    mv('Power Gem','rock','spec',80,100,20),
    lick:        mv('Lick','ghost','phys',30,100,30,{status:'par',chance:30}),
    shadowsneak: mv('Shadow Sneak','ghost','phys',40,100,30,{priority:1}),
    shadowball:  mv('Shadow Ball','ghost','spec',80,100,15,{stat:'spd',stage:-1,target:'foe',chance:20}),
    shadowclaw:  mv('Shadow Claw','ghost','phys',70,100,15,{highCrit:true}),
    hex:         mv('Hex','ghost','spec',65,100,10),
    dragonbreath:mv('Dragon Breath','dragon','spec',60,100,20,{status:'par',chance:30}),
    dragonclaw:  mv('Dragon Claw','dragon','phys',80,100,15),
    bite:        mv('Bite','dark','phys',60,100,25,{flinch:30}),
    crunch:      mv('Crunch','dark','phys',80,100,15,{stat:'def',stage:-1,target:'foe',chance:20}),
    suckerpunch: mv('Sucker Punch','dark','phys',70,100,5,{priority:1}),
    nightslash:  mv('Night Slash','dark','phys',70,100,15,{highCrit:true}),
    foulplay:    mv('Foul Play','dark','phys',95,100,15),
    darkpulse:   mv('Dark Pulse','dark','spec',80,100,15,{flinch:20}),
    metalclaw:   mv('Metal Claw','steel','phys',50,95,35,{stat:'atk',stage:1,target:'self',chance:10}),
    ironhead:    mv('Iron Head','steel','phys',80,100,15,{flinch:30}),
    flashcannon: mv('Flash Cannon','steel','spec',80,100,10,{stat:'spd',stage:-1,target:'foe',chance:10}),
    // status / setup
    harden:      mv('Harden','normal','status',0,100,30,{stat:'def',stage:1,target:'self'}),
    defensecurl: mv('Defense Curl','normal','status',0,100,40,{stat:'def',stage:1,target:'self'}),
    swordsdance: mv('Swords Dance','normal','status',0,100,20,{stat:'atk',stage:2,target:'self'}),
    agility:     mv('Agility','psychic','status',0,100,30,{stat:'spe',stage:2,target:'self'}),
    recover:     mv('Recover','normal','status',0,100,10,{heal:.5,target:'self'}),
    roost:       mv('Roost','flying','status',0,100,10,{heal:.5,target:'self'}),
    willowisp:   mv('Will-O-Wisp','fire','status',0,85,15,{status:'brn',target:'foe'}),
    sleeppowder: mv('Sleep Powder','grass','status',0,75,15,{status:'slp',target:'foe'}),
    stunspore:   mv('Stun Spore','grass','status',0,75,30,{status:'par',target:'foe'}),
    growth:      mv('Growth','normal','status',0,100,20,{stat:'atk',stage:1,target:'self',also:{stat:'spa',stage:1}}),
    // HM field moves (also usable in battle)
    cut_:        mv('Cut','normal','phys',50,95,30),
    strength_:   mv('Strength','normal','phys',80,100,15),
  };

  // ---------------- Species ----------------
  // base: [hp,atk,def,spa,spd,spe]. ls: [[lvl,moveKey]...]. evo:{lvl,to} optional.
  const SPECIES = {};
  function sp(dex, name, types, base, ability, catchRate, exp, ls, evo) {
    SPECIES[name] = { dex, name, types, base, ability, catchRate, exp, ls, evo: evo || null };
  }
  // starters
  sp(495,'Snivy',['grass'],[45,45,55,45,55,63],'Overgrow',45,62,[[1,'tackle'],[1,'leer'],[7,'vinewhip'],[10,'growth'],[16,'razorleaf'],[24,'leafblade'],[36,'leafstorm']],{lvl:17,to:'Servine'});
  sp(496,'Servine',['grass'],[60,60,75,60,75,83],'Overgrow',45,145,[[1,'tackle'],[1,'leer'],[16,'razorleaf'],[24,'leafblade'],[38,'gigadrain'],[45,'leafstorm']],{lvl:36,to:'Serperior'});
  sp(497,'Serperior',['grass'],[75,75,95,75,95,113],'Overgrow',45,238,[[1,'leer'],[16,'razorleaf'],[24,'leafblade'],[38,'gigadrain'],[50,'leafstorm']]);
  sp(498,'Tepig',['fire'],[65,63,45,45,45,45],'Blaze',45,62,[[1,'tackle'],[1,'tailwhip'],[7,'ember'],[13,'flamewheel'],[20,'headbutt'],[28,'flamethrower'],[36,'flareblitz']],{lvl:17,to:'Pignite'});
  sp(499,'Pignite',['fire','fighting'],[90,93,55,70,55,55],'Blaze',45,146,[[1,'ember'],[13,'flamewheel'],[20,'brickbreak'],[28,'flamethrower'],[36,'hammerarm'],[42,'flareblitz']],{lvl:36,to:'Emboar'});
  sp(500,'Emboar',['fire','fighting'],[110,123,65,100,65,65],'Blaze',45,238,[[1,'brickbreak'],[28,'flamethrower'],[36,'hammerarm'],[45,'flareblitz'],[52,'superpower']]);
  sp(501,'Oshawott',['water'],[55,55,45,63,45,45],'Torrent',45,62,[[1,'tackle'],[1,'tailwhip'],[7,'watergun'],[13,'bubblebeam'],[20,'aquatail'],[28,'razorleaf'],[36,'hydropump']],{lvl:17,to:'Dewott'});
  sp(502,'Dewott',['water'],[75,75,60,83,60,60],'Torrent',45,145,[[1,'watergun'],[13,'bubblebeam'],[20,'aquatail'],[28,'razorleaf'],[36,'scald'],[45,'hydropump']],{lvl:36,to:'Samurott'});
  sp(503,'Samurott',['water'],[95,100,85,108,70,70],'Torrent',45,238,[[1,'aquatail'],[28,'razorleaf'],[36,'scald'],[45,'hydropump'],[50,'megadrain']]);
  // early
  sp(504,'Patrat',['normal'],[45,55,39,35,39,42],'Keen Eye',255,51,[[1,'tackle'],[1,'leer'],[8,'bite'],[15,'headbutt'],[23,'crunch'],[30,'workup']],{lvl:20,to:'Watchog'});
  sp(505,'Watchog',['normal'],[60,85,69,60,69,77],'Keen Eye',255,147,[[1,'bite'],[15,'headbutt'],[23,'crunch'],[30,'workup'],[38,'bodyslam']]);
  sp(506,'Lillipup',['normal'],[45,60,45,25,45,55],'Vital Spirit',255,55,[[1,'tackle'],[1,'leer'],[8,'bite'],[13,'headbutt'],[20,'crunch'],[27,'workup'],[36,'bodyslam']],{lvl:16,to:'Herdier'});
  sp(507,'Herdier',['normal'],[65,80,65,35,65,60],'Intimidate',120,130,[[1,'bite'],[13,'headbutt'],[20,'crunch'],[27,'workup'],[38,'bodyslam']],{lvl:32,to:'Stoutland'});
  sp(508,'Stoutland',['normal'],[85,110,90,45,90,80],'Intimidate',45,225,[[1,'crunch'],[27,'workup'],[38,'bodyslam'],[46,'superpower']]);
  sp(509,'Purrloin',['dark'],[41,50,37,50,37,66],'Limber',255,56,[[1,'scratch'],[1,'growl'],[8,'bite'],[14,'suckerpunch'],[22,'nightslash'],[30,'crunch']],{lvl:20,to:'Liepard'});
  sp(510,'Liepard',['dark'],[64,88,50,88,50,106],'Limber',90,156,[[1,'bite'],[14,'suckerpunch'],[22,'nightslash'],[30,'crunch'],[38,'darkpulse']]);
  sp(519,'Pidove',['normal','flying'],[50,55,50,36,30,43],'Big Pecks',255,53,[[1,'peck'],[1,'growl'],[8,'quickattack'],[15,'airslash'],[23,'aerialace'],[32,'bravebird']],{lvl:21,to:'Tranquill'});
  sp(520,'Tranquill',['normal','flying'],[62,77,62,50,42,65],'Big Pecks',120,125,[[1,'airslash'],[23,'aerialace'],[32,'bravebird'],[40,'fly_']],{lvl:32,to:'Unfezant'});
  sp(521,'Unfezant',['normal','flying'],[80,115,80,65,55,93],'Big Pecks',45,220,[[1,'aerialace'],[32,'bravebird'],[40,'fly_'],[48,'hyperbeam']]);
  sp(524,'Roggenrola',['rock'],[55,75,85,25,25,15],'Sturdy',255,56,[[1,'tackle'],[4,'harden'],[8,'rockthrow'],[16,'rocktomb'],[24,'rockslide'],[36,'stoneedge']],{lvl:25,to:'Boldore'});
  sp(525,'Boldore',['rock'],[70,105,105,50,40,20],'Sturdy',120,137,[[1,'rockthrow'],[16,'rocktomb'],[24,'rockslide'],[36,'stoneedge'],[42,'earthquake']],{lvl:34,to:'Gigalith'});
  sp(526,'Gigalith',['rock'],[85,135,130,60,80,25],'Sturdy',45,232,[[1,'rockslide'],[36,'stoneedge'],[42,'earthquake'],[50,'superpower']]);
  sp(522,'Blitzle',['electric'],[45,60,32,50,32,76],'Lightning Rod',190,59,[[1,'quickattack'],[1,'tailwhip'],[9,'thundershock'],[17,'spark'],[27,'wildcharge'],[36,'thunderbolt']],{lvl:27,to:'Zebstrika'});
  sp(523,'Zebstrika',['electric'],[75,100,63,80,63,116],'Lightning Rod',75,174,[[1,'spark'],[27,'wildcharge'],[36,'thunderbolt'],[44,'agility']]);
  sp(551,'Sandile',['ground','dark'],[50,72,35,35,35,65],'Intimidate',180,58,[[1,'leer'],[1,'bite'],[8,'mudslap'],[13,'bulldoze'],[20,'crunch'],[28,'dig_'],[35,'earthquake']],{lvl:29,to:'Krokorok'});
  sp(552,'Krokorok',['ground','dark'],[60,82,45,45,45,74],'Intimidate',90,123,[[1,'bite'],[13,'bulldoze'],[20,'crunch'],[28,'dig_'],[35,'earthquake'],[42,'stoneedge']],{lvl:40,to:'Krookodile'});
  sp(553,'Krookodile',['ground','dark'],[95,117,80,65,70,92],'Intimidate',45,234,[[1,'crunch'],[28,'dig_'],[35,'earthquake'],[42,'stoneedge'],[50,'superpower']]);
  sp(554,'Darumaka',['fire'],[70,90,45,15,45,50],'Hustle',120,63,[[1,'tackle'],[1,'firefang'],[9,'headbutt'],[15,'flamewheel'],[23,'firepunch'],[31,'flareblitz'],[38,'superpower']],{lvl:35,to:'Darmanitan'});
  sp(555,'Darmanitan',['fire'],[105,140,55,30,55,95],'Sheer Force',60,168,[[1,'firepunch'],[1,'firefang'],[23,'firepunch'],[31,'flareblitz'],[38,'superpower'],[45,'flareblitz'],[50,'earthquake']]);
  sp(535,'Tympole',['water'],[50,50,40,50,40,64],'Swift Swim',255,59,[[1,'bubblebeam'],[1,'growl'],[9,'watergun'],[16,'mudslap'],[25,'bulldoze'],[36,'scald']],{lvl:25,to:'Palpitoad'});
  sp(536,'Palpitoad',['water','ground'],[75,65,55,65,55,69],'Swift Swim',120,134,[[1,'watergun'],[16,'mudslap'],[25,'bulldoze'],[31,'aquatail'],[36,'earthquake'],[43,'hydropump']],{lvl:36,to:'Seismitoad'});
  sp(537,'Seismitoad',['water','ground'],[105,95,75,85,75,74],'Swift Swim',45,229,[[1,'bulldoze'],[31,'aquatail'],[36,'earthquake'],[43,'hydropump'],[50,'sludgebomb']]);
  sp(580,'Ducklett',['water','flying'],[62,44,50,44,50,55],'Keen Eye',190,61,[[1,'watergun'],[1,'gust'],[13,'aerialace'],[19,'bubblebeam'],[27,'airslash'],[37,'scald']],{lvl:35,to:'Swanna'});
  sp(581,'Swanna',['water','flying'],[75,87,63,87,63,98],'Keen Eye',45,166,[[1,'bubblebeam'],[27,'airslash'],[37,'scald'],[44,'bravebird'],[50,'hydropump']]);
  sp(540,'Sewaddle',['bug','grass'],[45,53,70,40,60,42],'Overcoat',255,62,[[1,'tackle'],[1,'stringshot'],[8,'bugbite'],[14,'razorleaf'],[20,'strugglebug']],{lvl:20,to:'Swadloon'});
  sp(541,'Swadloon',['bug','grass'],[55,63,90,50,80,42],'Overcoat',120,133,[[1,'bugbite'],[14,'razorleaf'],[20,'strugglebug'],[28,'energyball']],{lvl:32,to:'Leavanny'});
  sp(542,'Leavanny',['bug','grass'],[75,103,80,70,80,92],'Swarm',45,225,[[1,'razorleaf'],[20,'xscissor'],[28,'energyball'],[36,'leafblade'],[44,'swordsdance']]);
  sp(532,'Timburr',['fighting'],[75,80,55,25,35,35],'Guts',180,61,[[1,'pound'],[1,'leer'],[8,'lowkick'],[12,'brickbreak'],[20,'bulldoze'],[28,'superpower']],{lvl:25,to:'Gurdurr'});
  sp(533,'Gurdurr',['fighting'],[85,105,85,40,50,40],'Guts',90,142,[[1,'lowkick'],[12,'brickbreak'],[20,'bulldoze'],[28,'superpower'],[36,'hammerarm']],{lvl:37,to:'Conkeldurr'});
  sp(534,'Conkeldurr',['fighting'],[105,140,95,55,65,45],'Guts',45,227,[[1,'brickbreak'],[28,'superpower'],[36,'hammerarm'],[44,'stoneedge'],[52,'earthquake']]);
  sp(529,'Drilbur',['ground'],[60,85,40,30,45,68],'Sand Rush',120,66,[[1,'scratch'],[1,'mudslap'],[8,'rockslide'],[15,'dig_'],[23,'crunch'],[31,'earthquake']],{lvl:31,to:'Excadrill'});
  sp(530,'Excadrill',['ground','steel'],[110,135,60,50,65,88],'Sand Rush',60,178,[[1,'metalclaw'],[15,'dig_'],[23,'crunch'],[31,'earthquake'],[40,'ironhead'],[48,'stoneedge']]);
  sp(517,'Munna',['psychic'],[76,25,45,67,55,24],'Forewarn',190,58,[[1,'confusion'],[1,'hypnosis'],[9,'psybeam'],[17,'dreameater'],[24,'zenheadbutt'],[31,'psychic_']],{lvl:32,to:'Musharna'});
  sp(518,'Musharna',['psychic'],[116,55,85,107,95,29],'Forewarn',75,170,[[1,'psybeam'],[17,'dreameater'],[24,'zenheadbutt'],[31,'psychic_'],[40,'calmmind']]);
  sp(607,'Litwick',['ghost','fire'],[50,30,55,65,55,20],'Flash Fire',190,55,[[1,'ember'],[1,'lick'],[10,'hex'],[18,'flamewheel'],[26,'shadowball'],[34,'flamethrower']],{lvl:41,to:'Lampent'});
  sp(608,'Lampent',['ghost','fire'],[60,40,60,95,60,55],'Flash Fire',90,130,[[1,'hex'],[18,'flamewheel'],[26,'shadowball'],[34,'flamethrower'],[42,'fireblast']],{lvl:50,to:'Chandelure'});
  sp(609,'Chandelure',['ghost','fire'],[60,55,90,145,90,80],'Flash Fire',45,234,[[1,'shadowball'],[34,'flamethrower'],[42,'fireblast'],[50,'hex']]);
  sp(570,'Zorua',['dark'],[40,65,40,80,40,65],'Illusion',75,66,[[1,'scratch'],[1,'leer'],[8,'suckerpunch'],[16,'nightslash'],[24,'foulplay'],[32,'darkpulse']],{lvl:30,to:'Zoroark'});
  sp(571,'Zoroark',['dark'],[60,105,60,120,60,105],'Illusion',45,179,[[1,'nightslash'],[24,'foulplay'],[32,'darkpulse'],[40,'nightslash']]);
  sp(559,'Scraggy',['dark','fighting'],[50,75,70,35,70,48],'Shed Skin',180,70,[[1,'leer'],[1,'lowkick'],[9,'bite'],[16,'brickbreak'],[24,'crunch'],[31,'hammerarm']],{lvl:39,to:'Scrafty'});
  sp(560,'Scrafty',['dark','fighting'],[65,90,115,45,115,58],'Shed Skin',90,171,[[1,'brickbreak'],[24,'crunch'],[31,'hammerarm'],[40,'closecombat']]);
  sp(538,'Throh',['fighting'],[120,100,85,30,85,45],'Guts',45,163,[[1,'lowkick'],[1,'leer'],[12,'brickbreak'],[24,'bodyslam'],[33,'superpower'],[42,'earthquake']]);
  sp(539,'Sawk',['fighting'],[75,125,75,30,75,85],'Sturdy',45,163,[[1,'lowkick'],[12,'brickbreak'],[24,'closecombat'],[33,'stoneedge'],[42,'earthquake']]);
  sp(620,'Mienshao',['fighting'],[65,125,60,95,60,105],'Inner Focus',45,179,[[1,'doublekick'],[1,'quickattack'],[24,'closecombat'],[33,'uturn'],[40,'hammerarm']]);
  sp(561,'Sigilyph',['psychic','flying'],[72,58,80,103,80,97],'Wonder Skin',45,172,[[1,'gust'],[1,'psybeam'],[24,'airslash'],[33,'psychic_'],[40,'shadowball']]);
  sp(576,'Gothitelle',['psychic'],[70,55,95,95,110,65],'Frisk',50,221,[[1,'confusion'],[1,'psybeam'],[24,'psychic_'],[33,'calmmind'],[40,'shadowball']]);
  sp(579,'Reuniclus',['psychic'],[110,65,75,125,85,30],'Overcoat',50,221,[[1,'psybeam'],[24,'psychic_'],[33,'calmmind'],[40,'shadowball'],[46,'recover']]);
  sp(563,'Cofagrigus',['ghost'],[58,50,145,95,105,30],'Mummy',90,169,[[1,'lick'],[1,'hex'],[24,'shadowball'],[33,'toxic'],[40,'shadowball']]);
  sp(637,'Volcarona',['bug','fire'],[85,60,65,135,105,100],'Flame Body',15,248,[[1,'ember'],[1,'gust'],[30,'bugbuzz'],[40,'flamethrower'],[50,'fireblast'],[55,'airslash']]);
  sp(626,'Bouffalant',['normal'],[95,110,95,40,95,55],'Reckless',45,172,[[1,'headbutt'],[1,'leer'],[24,'zenheadbutt'],[33,'bodyslam'],[40,'earthquake'],[46,'superpower']]);
  sp(531,'Audino',['normal'],[103,60,86,60,86,50],'Regenerator',255,390,[[1,'pound'],[1,'growl'],[10,'bodyslam'],[20,'recover']]);
  // string shot placeholder (weak status)
  MOVES.stringshot = mv('String Shot','bug','status',0,95,40,{stat:'spe',stage:-1,target:'foe'});

  // ---------------- Items ----------------
  const ITEMS = {
    potion:      { name:'Potion', kind:'heal', amount:20, price:200, desc:'Restores 20 HP.' },
    superpotion: { name:'Super Potion', kind:'heal', amount:60, price:700, desc:'Restores 60 HP.' },
    hyperpotion: { name:'Hyper Potion', kind:'heal', amount:120, price:1500, desc:'Restores 120 HP.' },
    fullrestore: { name:'Full Restore', kind:'heal', amount:9999, cure:true, price:3000, desc:'Fully restores HP and cures status.' },
    revive:      { name:'Revive', kind:'revive', amount:.5, price:2000, desc:'Revives a fainted Pokémon to half HP.' },
    antidote:    { name:'Antidote', kind:'cure', status:['psn','tox'], price:150, desc:'Cures poison.' },
    awakening:   { name:'Awakening', kind:'cure', status:['slp'], price:250, desc:'Wakes a sleeping Pokémon.' },
    pokeball:    { name:'Poké Ball', kind:'ball', bonus:1, price:200, desc:'A device for catching Pokémon.' },
    greatball:   { name:'Great Ball', kind:'ball', bonus:1.5, price:600, desc:'Catches better than a Poké Ball.' },
    ultraball:   { name:'Ultra Ball', kind:'ball', bonus:2, price:800, desc:'An excellent catch rate.' },
  };

  G.TYPES = TYPES; G.TYPE_COLOR = TYPE_COLOR; G.typeEff = typeEff;
  G.MOVES = MOVES; G.SPECIES = SPECIES; G.ITEMS = ITEMS;
  G.move = (k) => MOVES[k]; G.species = (n) => SPECIES[n];
})(typeof window !== 'undefined' ? window : globalThis);

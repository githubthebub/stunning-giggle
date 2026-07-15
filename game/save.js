/* save.js — persistence + preset saves (New Adventure, Champion quick-start). */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const KEY = 'unova_save_v1';

  function save(player) {
    try { localStorage.setItem(KEY, JSON.stringify(player)); return true; }
    catch (e) { console.warn('save failed', e); return false; }
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function hasSave() { return !!localStorage.getItem(KEY); }
  function wipe() { localStorage.removeItem(KEY); }

  // Fresh journey — you'll pick a starter from the Professor.
  function newAdventure(name) {
    const p = G.party.newPlayer();
    if (name) p.name = name.slice(0, 12);
    p.visitedTowns = ['nuvema'];
    return p;
  }

  // Champion quick-start: post-E4, all badges, all HMs, a strong team with
  // Darmanitan, and freedom to roam + use the Entralink immediately.
  function championStart(name) {
    const p = G.party.newPlayer();
    if (name) p.name = name.slice(0, 12);
    p.champion = true;
    p.money = 99999;
    p.badges = ['trio', 'basic', 'wave', 'legend'];
    p.hms = ['cut', 'fly', 'surf', 'strength', 'waterfall'];
    p.visitedTowns = ['nuvema', 'striaton', 'desert', 'nacrene', 'route3', 'castelia', 'opelucid'];
    p.flags = { got_fly: true, desert_gift: true, e4_1: true, e4_2: true, e4_3: true, e4_4: true, champion: true };
    p.bag = { potion: 20, superpotion: 15, hyperpotion: 10, fullrestore: 8, revive: 8, pokeball: 20, greatball: 15, ultraball: 20, antidote: 10, awakening: 10 };
    p.party = [
      G.party.makeMon('Darmanitan', 55, { moves: ['flareblitz', 'superpower', 'earthquake', 'firepunch'] }),
      G.party.makeMon('Serperior', 54, { moves: ['leafblade', 'gigadrain', 'leafstorm', 'razorleaf'] }),
      G.party.makeMon('Samurott', 53, { moves: ['surf_', 'hydropump', 'aquatail', 'megadrain'] }),
      G.party.makeMon('Zebstrika', 52, { moves: ['wildcharge', 'thunderbolt', 'flamewheel', 'agility'] }),
      G.party.makeMon('Excadrill', 53, { moves: ['earthquake', 'ironhead', 'crunch', 'rockslide'] }),
      G.party.makeMon('Swanna', 52, { moves: ['bravebird', 'scald', 'airslash', 'fly_'] }),
    ];
    p.party.forEach((m) => { G.party.ownDex(p, m.species); });
    // fill a few dex 'seen' entries
    ['Krookodile', 'Chandelure', 'Conkeldurr', 'Volcarona', 'Zoroark'].forEach((n) => G.party.seeDex(p, n));
    p.map = 'nuvema'; p.x = 9; p.y = 11; p.dir = 'up';
    return p;
  }

  G.save = { save, load, hasSave, wipe, newAdventure, championStart, KEY };
})();

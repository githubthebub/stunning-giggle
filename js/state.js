/* state.js — game state, persistence, and shared mutations. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const SAVE_KEY = 'dreamworld_save_v1';
  const GARDEN_PLOTS = 6;

  let state = null;
  const listeners = new Set();

  function now() { return Date.now(); }

  function uid() {
    return 'p' + now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function makeTrainerId() {
    return 'T-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  }

  function defaultState() {
    return {
      version: 1,
      trainer: { id: makeTrainerId(), name: '', avatar: '🧑‍🎤', dreamPoints: 40 },
      partner: null,        // species id of the Pokémon currently able to sleep
      asleep: false,        // is the partner asleep (in the Dream World)?
      currentArea: null,
      box: [],              // befriended dream Pokémon
      garden: { plots: Array.from({ length: GARDEN_PLOTS }, () => null), inventory: {} },
      house: { placed: [] },      // [{itemId, cell}]
      ownedFurniture: [],         // ids purchased (can place multiple copies)
      gift: null,                 // a Pokémon you've set out to give to visitors
      visitors: [],               // log of crossover visits
      onboarded: false,
      createdAt: now(),
      updatedAt: now(),
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = Object.assign(defaultState(), parsed);
        // Defensive: ensure nested shapes exist after schema tweaks.
        state.trainer = Object.assign(defaultState().trainer, parsed.trainer || {});
        state.garden = Object.assign({ plots: [], inventory: {} }, parsed.garden || {});
        if (!Array.isArray(state.garden.plots) || state.garden.plots.length !== GARDEN_PLOTS) {
          const p = state.garden.plots || [];
          state.garden.plots = Array.from({ length: GARDEN_PLOTS }, (_, i) => p[i] || null);
        }
        state.house = Object.assign({ placed: [] }, parsed.house || {});
        return state;
      }
    } catch (e) { console.warn('Could not load save', e); }
    state = defaultState();
    return state;
  }

  function save() {
    state.updatedAt = now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch (e) { console.warn('Could not save', e); }
    emit();
  }

  function reset() {
    state = defaultState();
    save();
  }

  function get() { return state; }

  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  function emit() { listeners.forEach((fn) => { try { fn(state); } catch (e) { console.error(e); } }); }

  // ---- Dream Points ----
  function addPoints(n) {
    state.trainer.dreamPoints = Math.max(0, state.trainer.dreamPoints + n);
    save();
  }
  function spendPoints(n) {
    if (state.trainer.dreamPoints < n) return false;
    state.trainer.dreamPoints -= n;
    save();
    return true;
  }

  // ---- Pokémon ----
  // Create a caught/befriended Pokémon record from a species.
  function makePokemon(species, opts) {
    opts = opts || {};
    return {
      uid: uid(),
      speciesId: species.id,
      name: species.name,
      types: species.types.slice(),
      ability: species.ability,      // the Dream World Hidden Ability
      nickname: opts.nickname || '',
      level: opts.level || (3 + Math.floor(Math.random() * 8)),
      friendship: opts.friendship != null ? opts.friendship : 70,
      shiny: opts.shiny || false,
      from: opts.from || 'dream',    // 'dream' | 'gift' | 'crossover'
      fromTrainer: opts.fromTrainer || '',
      caughtAt: now(),
    };
  }

  function addPokemon(pokemon) {
    state.box.unshift(pokemon);
    save();
    return pokemon;
  }

  function removePokemon(pkmnUid) {
    const idx = state.box.findIndex((p) => p.uid === pkmnUid);
    if (idx >= 0) {
      const [removed] = state.box.splice(idx, 1);
      save();
      return removed;
    }
    return null;
  }

  DW.state = {
    SAVE_KEY, GARDEN_PLOTS,
    now, uid,
    load, save, reset, get, subscribe,
    addPoints, spendPoints,
    makePokemon, addPokemon, removePokemon,
  };
})();

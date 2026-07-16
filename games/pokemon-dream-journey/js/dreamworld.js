/* dreamworld.js — the Island of Dreams: sleep, explore areas, meet Pokémon. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const { el, toast } = DW.ui;

  // Ephemeral per-sleep session (not persisted; each sleep is a fresh dream).
  let session = null;   // { areaEncounters: {areaId:[species...]}, viewArea }

  function weightedRarity() {
    const total = DW.data.RARITY.common + DW.data.RARITY.uncommon + DW.data.RARITY.rare;
    let r = Math.random() * total;
    if ((r -= DW.data.RARITY.common) < 0) return 'common';
    if ((r -= DW.data.RARITY.uncommon) < 0) return 'uncommon';
    return 'rare';
  }

  function spawnFor(areaId) {
    const pool = DW.data.SPECIES.filter((s) => s.area === areaId);
    const count = 3 + Math.floor(Math.random() * 2); // 3-4
    const chosen = [];
    const used = new Set();
    let guard = 0;
    while (chosen.length < count && guard++ < 40) {
      const want = weightedRarity();
      const candidates = pool.filter((s) => s.rarity === want && !used.has(s.id));
      const fallback = pool.filter((s) => !used.has(s.id));
      const list = candidates.length ? candidates : fallback;
      if (!list.length) break;
      const pick = list[Math.floor(Math.random() * list.length)];
      used.add(pick.id);
      chosen.push(pick);
    }
    return chosen;
  }

  function startDream() {
    session = { areaEncounters: {}, viewArea: null };
    DW.data.AREAS.forEach((a) => { session.areaEncounters[a.id] = spawnFor(a.id); });
    const st = DW.state.get();
    st.asleep = true;
    DW.state.save();
    DW.audio.play('dream');
  }

  function wakeUp() {
    const st = DW.state.get();
    st.asleep = false;
    session = null;
    DW.state.save();
    DW.audio.play('coin');
    toast('You woke up! Your dream friends are waiting in your Box.', { emoji: '☀️' });
  }

  // ---- Rendering ----
  function render(mount) {
    DW.ui.clear(mount);
    const st = DW.state.get();
    if (!st.asleep) return mount.appendChild(renderSleepPrompt());
    if (!session) startDream();
    if (session.viewArea) return mount.appendChild(renderArea(session.viewArea, mount));
    mount.appendChild(renderIsland(mount));
  }

  function renderSleepPrompt() {
    const st = DW.state.get();
    const partner = st.partner ? DW.data.speciesById(st.partner) : null;
    const wrap = el('div', { class: 'sleep-prompt card soft' });
    wrap.appendChild(el('div', { class: 'z-drift' }, '💤'));
    wrap.appendChild(el('h2', {}, 'The Dream World'));
    wrap.appendChild(el('p', { class: 'muted' },
      'Send your partner to sleep and slip into the Island of Dreams, where sleeping Pokémon gather. Befriend them to bring them home — each arrives with a rare Hidden Ability.'));

    if (partner) {
      const p = el('div', { class: 'sleep-partner' }, [
        DW.sprites.spriteImg(partner, 120, { className: 'floaty' }),
        el('div', { class: 'sleep-partner-name' }, partner.name),
      ]);
      wrap.appendChild(p);
      wrap.appendChild(el('button', {
        class: 'btn primary big', onclick: () => { startDream(); DW.main.rerender(); },
      }, '😴 Fall asleep'));
    } else {
      wrap.appendChild(el('p', { class: 'muted' }, 'Choose a partner first from your Profile.'));
    }
    return wrap;
  }

  function renderIsland(mount) {
    const wrap = el('div', { class: 'island' });
    const header = el('div', { class: 'island-header' }, [
      el('div', {}, [
        el('h2', {}, '✨ Island of Dreams'),
        el('p', { class: 'muted' }, 'Wander the dreamscape and befriend the Pokémon you find.'),
      ]),
      el('button', { class: 'btn ghost', onclick: () => { wakeUp(); DW.main.rerender(); } }, '☀️ Wake up'),
    ]);
    wrap.appendChild(header);

    const grid = el('div', { class: 'area-grid' });
    DW.data.AREAS.forEach((area) => {
      const remaining = (session.areaEncounters[area.id] || []).length;
      const tile = el('button', {
        class: 'area-tile',
        style: { background: 'linear-gradient(160deg, ' + area.sky[0] + ', ' + area.sky[1] + ')' },
        onclick: () => { session.viewArea = area.id; DW.audio.play('click'); DW.main.rerender(); },
      }, [
        el('span', { class: 'area-emoji' }, area.emoji),
        el('span', { class: 'area-name' }, area.name),
        el('span', { class: 'area-count' }, remaining ? remaining + ' nearby' : 'quiet'),
      ]);
      grid.appendChild(tile);
    });
    wrap.appendChild(grid);
    return wrap;
  }

  function renderArea(areaId, mount) {
    const area = DW.data.areaById(areaId);
    const wrap = el('div', {
      class: 'area-scene',
      style: { background: 'linear-gradient(180deg, ' + area.sky[0] + ' 0%, ' + area.sky[1] + ' 100%)' },
    });
    // Floating clouds for atmosphere.
    for (let i = 0; i < 4; i++) {
      const cloud = el('div', { class: 'scene-cloud c' + i }, '☁️');
      wrap.appendChild(cloud);
    }

    const bar = el('div', { class: 'area-scene-bar' }, [
      el('button', { class: 'btn ghost sm', onclick: () => { session.viewArea = null; DW.main.rerender(); } }, '← Island'),
      el('div', { class: 'area-scene-title' }, [area.emoji + ' ' + area.name]),
      el('button', { class: 'btn ghost sm', onclick: () => { wakeUp(); DW.main.rerender(); } }, '☀️ Wake'),
    ]);
    wrap.appendChild(bar);
    wrap.appendChild(el('p', { class: 'area-blurb' }, area.blurb));

    const field = el('div', { class: 'dream-field' });
    const encounters = session.areaEncounters[areaId] || [];
    if (!encounters.length) {
      field.appendChild(el('div', { class: 'field-empty' }, [
        el('div', { class: 'field-empty-emoji' }, '🌙'),
        el('div', {}, 'All quiet here for now. Wake up and dream again to find more friends.'),
      ]));
    } else {
      encounters.forEach((species, idx) => {
        const spot = el('button', {
          class: 'dream-encounter rar-' + species.rarity,
          style: { left: (12 + (idx * 23) % 70) + '%', bottom: (10 + (idx % 2) * 26) + '%' },
          onclick: () => encounter(areaId, species),
        }, [
          DW.sprites.spriteImg(species, 84, { className: 'floaty' }),
          species.rarity !== 'common' ? el('span', { class: 'enc-rarity' }, species.rarity === 'rare' ? '★ rare' : 'uncommon') : null,
          el('span', { class: 'enc-zzz' }, '💤'),
        ]);
        field.appendChild(spot);
      });
    }
    wrap.appendChild(field);
    return wrap;
  }

  async function encounter(areaId, species) {
    const result = await DW.minigame.play(species);
    // Remove this encounter regardless of outcome.
    const list = session.areaEncounters[areaId] || [];
    const i = list.findIndex((s) => s.id === species.id);
    if (i >= 0) list.splice(i, 1);

    if (result.befriended) {
      const shiny = Math.random() < 0.02;
      const pkmn = DW.state.makePokemon(species, { from: 'dream', shiny });
      DW.state.addPokemon(pkmn);
      const pts = species.rarity === 'rare' ? 24 : species.rarity === 'uncommon' ? 14 : 8;
      DW.state.addPoints(pts);
      toast((shiny ? '✦ Shiny ' : '') + species.name + ' joined you! +' + pts + ' Dream Points', { emoji: '🤝', kind: 'success' });
      DW.main.updatePoints();
    } else {
      toast(species.name + ' slipped away...', { emoji: '💤' });
    }
    DW.main.rerender();
  }

  DW.dreamworld = { render, startDream, wakeUp, isAsleep: () => !!DW.state.get().asleep };
})();

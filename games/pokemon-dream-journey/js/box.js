/* box.js — your collection of befriended dream Pokémon. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const { el, toast } = DW.ui;
  let currentMount = null;
  let filter = 'all';

  function render(mount) {
    currentMount = mount;
    DW.ui.clear(mount);
    const st = DW.state.get();
    const wrap = el('div', { class: 'box' });

    wrap.appendChild(el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('h2', {}, '📦 Dream Box'),
        el('p', { class: 'muted' }, st.box.length
          ? 'You have befriended ' + st.box.length + ' Pokémon, each with its Hidden Ability.'
          : 'No friends yet — fall asleep and explore the Island of Dreams!'),
      ]),
      st.gift ? el('div', { class: 'gift-flag' }, ['🎁 Gift set: ', el('b', {}, (st.gift.nickname || st.gift.name))]) : null,
    ]));

    if (st.box.length) {
      // Filters by type.
      const types = Array.from(new Set(st.box.flatMap((p) => p.types || []))).sort();
      const filters = el('div', { class: 'box-filters' }, [
        chip('all', 'All'),
        ...types.map((t) => chip(t, t)),
      ]);
      wrap.appendChild(filters);

      const grid = el('div', { class: 'box-grid' });
      st.box
        .filter((p) => filter === 'all' || (p.types || []).includes(filter))
        .forEach((p) => grid.appendChild(DW.ui.pokemonCard(p, { onClick: openDetail })));
      wrap.appendChild(grid);
    }
    mount.appendChild(wrap);
  }

  function chip(value, label) {
    return el('button', {
      class: 'filter-chip' + (filter === value ? ' active' : ''),
      onclick: () => { filter = value; render(currentMount); },
    }, label);
  }

  function openDetail(pkmn) {
    const species = DW.data.speciesById(pkmn.speciesId) || pkmn;
    const st = DW.state.get();
    const isGift = st.gift && st.gift.uid === pkmn.uid;

    const body = el('div', { class: 'pkmn-detail' }, [
      el('div', { class: 'detail-sprite' }, [
        DW.sprites.spriteImg(species, 140, { className: 'floaty' }),
        pkmn.shiny ? el('span', { class: 'shiny-star big' }, '✦') : null,
      ]),
      el('div', { class: 'detail-info' }, [
        el('div', { class: 'detail-types' }, (pkmn.types || species.types).map(DW.ui.typeChip)),
        el('div', { class: 'detail-row' }, ['Level ', el('b', {}, String(pkmn.level))]),
        el('div', { class: 'detail-row' }, ['Hidden Ability ', el('b', { class: 'accent' }, '✨ ' + (pkmn.ability || species.ability))]),
        el('div', { class: 'detail-row' }, ['Friendship ', friendshipHearts(pkmn.friendship)]),
        pkmn.fromTrainer ? el('div', { class: 'detail-row muted' }, ['↔ Crossed over from ', el('b', {}, pkmn.fromTrainer)]) : null,
        el('div', { class: 'detail-row muted small' }, 'Met on ' + new Date(pkmn.caughtAt).toLocaleDateString()),
      ]),
    ]);

    const nickRow = el('div', { class: 'nick-row' }, [
      el('input', { class: 'text-input', type: 'text', maxlength: 12, placeholder: 'Nickname…', value: pkmn.nickname || '' }),
      el('button', { class: 'btn ghost sm' }, 'Save'),
    ]);
    nickRow.querySelector('button').addEventListener('click', () => {
      const v = nickRow.querySelector('input').value.trim().slice(0, 12);
      pkmn.nickname = v;
      DW.state.save();
      toast(v ? 'Nicknamed ' + v + '!' : 'Nickname cleared.', { emoji: '✏️' });
      m.close();
      render(currentMount);
    });

    const actions = el('div', { class: 'modal-actions wrap' }, [
      el('button', {
        class: 'btn ' + (isGift ? 'primary' : 'ghost'),
        onclick: () => {
          st.gift = isGift ? null : sanitizeForGift(pkmn);
          DW.state.save();
          toast(isGift ? 'Gift cleared.' : '🎁 ' + (pkmn.nickname || pkmn.name) + ' set as your crossover gift!', { emoji: '🎁', kind: 'success' });
          m.close();
          render(currentMount);
        },
      }, isGift ? '🎁 Unset gift' : '🎁 Set as crossover gift'),
      el('button', {
        class: 'btn danger ghost',
        onclick: async () => {
          const ok = await DW.ui.confirmDialog('Release ' + (pkmn.nickname || pkmn.name) + ' back into the dream?', { ok: 'Release', danger: true });
          if (ok) {
            if (st.gift && st.gift.uid === pkmn.uid) st.gift = null;
            DW.state.removePokemon(pkmn.uid);
            toast((pkmn.nickname || pkmn.name) + ' returned to the dream.', { emoji: '💤' });
            m.close();
            render(currentMount);
          }
        },
      }, 'Release'),
    ]);

    const m = DW.ui.modal([body, nickRow, actions], { title: pkmn.nickname || pkmn.name, className: 'modal-detail' });
  }

  function sanitizeForGift(pkmn) {
    // A shallow copy so editing the box copy later doesn't mutate the gift.
    return JSON.parse(JSON.stringify(pkmn));
  }

  function friendshipHearts(f) {
    const n = Math.round((f || 0) / 20);
    const span = el('span', { class: 'hearts' });
    for (let i = 0; i < 5; i++) span.appendChild(el('span', { class: i < n ? 'heart on' : 'heart' }, i < n ? '❤' : '♡'));
    return span;
  }

  DW.box = { render };
})();

/* house.js — decorate your Dream House. Buy furniture with Dream Points and
 * place it on a grid. A cozy space visitors will see when they cross over. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const { el, toast } = DW.ui;
  const COLS = 6, ROWS = 4;
  let selected = null;      // furniture id chosen to place
  let currentMount = null;

  function furnDef(id) { return DW.data.FURNITURE.find((f) => f.id === id); }

  function buy(id) {
    const def = furnDef(id);
    if (!DW.state.spendPoints(def.cost)) { toast('Not enough Dream Points.', { emoji: '💸', kind: 'warn' }); return; }
    const st = DW.state.get();
    if (!st.ownedFurniture.includes(id)) st.ownedFurniture.push(id);
    DW.state.save();
    DW.audio.play('coin');
    toast('Bought ' + def.name + '!', { emoji: def.emoji, kind: 'success' });
    DW.main.updatePoints();
    render(currentMount);
  }

  function placeAt(cell) {
    const st = DW.state.get();
    if (selected == null) {
      // Clicking an occupied cell removes the item.
      const existingIdx = st.house.placed.findIndex((p) => p.cell === cell);
      if (existingIdx >= 0) {
        st.house.placed.splice(existingIdx, 1);
        DW.state.save();
        DW.audio.play('click');
        render(currentMount);
      }
      return;
    }
    const existingIdx = st.house.placed.findIndex((p) => p.cell === cell);
    if (existingIdx >= 0) st.house.placed.splice(existingIdx, 1);
    st.house.placed.push({ itemId: selected, cell });
    DW.state.save();
    DW.audio.play('select');
    render(currentMount);
  }

  function render(mount) {
    currentMount = mount;
    DW.ui.clear(mount);
    const st = DW.state.get();

    const wrap = el('div', { class: 'house' });
    wrap.appendChild(el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('h2', {}, '🏠 Dream House'),
        el('p', { class: 'muted' }, selected
          ? 'Tap a tile to place your ' + furnDef(selected).name + '. Tap a placed item to remove it.'
          : 'Buy furniture below, then select it to place. Visitors see your house when they cross over.'),
      ]),
      selected ? el('button', { class: 'btn ghost sm', onclick: () => { selected = null; render(mount); } }, 'Done placing') : null,
    ]));

    // Room grid.
    const room = el('div', { class: 'room', style: { gridTemplateColumns: 'repeat(' + COLS + ', 1fr)' } });
    for (let c = 0; c < COLS * ROWS; c++) {
      const placed = st.house.placed.find((p) => p.cell === c);
      const tile = el('div', { class: 'room-tile' + (placed ? ' filled' : '') + (selected ? ' placing' : ''), onclick: () => placeAt(c) });
      if (placed) {
        const def = furnDef(placed.itemId);
        if (def) tile.appendChild(el('span', { class: 'room-item' }, def.emoji));
      }
      room.appendChild(tile);
    }
    wrap.appendChild(room);

    // Shop / inventory.
    const shop = el('div', { class: 'card soft' });
    shop.appendChild(el('h3', {}, '🛋️ Furniture Shop'));
    const grid = el('div', { class: 'furn-grid' });
    DW.data.FURNITURE.forEach((f) => {
      const owned = st.ownedFurniture.includes(f.id);
      const isSel = selected === f.id;
      const item = el('div', { class: 'furn-item' + (isSel ? ' selected' : '') }, [
        el('div', { class: 'furn-emoji' }, f.emoji),
        el('div', { class: 'furn-name' }, f.name),
        owned
          ? el('button', { class: 'btn ' + (isSel ? 'primary' : 'ghost') + ' sm', onclick: () => { selected = isSel ? null : f.id; render(mount); } }, isSel ? 'Selected' : 'Place')
          : el('button', { class: 'btn primary sm', onclick: () => buy(f.id) }, f.cost + ' pt'),
      ]);
      grid.appendChild(item);
    });
    shop.appendChild(grid);
    wrap.appendChild(shop);
    mount.appendChild(wrap);
  }

  DW.house = { render };
})();

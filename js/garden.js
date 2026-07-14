/* garden.js — the Dream Garden. Plant berries, wait, harvest for Dream Points. */
(function () {
  'use strict';
  const DW = (window.DW = window.DW || {});
  const { el, toast } = DW.ui;
  let tickTimer = null;

  function berryDef(key) { return DW.data.BERRIES[key]; }

  function plotState(plot) {
    if (!plot) return { status: 'empty' };
    const def = berryDef(plot.berry);
    const elapsed = DW.state.now() - plot.plantedAt;
    const ratio = Math.min(1, elapsed / def.growMs);
    return { status: ratio >= 1 ? 'ready' : 'growing', ratio, def };
  }

  function plant(index, berryKey) {
    const st = DW.state.get();
    const inv = st.garden.inventory;
    if (!inv[berryKey] || inv[berryKey] <= 0) {
      // First of each berry can be bought as a seed for a few points.
      const cost = 4;
      if (!DW.state.spendPoints(cost)) { toast('Not enough Dream Points for a seed.', { emoji: '💸', kind: 'warn' }); return; }
      toast('Bought a ' + berryDef(berryKey).name + ' seed (−' + cost + ').', { emoji: '🌱' });
      DW.main.updatePoints();
    } else {
      inv[berryKey] -= 1;
    }
    st.garden.plots[index] = { berry: berryKey, plantedAt: DW.state.now() };
    DW.state.save();
    DW.audio.play('click');
    render(currentMount);
  }

  function harvest(index) {
    const st = DW.state.get();
    const plot = st.garden.plots[index];
    if (!plot) return;
    const ps = plotState(plot);
    if (ps.status !== 'ready') return;
    const def = ps.def;
    const yieldN = def.yield[0] + Math.floor(Math.random() * (def.yield[1] - def.yield[0] + 1));
    st.garden.inventory[plot.berry] = (st.garden.inventory[plot.berry] || 0) + yieldN;
    st.garden.plots[index] = null;
    DW.state.addPoints(def.points);
    DW.audio.play('coin');
    toast('Harvested ' + yieldN + '× ' + def.name + '! +' + def.points + ' Dream Points', { emoji: def.emoji, kind: 'success' });
    DW.main.updatePoints();
    render(currentMount);
  }

  let currentMount = null;
  function render(mount) {
    currentMount = mount;
    DW.ui.clear(mount);
    const st = DW.state.get();

    const wrap = el('div', { class: 'garden' });
    wrap.appendChild(el('div', { class: 'section-head' }, [
      el('div', {}, [
        el('h2', {}, '🌱 Dream Garden'),
        el('p', { class: 'muted' }, 'Plant berries and let them grow while you dream. Harvest for Dream Points.'),
      ]),
    ]));

    const plots = el('div', { class: 'garden-plots' });
    st.garden.plots.forEach((plot, i) => {
      const ps = plotState(plot);
      const cell = el('div', { class: 'plot plot-' + ps.status });
      if (ps.status === 'empty') {
        cell.appendChild(el('div', { class: 'plot-empty', text: '＋' }));
        cell.appendChild(el('div', { class: 'plot-label', text: 'Plant' }));
        cell.addEventListener('click', () => openSeedPicker(i));
      } else {
        const sprout = el('div', { class: 'plot-sprout' }, ps.status === 'ready' ? ps.def.emoji : '🌱');
        cell.appendChild(sprout);
        cell.appendChild(el('div', { class: 'plot-label', text: ps.def.name.replace(' Berry', '') }));
        const bar = el('div', { class: 'grow-bar' }, el('div', {
          class: 'grow-fill', style: { width: (ps.ratio * 100) + '%', background: ps.def.color },
        }));
        cell.appendChild(bar);
        if (ps.status === 'ready') {
          cell.classList.add('ready');
          cell.appendChild(el('button', { class: 'btn primary sm', onclick: (e) => { e.stopPropagation(); harvest(i); } }, 'Harvest'));
        } else {
          const remain = Math.max(0, ps.def.growMs - (DW.state.now() - plot.plantedAt));
          cell.appendChild(el('div', { class: 'plot-timer', text: Math.ceil(remain / 1000) + 's' }));
        }
      }
      plots.appendChild(cell);
    });
    wrap.appendChild(plots);

    // Berry pouch.
    const pouch = el('div', { class: 'card soft' });
    pouch.appendChild(el('h3', {}, '🎒 Berry Pouch'));
    const inv = st.garden.inventory;
    const keys = Object.keys(DW.data.BERRIES).filter((k) => inv[k] > 0);
    if (!keys.length) {
      pouch.appendChild(el('p', { class: 'muted' }, 'No berries yet. Plant a seed to get started — your first seed of each kind costs 4 Dream Points.'));
    } else {
      const list = el('div', { class: 'pouch-list' });
      keys.forEach((k) => {
        list.appendChild(el('div', { class: 'pouch-item' }, [
          el('span', { class: 'pouch-emoji' }, DW.data.BERRIES[k].emoji),
          el('span', {}, DW.data.BERRIES[k].name.replace(' Berry', '')),
          el('span', { class: 'pouch-count' }, '×' + inv[k]),
        ]));
      });
      pouch.appendChild(list);
    }
    wrap.appendChild(pouch);
    mount.appendChild(wrap);

    ensureTicking();
  }

  function openSeedPicker(index) {
    const st = DW.state.get();
    const inv = st.garden.inventory;
    const options = el('div', { class: 'seed-grid' });
    Object.keys(DW.data.BERRIES).forEach((k) => {
      const def = DW.data.BERRIES[k];
      const have = inv[k] || 0;
      const opt = el('button', { class: 'seed-opt', onclick: () => { m.close(); plant(index, k); } }, [
        el('span', { class: 'seed-emoji' }, def.emoji),
        el('span', { class: 'seed-name' }, def.name.replace(' Berry', '')),
        el('span', { class: 'seed-time' }, Math.round(def.growMs / 1000) + 's • +' + def.points + 'pt'),
        el('span', { class: 'seed-have' }, have > 0 ? 'have ×' + have : 'seed: 4pt'),
      ]);
      options.appendChild(opt);
    });
    const m = DW.ui.modal(options, { title: '🌱 Choose a berry to plant' });
  }

  // Re-render growth bars periodically while the garden is visible.
  function ensureTicking() {
    if (tickTimer) return;
    tickTimer = setInterval(() => {
      if (DW.main.currentView() !== 'garden' || !currentMount || !document.body.contains(currentMount)) {
        clearInterval(tickTimer); tickTimer = null; return;
      }
      render(currentMount);
    }, 1000);
  }

  DW.garden = { render };
})();

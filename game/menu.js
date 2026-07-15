/* menu.js — field menus: pause, party, bag, shop, fly, trainer card, save,
 * and the Entralink entry point. Built on G.gui primitives. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  const P = () => G.game.player;

  const TOWN_NAMES = {
    nuvema: 'Nuvema Town', striaton: 'Striaton City', nacrene: 'Nacrene City',
    castelia: 'Castelia City', opelucid: 'Opelucid City',
  };

  async function openPause() {
    const p = P();
    const items = [
      { label: '📕 Pokémon', value: 'party' },
      { label: '🎒 Bag', value: 'bag' },
    ];
    if (G.party.hasHM(p, 'fly')) items.push({ label: '🕊 Fly', value: 'fly' });
    items.push({ label: '↔ Entralink', value: 'entralink' });
    items.push({ label: '🧑 ' + p.name, value: 'card' });
    items.push({ label: '💾 Save', value: 'save' });
    items.push({ label: '✖ Close', value: 'close' });
    const v = await G.gui.choice(items, { title: 'MENU', layerClass: 'pause-menu', cancelValue: 'close' });
    if (v === 'party') await openParty();
    else if (v === 'bag') await openBag();
    else if (v === 'fly') await openFly();
    else if (v === 'entralink') await G.entralink.open();
    else if (v === 'card') await openCard();
    else if (v === 'save') { G.save.save(p); G.gui.toast('Game saved!', { kind: 'good' }); }
  }

  async function openParty() {
    const p = P();
    while (true) {
      const items = p.party.map((m, i) => ({
        label: (m.shiny ? '✦ ' : '') + G.party.displayName(m),
        value: i, hint: 'Lv' + m.level + '  ' + m.hp + '/' + m.stats.maxHp,
      }));
      items.push({ label: '‹ Back', value: -1 });
      const v = await G.gui.choice(items, { title: 'PARTY', layerClass: 'party-menu', cancelValue: -1 });
      if (v === -1 || v == null) break;
      await showSummary(p.party[v]);
    }
  }

  function showSummary(mon) {
    const s = G.species(mon.species);
    const el = G.gui.el;
    const body = el('div', { class: 'summary' }, [
      el('div', { class: 'sum-head' }, [
        el('div', { class: 'sum-sprite' }, G.sprites.monImg(mon, 96)),
        el('div', {}, [
          el('div', { class: 'sum-name' }, (mon.nickname || mon.species) + (mon.shiny ? ' ✦' : '')),
          el('div', { class: 'sum-sub' }, 'No.' + String(mon.dex).padStart(3, '0') + '  ' + mon.species + '  Lv' + mon.level),
          el('div', { class: 'sum-types' }, mon.types.map((t) => el('span', { class: 'type-pill', style: 'background:' + G.TYPE_COLOR[t] }, t.toUpperCase()))),
          el('div', { class: 'sum-ability' }, 'Ability: ' + mon.ability),
        ]),
      ]),
      el('div', { class: 'sum-stats' }, [
        stat('HP', mon.hp + '/' + mon.stats.maxHp), stat('Attack', mon.stats.atk), stat('Defense', mon.stats.def),
        stat('Sp.Atk', mon.stats.spa), stat('Sp.Def', mon.stats.spd), stat('Speed', mon.stats.spe),
      ]),
      el('div', { class: 'sum-moves' }, mon.moves.map((mv) => {
        const m = G.move(mv.key);
        return el('div', { class: 'sum-move' }, [
          el('span', { class: 'type-pill sm', style: 'background:' + G.TYPE_COLOR[m.type] }, m.type.slice(0, 3).toUpperCase()),
          el('span', { class: 'sm-name' }, m.name),
          el('span', { class: 'sm-pp' }, 'PP ' + mv.pp + '/' + mv.ppMax),
        ]);
      })),
      el('div', { class: 'sum-hint' }, 'Press B to go back'),
    ]);
    function stat(label, val) { return el('div', { class: 'st-row' }, [el('span', {}, label), el('b', {}, String(val))]); }
    return new Promise((resolve) => {
      const layer = el('div', { class: 'ui-layer summary-layer' }, body);
      (document.getElementById('game-ui') || document.body).appendChild(layer);
      const off = G.input.on('press', (b) => { if (b === 'b' || b === 'a') { off(); layer.remove(); resolve(); } });
      layer.addEventListener('click', () => { off(); layer.remove(); resolve(); });
    });
  }

  async function openBag() {
    const p = P();
    while (true) {
      const keys = Object.keys(p.bag).filter((k) => p.bag[k] > 0);
      if (!keys.length) { await G.gui.dialogue(['Your Bag is empty.']); return; }
      const items = keys.map((k) => ({ label: G.ITEMS[k].name, value: k, hint: '×' + p.bag[k] }));
      items.push({ label: '‹ Back', value: -1 });
      const v = await G.gui.choice(items, { title: 'BAG', layerClass: 'bag-menu', cancelValue: -1 });
      if (v === -1 || v == null) break;
      const it = G.ITEMS[v];
      if (it.kind === 'ball') { await G.gui.dialogue([it.name + ': ' + it.desc, 'Use it in battle to catch wild Pokémon.']); continue; }
      // heal / revive / cure — choose a target
      const t = await G.gui.choice(p.party.map((m, i) => ({
        label: G.party.displayName(m), value: i, hint: m.hp + '/' + m.stats.maxHp + (m.status ? ' ' + m.status : ''),
        disabled: it.kind === 'revive' ? m.hp > 0 : (it.kind === 'heal' ? m.hp >= m.stats.maxHp && m.hp > 0 : !m.status),
      })).concat([{ label: '‹ Cancel', value: -1 }]), { title: 'Use ' + it.name + ' on…', layerClass: 'bag-menu', cancelValue: -1 });
      if (t === -1 || t == null) continue;
      const mon = p.party[t];
      if (it.kind === 'heal') { const before = mon.hp; mon.hp = Math.min(mon.stats.maxHp, mon.hp + it.amount); if (it.cure) { mon.status = null; mon.statusCounter = 0; } p.bag[v]--; if (G.audio) G.audio.play('heal'); await G.gui.dialogue([G.party.displayName(mon) + ' recovered ' + (mon.hp - before) + ' HP!']); }
      else if (it.kind === 'revive') { mon.hp = Math.max(1, Math.floor(mon.stats.maxHp * it.amount)); mon.status = null; p.bag[v]--; if (G.audio) G.audio.play('heal'); await G.gui.dialogue([G.party.displayName(mon) + ' was revived!']); }
      else if (it.kind === 'cure') { if (it.status.indexOf(mon.status) >= 0) { mon.status = null; mon.statusCounter = 0; p.bag[v]--; await G.gui.dialogue([G.party.displayName(mon) + ' was cured!']); } }
      G.save.save(p); G.game.updateHud && G.game.updateHud();
    }
  }

  async function openShop(npc) {
    const p = P();
    while (true) {
      const items = (npc.stock || []).map((k) => ({ label: G.ITEMS[k].name, value: k, hint: '¥' + G.ITEMS[k].price }));
      items.push({ label: '‹ Leave', value: -1 });
      const v = await G.gui.choice(items, { title: 'SHOP   ¥' + p.money, layerClass: 'shop-menu', cancelValue: -1 });
      if (v === -1 || v == null) break;
      const it = G.ITEMS[v];
      const qty = await G.gui.choice([1, 2, 5, 10].map((n) => ({ label: 'Buy ' + n + '  (¥' + it.price * n + ')', value: n, disabled: it.price * n > p.money })).concat([{ label: '‹ Cancel', value: 0 }]), { title: it.name, layerClass: 'shop-menu', cancelValue: 0 });
      if (!qty) continue;
      if (it.price * qty > p.money) { await G.gui.dialogue(['You don\'t have enough money.']); continue; }
      p.money -= it.price * qty; p.bag[v] = (p.bag[v] || 0) + qty; if (G.audio) G.audio.play('coin');
      await G.gui.dialogue(['Bought ' + qty + '× ' + it.name + '!']);
      G.save.save(p); G.game.updateHud && G.game.updateHud();
    }
  }

  async function openFly() {
    const p = P();
    const towns = p.visitedTowns.filter((t) => TOWN_NAMES[t] && t !== p.map);
    if (!towns.length) { await G.gui.dialogue(['Nowhere new to fly to right now.']); return; }
    const v = await G.gui.choice(towns.map((t) => ({ label: TOWN_NAMES[t], value: t })).concat([{ label: '‹ Cancel', value: -1 }]), { title: 'Fly where?', layerClass: 'fly-menu', cancelValue: -1 });
    if (v === -1 || v == null) return;
    if (G.audio) G.audio.play('hm');
    await G.world.flyTo(v);
  }

  async function openCard() {
    const p = P();
    const dex = Object.keys(p.pokedex).length;
    const own = Object.values(p.pokedex).filter((v) => v === 'own').length;
    await G.gui.dialogue([
      'TRAINER CARD',
      'Name: ' + p.name + (p.champion ? '  ★CHAMPION' : ''),
      'Badges: ' + p.badges.length + '/4   Money: ¥' + p.money,
      'Pokédex: ' + own + ' owned, ' + dex + ' seen',
      'HMs: ' + (p.hms.length ? p.hms.join(', ') : 'none yet'),
    ]);
  }

  G.menu = { openPause, openParty, openBag, openShop, openFly, openCard };
})();

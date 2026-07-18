// Shellfire Isles — overworld engine + adventure state. Original code and content.

import { SPECIES, MOVES, ITEMS, BADGES, STARTING_PARTY, FIELD_MOVE_INFO } from './data.js';
import * as E from './engine.js';
import { MAPS, WALK, SURFABLE, FLY_TOWNS, START } from './maps.js';
import { getTile, monCanvas, charCanvas, PLAYER_PAL, NPC_PALS, TILE } from './art.js';
import { BattleScreen } from './battle.js';

const SAVE_KEY = 'shellfire-save-v1';
const VIEW_W = 15, VIEW_H = 10; // tiles on screen

const $ = s => document.querySelector(s);

// ---------- state ----------
let save = null;          // { name, map, x, y, dir, money, badges, bag, flags{}, visited[], surfing }
let party = [];           // live mon objects
let box = [];             // storage
let mapId, map;
let moving = false, animStep = 0, frame = 0;
let uiOpen = false;
let battleScreen;

function newSave() {
  return {
    name: 'Riley', map: START.map, x: START.x, y: START.y, dir: START.dir,
    money: 5000, badges: 6, bag: { potion:5, superpotion:5, hyperpotion:2, cureall:3, revive:2, orb:10, greatorb:10, ultraorb:3 },
    flags: {}, visited: ['cinderport'], surfing: false, champion: false,
  };
}

function persist() {
  const data = {
    save,
    party: party.map(m => ({ ...E.serializeMon(m), hp: m.hp, xp: m.xp, status: m.status })),
    box: box.map(m => E.serializeMon(m)),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    save = { ...newSave(), ...data.save };
    party = data.party.map(d => {
      const m = E.reviveMonFrom(d);
      m.xp = Math.max(m.xp, d.xp || m.xp);
      while (m.level < 100 && m.xp >= E.xpForLevel(m.level + 1)) m.level++;
      m.stats = E.calcStats(SPECIES[m.sp].base, m.level);
      m.hp = Math.min(d.hp ?? m.stats.hp, m.stats.hp);
      m.status = d.status || null;
      return m;
    });
    box = (data.box || []).map(E.reviveMonFrom);
    return true;
  } catch { return false; }
}

function freshStart() {
  save = newSave();
  party = STARTING_PARTY.map(({ sp, lv }) => E.makeMon(sp, lv));
  box = [];
  persist();
}

// ---------- map helpers ----------
function setMap(id, x, y) {
  mapId = id; map = MAPS[id];
  save.map = id; save.x = x; save.y = y;
  if (map.town && !save.visited.includes(id)) save.visited.push(id);
  if (!map.kind || map.kind !== 'cave') save.flashOn = false;
  toast(map.name);
}

function tileAt(x, y) {
  if (y < 0 || y >= map.grid.length || x < 0 || x >= map.grid[0].length) return 'M';
  return map.grid[y][x];
}
function setTileChar(x, y, ch) {
  const row = map.grid[y];
  map.grid[y] = row.slice(0, x) + ch + row.slice(x + 1);
}

function npcAt(x, y) {
  return map.npcs.find(n => n.x === x && n.y === y && !(n.trainer && save.flags[n.trainer.flag + '_gone']));
}
function itemAt(x, y) {
  return (map.items || []).find(it => it.x === x && it.y === y && !save.flags[it.flag]);
}

function walkable(x, y) {
  const t = tileAt(x, y);
  if (npcAt(x, y)) return false;
  if (itemAt(x, y)) return false;
  if (save.surfing) return SURFABLE.has(t) || WALK.has(t) || t === '~';
  return WALK.has(t);
}

function partyHasField(field) {
  for (const m of party) for (const s of m.moves) {
    const mv = MOVES[s.id];
    if (mv.field === field) return m;
  }
  return null;
}

// ---------- movement & interaction ----------
const DIRS = { up:[0,-1], down:[0,1], left:[-1,0], right:[1,0] };

function tryMove(dir) {
  if (moving || uiOpen) return;
  save.dir = dir;
  const [dx, dy] = DIRS[dir];
  const nx = save.x + dx, ny = save.y + dy;
  const t = tileAt(nx, ny);

  // map edge transitions
  if (ny < 0 && map.edges?.top) return edgeWarp('top');
  if (ny >= map.grid.length && map.edges?.bottom) return edgeWarp('bottom');

  // gate check (victory road)
  if (map.gate && !save.flags.gateOpen && nx === map.gate.x && ny <= 7 && save.badges < map.gate.badgeCount) {
    return dialog([map.gate.msg]);
  }

  // doors and mats warp — check before walkability, since door tiles aren't walkable
  const warp = map.warps.find(w => w.x === nx && w.y === ny);
  if (warp) return warpTo(warp.to, warp.tx, warp.ty);

  // secret grove exit fall — before the generic waterfall handler below
  if (map.fallExit && nx === map.fallExit.x && ny === map.fallExit.y) {
    ask('Ride the falls back down?', () => { warpTo(map.fallExit.to, map.fallExit.tx, map.fallExit.ty); });
    return;
  }

  // stepping into water => need surf
  if (SURFABLE.has(t) && !save.surfing) {
    const m = partyHasField('surf');
    if (m) {
      ask(`The water is calm. Use ${m.nick}'s Surf?`, () => {
        save.surfing = true;
        stepTo(nx, ny);
      });
    } else toast('The water is deep. A creature with Surf could cross it.');
    return;
  }
  // waterfall climb
  if (t === '~') {
    if (!save.surfing) { toast('A waterfall roars above the water.'); return; }
    const m = partyHasField('waterfall');
    const wf = map.waterfallWarp;
    if (m && wf && nx === wf.x && ny === wf.y) {
      ask(`Climb the falls with ${m.nick}'s Waterfall?`, () => {
        warpTo(wf.to, wf.tx, wf.ty);
        save.surfing = false;
      });
    } else if (!m) toast('The falls are too strong. Waterfall could climb them.');
    return;
  }
  if (!walkable(nx, ny)) return;

  stepTo(nx, ny);
}

function stepTo(nx, ny) {
  moving = true;
  save.x = nx; save.y = ny;
  // hop off the water when landing on a shore tile
  if (save.surfing && !SURFABLE.has(tileAt(nx, ny)) && tileAt(nx, ny) !== '~') save.surfing = false;
  animStep++;
  setTimeout(() => {
    moving = false;
    afterStep();
  }, 140);
}

function edgeWarp(edge) {
  const e = map.edges[edge];
  if (!e) return;
  const dest = MAPS[e.to];
  const x = e.align;
  const y = edge === 'top' ? undefined : undefined;
  if (edge === 'top') warpTo(e.to, x, dest.grid.length - 2, 'up');
  else warpTo(e.to, x, 1, 'down');
}

function warpTo(id, x, y, dir) {
  save.surfing = false;
  setMap(id, x, y);
  if (dir) save.dir = dir;
  persist();
}

function afterStep() {
  const t = tileAt(save.x, save.y);
  // wild encounters
  const enc = map.encounters;
  let table = null;
  if (enc) {
    if (t === 'T' && enc.grass) table = enc.grass;
    else if (t === 'c' && enc.cave) table = enc.cave;
    else if (save.surfing && enc.water) table = enc.water;
  }
  if (table && Math.random() < 0.12) return startWild(table);
  persist();
}

function startWild(table) {
  // weighted pick: optional third entry = weight (default evenly split remainder)
  const weighted = [];
  for (const row of table) {
    const [sp, range, w] = row;
    weighted.push({ sp, range, w: w ?? (1 - table.filter(r => r[2]).reduce((s, r) => s + r[2], 0)) / table.filter(r => !r[2]).length });
  }
  let roll = Math.random(), pick = weighted[0];
  for (const w of weighted) { if (roll < w.w) { pick = w; break; } roll -= w.w; }
  const lv = pick.range[0] + Math.floor(Math.random() * (pick.range[1] - pick.range[0] + 1));
  const wild = E.makeMon(pick.sp, lv);
  enterBattle({ wild }, res => {
    if (res.caught) {
      if (party.length < 6) { party.push(res.caught); toast(`${res.caught.nick} joined your team!`); }
      else { box.push(res.caught); toast(`${res.caught.nick} was sent to storage.`); }
    }
    if (!res.won && !res.fled && !res.caught) blackout();
  });
}

function interact() {
  if (uiOpen || moving) return;
  const [dx, dy] = DIRS[save.dir];
  const tx = save.x + dx, ty = save.y + dy;
  const t = tileAt(tx, ty);

  const npc = npcAt(tx, ty);
  if (npc) return talkTo(npc);

  const item = itemAt(tx, ty);
  if (item) {
    save.flags[item.flag] = true;
    save.bag[item.item] = (save.bag[item.item] || 0) + item.qty;
    persist();
    return dialog([`You found ${item.qty} × ${ITEMS[item.item].n}!`]);
  }

  const sign = (map.signs || []).find(s => s.x === tx && s.y === ty);
  if (sign) return dialog(sign.text.split('\n'));

  if (map.storage && map.storage.x === tx && map.storage.y === ty) return openStorage();

  // field-move obstacles
  if (t === 'C') {
    const m = partyHasField('cut');
    if (m) return ask(`This tree looks like it can be cut. Use ${m.nick}'s Cut?`, () => { setTileChar(tx, ty, 'G'); toast(`${m.nick} chopped the tree down!`); });
    return dialog(['A slim tree blocks the way. A creature with Cut could fell it.']);
  }
  if (t === 'B') {
    const m = partyHasField('strength');
    if (m) {
      const bx = tx + dx, by = ty + dy;
      if (WALK.has(tileAt(bx, by)) && !npcAt(bx, by)) {
        return ask(`A huge boulder. Use ${m.nick}'s Strength?`, () => {
          setTileChar(tx, ty, map.kind === 'cave' ? 'c' : 'P');
          setTileChar(bx, by, 'B');
          toast(`${m.nick} shoved the boulder!`);
        });
      }
      return dialog(["The boulder won't budge that way."]);
    }
    return dialog(['A huge boulder. Strength could move it.']);
  }
  if (t === 'K') {
    const m = partyHasField('rocksmash');
    if (m) return ask(`A cracked rock. Use ${m.nick}'s Rock Smash?`, () => { setTileChar(tx, ty, map.kind === 'cave' ? 'c' : 'P'); toast(`${m.nick} smashed the rock!`); });
    return dialog(['The rock is cracked all over. Rock Smash could shatter it.']);
  }
  if (t === '~' ) {
    return dialog(['The waterfall thunders down.']);
  }
}

function talkTo(npc) {
  // face the player
  if (npc.trainer && !save.flags[npc.trainer.flag]) {
    return dialog([npc.trainer.intro], () => startTrainerBattle(npc));
  }
  if (npc.healer) {
    return dialog(['Welcome to the Rest House! Let me patch your team up...'], () => {
      party.forEach(E.healMon);
      persist();
      dialog(['Your team is fighting fit! Come back any time.']);
    });
  }
  if (npc.shop) return openShop(npc.shop);
  if (npc.hubTerminal) {
    return dialog([
      'This terminal links every island — and the world beyond.',
      'Open the ISLAND LINK in a browser tab to trade and battle with friends: press ENTER, or visit /hub on this server.',
    ], () => { window.open('hub.html', '_blank'); });
  }
  const lines = npc.trainer && save.flags[npc.trainer.flag]
    ? [npc.trainer.after || '...']
    : npc.lines;
  dialog(lines.length ? lines : ['...']);
}

function startTrainerBattle(npc) {
  const tr = npc.trainer;
  const mons = tr.team.map(([sp, lv]) => E.makeMon(sp, lv));
  enterBattle({ trainer: { name: npc.name, mons, reward: tr.reward, intro: null, winText: tr.win } }, res => {
    if (res.won) {
      save.flags[tr.flag] = true;
      save.money += tr.reward;
      if (npc.gymLeader) {
        save.badges = Math.max(save.badges, npc.gymLeader);
        dialog([`You received the ${BADGES[npc.gymLeader - 1].n}!`, tr.after || '']);
      } else if (npc.champion) {
        save.champion = true;
        dialog(['You are the new CHAMPION of the Shellfire Isles!', tr.after || '']);
      }
      persist();
    } else if (!res.fled) blackout();
  });
}

function blackout() {
  party.forEach(E.healMon);
  save.money = Math.max(0, save.money - 500);
  const town = save.visited[save.visited.length - 1] || 'cinderport';
  warpTo(town, MAPS[town].id === 'cinderport' ? 10 : 11, 8, 'down');
  dialog(['You rushed your team to the nearest Rest House...', 'Everyone is patched up. Take it steady out there.']);
}

function enterBattle(opts, cb) {
  uiOpen = true;
  battleScreen.start(opts, { party, bag: save.bag, save }, res => {
    uiOpen = false;
    persist();
    cb(res);
  });
}

// ---------- dialog / ui plumbing ----------
let dialogQueue = null;
function dialog(lines, done) {
  uiOpen = true;
  dialogQueue = { lines: lines.filter(Boolean).slice(), done };
  advanceDialog(true);
}
function advanceDialog(first = false) {
  const dq = dialogQueue;
  if (!dq) return;
  if (!first && dq.lines.length === 0) {
    dialogQueue = null;
    $('#dialog').style.display = 'none';
    uiOpen = false;
    dq.done && dq.done();
    return;
  }
  const line = dq.lines.shift();
  if (line === undefined) { dialogQueue = null; $('#dialog').style.display = 'none'; uiOpen = false; dq.done && dq.done(); return; }
  const el = $('#dialog');
  el.style.display = 'block';
  el.textContent = line;
}

function ask(q, yes, no) {
  uiOpen = true;
  const el = $('#ask');
  el.style.display = 'flex';
  $('#askText').textContent = q;
  $('#askYes').onclick = () => { el.style.display = 'none'; uiOpen = false; yes && yes(); };
  $('#askNo').onclick = () => { el.style.display = 'none'; uiOpen = false; no && no(); };
}

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 1600);
}

// ---------- menu ----------
function openMenu() {
  if (uiOpen) return;
  uiOpen = true;
  const el = $('#menu');
  el.style.display = 'block';
  el.innerHTML = `
    <div class="menu-title">MENU</div>
    <button data-m="team">TEAM</button>
    <button data-m="bag">BAG</button>
    <button data-m="badges">BADGES</button>
    <button data-m="save">SAVE</button>
    <button data-m="link">ISLAND LINK</button>
    <button data-m="close">CLOSE</button>`;
  el.querySelectorAll('button').forEach(b => b.onclick = () => {
    const m = b.dataset.m;
    closeMenu();
    if (m === 'team') openTeam();
    if (m === 'bag') openBag();
    if (m === 'badges') openBadges();
    if (m === 'save') { persist(); toast('Game saved!'); }
    if (m === 'link') window.open('hub.html', '_blank');
  });
}
function closeMenu() { $('#menu').style.display = 'none'; uiOpen = false; }

function panel(html) {
  uiOpen = true;
  const el = $('#panel');
  el.style.display = 'block';
  el.innerHTML = html + '<button class="panel-close" id="panelClose">CLOSE</button>';
  $('#panelClose').onclick = closePanel;
  return el;
}
function closePanel() { $('#panel').style.display = 'none'; uiOpen = false; }

function monRow(m, extra = '') {
  const cv = monCanvas(m.sp, false, 1);
  return `<div class="mon-row">
    <img src="${cv.toDataURL()}" width="32" height="32" alt="">
    <div class="mon-info">
      <b>${m.nick}</b> <span>Lv${m.level} ${SPECIES[m.sp].t.join('/')}</span>
      <div class="mini-hp"><div style="width:${Math.max(0, m.hp / m.stats.hp * 100)}%"></div></div>
      <small>HP ${m.hp}/${m.stats.hp}${m.status ? ' · ' + m.status.toUpperCase() : ''}</small>
    </div>${extra}</div>`;
}

function openTeam() {
  const rows = party.map((m, i) => {
    const fields = m.moves.map(s => MOVES[s.id].field).filter(Boolean);
    const fieldBtns = fields.map(f => `<button class="chip" data-f="${f}" data-i="${i}">${f.toUpperCase()}</button>`).join('');
    return monRow(m, `<div class="mon-actions">${fieldBtns}<button class="chip" data-d="${i}">INFO</button></div>`);
  }).join('');
  const el = panel(`<div class="menu-title">TEAM</div>${rows}`);
  el.querySelectorAll('[data-f]').forEach(b => b.onclick = () => useFieldMove(b.dataset.f, party[b.dataset.i]));
  el.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const m = party[b.dataset.d];
    const sp = SPECIES[m.sp];
    closePanel();
    panel(`<div class="menu-title">${m.nick}</div>
      <img src="${monCanvas(m.sp, false, 3).toDataURL()}" width="96" height="96" style="image-rendering:pixelated" alt="">
      <p><b>${sp.n}</b> · ${sp.t.join('/')} · Lv${m.level}</p>
      <p class="dex">${sp.dex}</p>
      <p>HP ${m.hp}/${m.stats.hp} · ATK ${m.stats.atk} · DEF ${m.stats.def}<br>
      SP.A ${m.stats.spa} · SP.D ${m.stats.spd} · SPE ${m.stats.spe}</p>
      <p>${m.moves.map(s => `${MOVES[s.id].n} (${s.pp}/${s.maxPp})`).join('<br>')}</p>`);
  });
}

function useFieldMove(field, m) {
  closePanel();
  if (field === 'fly') {
    const towns = save.visited.filter(t => FLY_TOWNS.includes(t));
    const el = panel(`<div class="menu-title">FLY — where to?</div>` +
      towns.map(t => `<button class="fly-btn" data-t="${t}">${MAPS[t].name}</button>`).join(''));
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      closePanel();
      const t = b.dataset.t;
      warpTo(t, t === 'cinderport' ? 10 : 11, 8, 'down');
      toast(`${m.nick} flew you to ${MAPS[t].name}!`);
    });
    return;
  }
  if (field === 'flash') {
    if (!map.dark) return toast('It is bright enough already.');
    save.flashOn = true;
    toast(`${m.nick} lit up the cave!`);
    return;
  }
  toast(`${FIELD_MOVE_INFO[field]} (Face the obstacle and press the action key.)`);
}

function openBag() {
  const entries = Object.entries(save.bag).filter(([, q]) => q > 0);
  const el = panel(`<div class="menu-title">BAG · $${save.money}</div>` +
    (entries.length ? entries.map(([id, q]) =>
      `<div class="bag-row"><b>${ITEMS[id].n}</b> ×${q}<br><small>${ITEMS[id].desc}</small>
       ${ITEMS[id].kind === 'heal' || ITEMS[id].kind === 'status' || ITEMS[id].kind === 'revive' ? `<button class="chip" data-u="${id}">USE</button>` : ''}</div>`).join('') : '<p>Empty.</p>'));
  el.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
    const id = b.dataset.u; const it = ITEMS[id];
    closePanel();
    const rows = party.map((m, i) => monRow(m, `<button class="chip" data-i="${i}">PICK</button>`)).join('');
    const p2 = panel(`<div class="menu-title">Use ${it.n} on…</div>${rows}`);
    p2.querySelectorAll('[data-i]').forEach(pb => pb.onclick = () => {
      const m = party[pb.dataset.i];
      let ok = false;
      if (it.kind === 'heal' && m.hp > 0 && m.hp < m.stats.hp) { m.hp = Math.min(m.stats.hp, m.hp + it.amt); ok = true; }
      if (it.kind === 'status' && m.status) { m.status = null; ok = true; }
      if (it.kind === 'revive' && m.hp <= 0) { m.hp = Math.floor(m.stats.hp * it.amt); ok = true; }
      closePanel();
      if (ok) { save.bag[id]--; persist(); toast(`Used ${it.n} on ${m.nick}.`); }
      else toast('It would have no effect.');
    });
  });
}

function openBadges() {
  panel(`<div class="menu-title">BADGES · ${save.badges}/8</div>
    <div class="badge-grid">${BADGES.map((b, i) =>
      `<div class="badge ${i < save.badges ? 'got' : ''}" style="--c:${b.c}" title="${b.n}">${i < save.badges ? '★' : '·'}<small>${b.n}</small></div>`).join('')}</div>
    ${save.champion ? '<p>🏆 CHAMPION of the Shellfire Isles</p>' : ''}`);
}

function openShop(stock) {
  const el = panel(`<div class="menu-title">SHOP · You have $${save.money}</div>` +
    stock.map(id => `<div class="bag-row"><b>${ITEMS[id].n}</b> — $${ITEMS[id].price}<br><small>${ITEMS[id].desc}</small>
      <button class="chip" data-b="${id}">BUY</button></div>`).join(''));
  el.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
    const id = b.dataset.b; const it = ITEMS[id];
    if (save.money < it.price) return toast('Not enough money!');
    save.money -= it.price;
    save.bag[id] = (save.bag[id] || 0) + 1;
    persist();
    closePanel(); openShop(stock);
    toast(`Bought a ${it.n}!`);
  });
}

function openStorage() {
  const rows = party.map((m, i) => monRow(m, `<button class="chip" data-p="${i}">STORE</button>`)).join('');
  const boxRows = box.length ? box.map((m, i) => monRow(m, `<button class="chip" data-w="${i}">WITHDRAW</button>`)).join('') : '<p>Storage is empty.</p>';
  const el = panel(`<div class="menu-title">STORAGE</div><h4>Party</h4>${rows}<h4>Box</h4>${boxRows}`);
  el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    if (party.length <= 1) return toast('You need at least one creature with you!');
    box.push(party.splice(b.dataset.p, 1)[0]);
    persist(); closePanel(); openStorage();
  });
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => {
    if (party.length >= 6) return toast('Your party is full!');
    party.push(box.splice(b.dataset.w, 1)[0]);
    persist(); closePanel(); openStorage();
  });
}

// ---------- rendering ----------
let cv, ctx;
function render() {
  frame++;
  const W = cv.width, H = cv.height;
  ctx.imageSmoothingEnabled = false;
  const camX = Math.max(0, Math.min(map.grid[0].length - VIEW_W, save.x - Math.floor(VIEW_W / 2)));
  const camY = Math.max(0, Math.min(map.grid.length - VIEW_H, save.y - Math.floor(VIEW_H / 2)));
  const scale = Math.floor(Math.min(W / (VIEW_W * TILE), H / (VIEW_H * TILE)));
  const ts = TILE * scale;
  const ox = Math.floor((W - VIEW_W * ts) / 2), oy = Math.floor((H - VIEW_H * ts) / 2);
  ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, W, H);
  const water = Math.floor(frame / 30);

  const tileFor = ch => ({
    G:'grass', T:'tall', P:'path', F:'flower', W:'water', '~':'waterfall',
    R:'tree', C:'cuttree', B:'boulder', K:'crackrock', M:'mount', c:'cavefloor', m:'cavewall',
    S:'sand', L:'ledge', '.':'floor', '#':'wall', g:'gymwall', h:'housewall', r:'roof', b:'roofblue',
    D:'door', d:'mat', s:'sign', H:'healer', U:'pc', O:'shop', V:'statue',
  })[ch] || 'grass';

  for (let y = 0; y < VIEW_H; y++) for (let x = 0; x < VIEW_W; x++) {
    const t = tileAt(camX + x, camY + y);
    const name = tileFor(t);
    ctx.drawImage(getTile(name, name === 'water' || name === 'waterfall' ? water : 0), ox + x * ts, oy + y * ts, ts, ts);
  }

  // items as small orbs
  for (const it of map.items || []) {
    if (save.flags[it.flag]) continue;
    if (it.x < camX || it.x >= camX + VIEW_W || it.y < camY || it.y >= camY + VIEW_H) continue;
    const px = ox + (it.x - camX) * ts, py = oy + (it.y - camY) * ts;
    ctx.fillStyle = '#c94a4a'; ctx.beginPath(); ctx.arc(px + ts / 2, py + ts / 2, ts / 5, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(px + ts / 2 - ts / 5, py + ts / 2 - 1 * scale, ts * 2 / 5, 2 * scale);
  }

  // npcs
  for (const n of map.npcs) {
    if (n.trainer && save.flags[n.trainer.flag + '_gone']) continue;
    if (n.x < camX - 1 || n.x > camX + VIEW_W || n.y < camY - 1 || n.y > camY + VIEW_H) continue;
    const spr = charCanvas(NPC_PALS[n.pal] || NPC_PALS.kid, n.dir || 'down', 0, scale);
    ctx.drawImage(spr, ox + (n.x - camX) * ts, oy + (n.y - camY) * ts - 4 * scale);
  }

  // player
  const pspr = charCanvas(PLAYER_PAL, save.dir, moving ? animStep : 0, scale);
  const px = ox + (save.x - camX) * ts, py = oy + (save.y - camY) * ts - 4 * scale;
  if (save.surfing) {
    ctx.fillStyle = '#2a5a8f';
    ctx.beginPath(); ctx.ellipse(px + ts / 2, py + ts * 1.05, ts / 2, ts / 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a8ac9';
    ctx.beginPath(); ctx.ellipse(px + ts / 2, py + ts, ts / 2.4, ts / 5, 0, 0, 7); ctx.fill();
  }
  ctx.drawImage(pspr, px, py);

  // darkness
  if (map.dark && !save.flashOn) {
    ctx.save();
    ctx.fillStyle = 'rgba(4,4,10,0.93)';
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    const cx = px + ts / 2, cyy = py + ts / 2;
    ctx.arc(cx, cyy, ts * 1.8, 0, 7, true);
    ctx.fill('evenodd');
    ctx.restore();
  }

  // HUD
  ctx.fillStyle = 'rgba(16,16,24,0.75)';
  ctx.fillRect(0, 0, W, 22);
  ctx.fillStyle = '#f0ead8';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`${map.name}  ·  $${save.money}  ·  Badges ${save.badges}/8${save.champion ? ' 🏆' : ''}`, 8, 15);

  requestAnimationFrame(render);
}

// ---------- input ----------
const held = new Set();
function bindInput() {
  addEventListener('keydown', e => {
    const k = e.key;
    if (uiOpen) {
      if (dialogQueue && (k === 'Enter' || k === ' ' || k === 'z')) { e.preventDefault(); advanceDialog(); }
      if (k === 'Escape') { closeMenu(); closePanel(); }
      return;
    }
    if (k === 'ArrowUp' || k === 'w') { held.add('up'); tryMove('up'); }
    else if (k === 'ArrowDown' || k === 's') { held.add('down'); tryMove('down'); }
    else if (k === 'ArrowLeft' || k === 'a') { held.add('left'); tryMove('left'); }
    else if (k === 'ArrowRight' || k === 'd') { held.add('right'); tryMove('right'); }
    else if (k === 'Enter' || k === ' ' || k === 'z') { e.preventDefault(); interact(); }
    else if (k === 'Escape' || k === 'x') openMenu();
  });
  addEventListener('keyup', e => {
    const m = { ArrowUp:'up', w:'up', ArrowDown:'down', s:'down', ArrowLeft:'left', a:'left', ArrowRight:'right', d:'right' }[e.key];
    if (m) held.delete(m);
  });
  setInterval(() => {
    if (!moving && !uiOpen && held.size) tryMove([...held][held.size - 1]);
  }, 60);

  // touch controls
  document.querySelectorAll('[data-pad]').forEach(b => {
    const dir = b.dataset.pad;
    let iv;
    const start = ev => { ev.preventDefault(); if (dir === 'a') return interact(); if (dir === 'menu') return openMenu(); tryMove(dir); iv = setInterval(() => tryMove(dir), 160); };
    const stop = () => clearInterval(iv);
    b.addEventListener('touchstart', start); b.addEventListener('touchend', stop);
    b.addEventListener('mousedown', start); b.addEventListener('mouseup', stop);
  });
  $('#dialog').addEventListener('click', () => advanceDialog());
}

// ---------- boot ----------
export function boot() {
  cv = $('#world'); ctx = cv.getContext('2d');
  battleScreen = new BattleScreen($('#battleRoot'));
  const had = loadSave();
  if (!had) freshStart();
  setMap(save.map in MAPS ? save.map : START.map, save.x, save.y);
  bindInput();
  render();
  if (!had) {
    dialog([
      'SHELLFIRE ISLES',
      'Six badges shine in your case. Two remain: PYRA of Cinderport, TERRA of Verdantia... and then, the Champion.',
      'Your team of six is ready — Surf, Fly, Cut, Strength, Flash, Rock Smash and Waterfall are all at your command.',
      'Arrows/WASD to move · ENTER to interact · ESC for the menu. The Island Link house (blue roof) connects you to friends online!',
    ]);
  }
  // debug hooks for automated testing
  window.__isles = {
    save: () => save, party: () => party, warpTo, startWild, dialog,
    give: (id, q) => { save.bag[id] = (save.bag[id] || 0) + q; },
  };
}

boot();

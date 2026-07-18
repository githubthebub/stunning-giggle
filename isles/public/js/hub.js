// Island Link — multiplayer trade & battle client. Talks to server.js via
// fetch POST (actions) + Server-Sent Events (updates). Original code.

import { SPECIES, MOVES } from './data.js';
import * as E from './engine.js';
import { monCanvas } from './art.js';

const SAVE_KEY = 'shellfire-save-v1';
const $ = s => document.querySelector(s);

let me = null;          // { id, name, room }
let roster = [];        // [{id, name}]
let myTeam = [];        // serialized mons [{sp, nick, level, moves}]
let usingSave = false;
let battle = null;      // { id, foeName, mine:[..], foes:[..], myActive, foeActive, awaiting }
let trade = null;       // { id, partner, mySel, theirSel, meConfirmed, themConfirmed }
let es = null;

// ---------- team sources ----------
function loadAdventureTeam() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.party?.length) return null;
    return data.party.map(d => ({ sp: d.sp, nick: d.nick, level: d.level, moves: d.moves }));
  } catch { return null; }
}

function writeTradeIntoSave(slotIndex, incoming) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data.party?.[slotIndex]) return;
    const m = E.reviveMonFrom(incoming);
    data.party[slotIndex] = { ...E.serializeMon(m), hp: m.stats.hp, xp: m.xp, status: null };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* no save — rental play, nothing to persist */ }
}

function rental() {
  return E.rentalTeam().map(E.serializeMon);
}

// ---------- join ----------
function randCode() { return 'ISLE' + Math.floor(Math.random() * 90 + 10); }

async function join() {
  const name = $('#nameInput').value.trim() || 'Trainer';
  const room = ($('#roomInput').value.trim() || randCode()).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  usingSave = $('#teamSource').value === 'save';
  let team = usingSave ? loadAdventureTeam() : null;
  if (usingSave && !team) {
    usingSave = false;
    note('No adventure save found in this browser — giving you a rental team instead.');
  }
  if (!team) team = rental();
  myTeam = team;

  const res = await fetch('api/join', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room, name, team }),
  });
  const out = await res.json();
  if (!res.ok) { $('#joinErr').textContent = out.error || 'Could not join.'; return; }
  me = { id: out.id, name, room };
  history.replaceState(null, '', '?room=' + room);
  $('#joinCard').classList.add('hidden');
  $('#roomCard').classList.remove('hidden');
  $('#roomCode').textContent = room;
  $('#shareUrl').textContent = location.origin + location.pathname + '?room=' + room;
  $('#teamNote').textContent = usingSave ? '(from your adventure save)' : '(rental team)';
  renderMyTeam();
  listen();
}

function listen() {
  es = new EventSource(`api/events?room=${me.room}&id=${me.id}`);
  es.onmessage = e => handle(JSON.parse(e.data));
  es.onerror = () => note('Connection lost — retrying...');
}

async function act(payload) {
  const res = await fetch('api/act', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: me.room, id: me.id, ...payload }),
  });
  if (!res.ok) {
    const out = await res.json().catch(() => ({}));
    note(out.error || 'Action failed.');
  }
}

// ---------- server events ----------
function handle(ev) {
  switch (ev.t) {
    case 'roster':
      roster = ev.players;
      renderRoster();
      break;
    case 'chat':
      chatLine(`<b>${esc(ev.from)}:</b> ${esc(ev.text)}`);
      break;
    case 'sys':
      chatLine(`<span class="sys">${esc(ev.text)}</span>`);
      break;
    case 'challenged':
      if (confirm(`${ev.from} challenges you to a battle! Accept?`)) act({ type:'accept', target: ev.fromId });
      else act({ type:'decline', target: ev.fromId });
      break;
    case 'battle-start':
      battle = {
        id: ev.battleId, foeName: ev.foeName,
        mine: ev.yourTeam, foes: ev.foeTeam,
        myActive: 0, foeActive: 0, awaiting: false,
      };
      $('#battleCard').classList.remove('hidden');
      $('#battleTitle').textContent = `⚔ ${me.name} vs ${ev.foeName} (level 50 rules)`;
      $('#battleLog').innerHTML = '';
      logLine(`Battle started against ${ev.foeName}!`);
      renderBattle();
      break;
    case 'battle-log':
      for (const line of ev.lines) logLine(line);
      if (ev.state) {
        battle.mine = ev.state.you; battle.foes = ev.state.foe;
        battle.myActive = ev.state.youActive; battle.foeActive = ev.state.foeActive;
      }
      battle.awaiting = false;
      renderBattle(ev.needSwitch);
      break;
    case 'battle-end':
      logLine(ev.youWon ? '🏆 You won the battle!' : `${battle?.foeName || 'Your rival'} wins this one.`);
      battle = null;
      setTimeout(() => $('#battleCard').classList.add('hidden'), 3500);
      break;
    case 'trade-start':
      trade = { id: ev.tradeId, partner: ev.partner, partnerTeam: ev.partnerTeam, mySel: null, theirSel: null, meConfirmed: false, themConfirmed: false };
      $('#tradeCard').classList.remove('hidden');
      $('#tradeTitle').textContent = `⇄ Trade with ${ev.partner}`;
      renderTrade();
      break;
    case 'trade-update':
      if (!trade) break;
      trade.theirSel = ev.partnerSel;
      trade.themConfirmed = ev.partnerConfirmed;
      renderTrade();
      break;
    case 'trade-done': {
      const got = ev.received, gaveIdx = ev.gaveIndex;
      myTeam[gaveIdx] = got;
      if (usingSave) writeTradeIntoSave(gaveIdx, got);
      trade = null;
      $('#tradeCard').classList.add('hidden');
      renderMyTeam();
      note(`Trade complete! ${SPECIES[got.sp]?.n || 'A creature'} is now on your team${usingSave ? ' — and in your adventure save' : ''}.`);
      break;
    }
    case 'trade-cancel':
      trade = null;
      $('#tradeCard').classList.add('hidden');
      note('The trade was cancelled.');
      break;
    case 'error':
      note(ev.text);
      break;
  }
}

// ---------- rendering ----------
function esc(s) { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }
function note(text) { chatLine(`<span class="sys">${esc(text)}</span>`); }
function chatLine(html) {
  const el = $('#chatLog');
  const div = document.createElement('div');
  div.innerHTML = html;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}
function logLine(text) {
  const el = $('#battleLog');
  const div = document.createElement('div');
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function renderRoster() {
  const el = $('#roster');
  el.innerHTML = '';
  for (const p of roster) {
    const chip = document.createElement('div');
    chip.className = 'player-chip';
    chip.innerHTML = `<span>${esc(p.name)}${p.id === me.id ? ' (you)' : ''}</span>`;
    if (p.id !== me.id) {
      const b1 = document.createElement('button'); b1.className = 'primary'; b1.textContent = '⚔ battle';
      b1.onclick = () => { act({ type:'challenge', target: p.id }); note(`Challenge sent to ${p.name}...`); };
      const b2 = document.createElement('button'); b2.className = 'ghost'; b2.textContent = '⇄ trade';
      b2.onclick = () => act({ type:'trade-offer', target: p.id });
      chip.append(b1, b2);
    }
    el.appendChild(chip);
  }
}

function slotHtml(m, small = false) {
  const sp = SPECIES[m.sp];
  const img = monCanvas(m.sp, false, small ? 1 : 2).toDataURL();
  return `<img src="${img}" width="${small ? 32 : 64}" height="${small ? 32 : 64}" alt="">
    <small><b>${esc(m.nick || sp.n)}</b></small><small>Lv${m.level} ${sp.t.join('/')}</small>`;
}

function renderMyTeam() {
  const el = $('#myTeam');
  el.innerHTML = '';
  myTeam.forEach(m => {
    const d = document.createElement('div');
    d.className = 'team-slot';
    d.innerHTML = slotHtml(m);
    el.appendChild(d);
  });
}

function renderBattle(needSwitch = false) {
  if (!battle) return;
  const mine = battle.mine[battle.myActive], foe = battle.foes[battle.foeActive];
  const hpRow = (m, name) => {
    const pct = Math.max(0, Math.round(m.hp / m.maxHp * 100));
    const cls = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'bad';
    return `<div class="hp-row">
      <img src="${monCanvas(m.sp, false, 2).toDataURL()}" width="48" height="48" style="image-rendering:pixelated" alt="">
      <div style="min-width:130px"><b>${esc(m.nick)}</b> <small>Lv${m.level}${m.status ? ' · ' + m.status.toUpperCase() : ''}</small></div>
      <div class="p-hpbar"><div class="p-hpfill ${cls}" style="width:${pct}%"></div></div>
      <small>${m.hp}/${m.maxHp}</small>
    </div>`;
  };
  $('#battleField').innerHTML =
    `<p style="opacity:.7;font-size:.8rem">${esc(battle.foeName)}</p>` + hpRow(foe) +
    `<p style="opacity:.7;font-size:.8rem;margin-top:8px">You</p>` + hpRow(mine);

  const ctrl = $('#battleControls');
  ctrl.innerHTML = '';
  if (battle.awaiting) { ctrl.innerHTML = '<p class="waiting">Waiting for the other trainer...</p>'; return; }

  if (needSwitch || mine.hp <= 0) {
    ctrl.innerHTML = '<p>Choose your next creature:</p>';
    const sw = document.createElement('div'); sw.className = 'pvp-switch';
    battle.mine.forEach((m, i) => {
      if (m.hp <= 0 || i === battle.myActive) return;
      const b = document.createElement('button');
      b.innerHTML = `${esc(m.nick)} <small>${m.hp}/${m.maxHp}</small>`;
      b.onclick = () => { battle.awaiting = true; renderBattle(); act({ type:'action', battleId: battle.id, action:{ type:'switch', to:i } }); };
      sw.appendChild(b);
    });
    ctrl.appendChild(sw);
    return;
  }

  const mv = document.createElement('div'); mv.className = 'pvp-moves';
  mine.moves.forEach((s, i) => {
    const m = MOVES[s.id];
    const b = document.createElement('button');
    b.innerHTML = `${m.n}<small>${m.t} · ${m.cat === 'T' ? 'status' : 'pow ' + m.pow} · PP ${s.pp}</small>`;
    b.disabled = s.pp <= 0;
    b.onclick = () => { battle.awaiting = true; renderBattle(); act({ type:'action', battleId: battle.id, action:{ type:'move', slot:i } }); };
    mv.appendChild(b);
  });
  ctrl.appendChild(mv);
  const sw = document.createElement('div'); sw.className = 'pvp-switch';
  battle.mine.forEach((m, i) => {
    if (m.hp <= 0 || i === battle.myActive) return;
    const b = document.createElement('button');
    b.innerHTML = `→ ${esc(m.nick)} <small>${m.hp}/${m.maxHp}</small>`;
    b.onclick = () => { battle.awaiting = true; renderBattle(); act({ type:'action', battleId: battle.id, action:{ type:'switch', to:i } }); };
    sw.appendChild(b);
  });
  ctrl.appendChild(sw);
}

function renderTrade() {
  if (!trade) return;
  const mineEl = $('#tradeMine'), theirsEl = $('#tradeTheirs');
  mineEl.innerHTML = ''; theirsEl.innerHTML = '';
  myTeam.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'team-slot' + (trade.mySel === i ? ' sel' : '');
    d.innerHTML = slotHtml(m);
    d.onclick = () => {
      if (trade.meConfirmed) return;
      trade.mySel = i;
      act({ type:'trade-select', tradeId: trade.id, index: i });
      renderTrade();
    };
    mineEl.appendChild(d);
  });
  trade.partnerTeam.forEach((m, i) => {
    const d = document.createElement('div');
    d.className = 'team-slot' + (trade.theirSel === i ? ' sel' : '');
    d.innerHTML = slotHtml(m);
    theirsEl.appendChild(d);
  });
  $('#tradeStatus').textContent =
    (trade.mySel === null ? 'Pick one of your creatures. ' : trade.meConfirmed ? 'You confirmed. ' : 'Press confirm when ready. ') +
    (trade.theirSel === null ? `${trade.partner} is still picking.` : trade.themConfirmed ? `${trade.partner} confirmed!` : `${trade.partner} picked — waiting for their confirm.`);
}

// ---------- wire up ----------
$('#joinBtn').onclick = join;
$('#nameInput').addEventListener('keydown', e => e.key === 'Enter' && join());
$('#chatSend').onclick = () => {
  const v = $('#chatInput').value.trim();
  if (!v) return;
  $('#chatInput').value = '';
  act({ type:'chat', text: v });
};
$('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#chatSend').click(); });
$('#copyBtn').onclick = () => navigator.clipboard?.writeText($('#shareUrl').textContent);
$('#tradeConfirm').onclick = () => {
  if (!trade || trade.mySel === null) return note('Pick a creature to offer first.');
  trade.meConfirmed = true;
  act({ type:'trade-confirm', tradeId: trade.id });
  renderTrade();
};
$('#tradeCancel').onclick = () => trade && act({ type:'trade-cancel', tradeId: trade.id });

const params = new URLSearchParams(location.search);
if (params.get('room')) $('#roomInput').value = params.get('room');

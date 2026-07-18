// Shellfire Isles — Island Depot client. Speaks the kernel WebSocket protocol
// (join → action → full-state broadcasts) and renders everything from each
// state message. Original code and content throughout.

import { SPECIES, MOVES } from './data.js';
import { monCanvas } from './art.js';

const SAVE_KEY = 'shellfire-save-v1';
const EMOTES = ['👋', '⚔', '😄', '😱', '🔥', '🐢', '🎉'];
const $ = s => document.querySelector(s);
const esc = s => { const d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; };

// ---------- room + identity ----------
const params = new URLSearchParams(location.search);
let room = (params.get('room') || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16);
if (!room) {
  room = Math.random().toString(36).slice(2, 8);
  params.set('room', room);
  history.replaceState(null, '', location.pathname + '?' + params);
}
$('#roomCode').textContent = room;
$('#shareUrl').textContent = location.href;
$('#copyBtn').onclick = () => { navigator.clipboard?.writeText(location.href); toast('Invite link copied!'); };
$('#globalBtn').onclick = () => { location.search = '?room=GLOBAL'; };

let playerId = sessionStorage.getItem('mp-player-id');
if (!playerId) {
  playerId = 'p-' + Math.random().toString(36).slice(2, 10);
  sessionStorage.setItem('mp-player-id', playerId);
}

// ---------- connection ----------
const base = location.pathname.replace(/\/+$/, '');
const wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + base + '/ws/' + room;
let ws, S = null;                      // S = latest state message
function send(obj) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function act(action) { send({ type: 'action', action }); }
function connect() {
  ws = new WebSocket(wsUrl);
  ws.onopen = () => { $('#err').textContent = ''; send({ type: 'join', playerId }); };
  ws.onclose = () => { $('#waitTitle').textContent = 'Disconnected — retrying…'; screen('waiting'); setTimeout(connect, 1500); };
  ws.onmessage = e => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'error') { $('#err').textContent = msg.error; toast('⚠ ' + msg.error); return; }
    if (msg.type !== 'state') return;
    $('#err').textContent = '';
    S = msg;
    render();
  };
}

// ---------- adventure-save bridge ----------
let joinedWith = sessionStorage.getItem('arena-source-' + room) || null;
function loadAdventureTeam() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!data?.party?.length) return null;
    return data.party.map(d => ({ sp: d.sp, nick: d.nick, moves: d.moves }));
  } catch { return null; }
}
function writeMonToSave(slot, mon, note) {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!data?.party || !SPECIES[mon.sp]) return;
    if (slot < 0 || slot >= data.party.length) slot = 0;
    const level = Math.max(1, data.party[slot]?.level | 0 || 50);
    data.party[slot] = {
      sp: mon.sp, nick: mon.nick, level,
      moves: (mon.moves || []).filter(id => MOVES[id]).slice(0, 4),
      hp: 1, xp: Math.pow(level, 3), status: null,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    toast(`💾 ${SPECIES[mon.sp].n} joined your adventure save (${note}) — heal up at a Rest House!`);
  } catch { /* no save — rental play */ }
}
const appliedKey = 'arena-receipts-' + room;
function applyReceipts(v) {
  let applied = Number(localStorage.getItem(appliedKey) || 0);
  for (const r of v.receipts || []) {
    if (r.seq <= applied) continue;
    applied = r.seq;
    if (joinedWith === 'save') writeMonToSave(r.gaveIndex, r.got, r.note);
    else toast(`⇄ You received ${r.got.nick} (${r.note})!`);
  }
  localStorage.setItem(appliedKey, String(applied));
}

// ---------- generic ui ----------
function screen(id) {
  for (const s of ['waiting', 'picker', 'main']) $('#' + s).classList.toggle('hidden', s !== id);
}
let toastTimers = [];
function toast(text) {
  const bar = $('#toasts');
  const div = document.createElement('div');
  div.textContent = text;
  bar.appendChild(div);
  setTimeout(() => div.remove(), 4200);
}
let activeTab = 'lounge';
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => {
  activeTab = b.dataset.tab;
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('hidden', p.id !== 'tab-' + activeTab));
});
function openModal(html) { const b = $('#modalBox'); delete b.dataset.kind; b.innerHTML = html; $('#modal').classList.add('on'); return b; }
function closeModal() { const b = $('#modalBox'); delete b.dataset.kind; $('#modal').classList.remove('on'); }
$('#modal').addEventListener('click', e => { if (e.target === $('#modal')) closeModal(); });

function monImg(sp, scale = 2) { return `<img src="${monCanvas(sp, false, scale).toDataURL()}" width="${32 * scale / 2}" height="${32 * scale / 2}" style="image-rendering:pixelated" alt="">`; }
function slotDiv(m, { locked = false, sel = false, onclick = null, sub = '' } = {}) {
  const d = document.createElement('div');
  d.className = 'team-slot' + (locked ? ' locked' : '') + (sel ? ' sel' : '') + (onclick ? '' : ' static');
  d.innerHTML = `${monImg(m.sp, 4)}<small><b>${esc(m.nick)}</b></small><small>${SPECIES[m.sp].t.join('/')}</small>${sub ? `<small>${sub}</small>` : ''}`;
  if (onclick && !locked) d.onclick = onclick;
  return d;
}
function pickFromTeam(title, filter, cb) {
  const me = S.view.roster[playerId];
  const box = openModal(`<h3>${title}</h3><div class="pickgrid" id="pg"></div><button class="ghost" id="pcancel">Cancel</button>`);
  me.team.forEach((m, i) => {
    const locked = me.locks[i] || !filter(m, i);
    box.querySelector('#pg').appendChild(slotDiv(m, { locked, onclick: () => { closeModal(); cb(i); } }));
  });
  box.querySelector('#pcancel').onclick = closeModal;
}

// ---------- picker ----------
$('#useSaveBtn').onclick = () => {
  const team = loadAdventureTeam();
  if (!team) { toast('No adventure save in this browser — take a rental!'); return; }
  joinedWith = 'save';
  sessionStorage.setItem('arena-source-' + room, 'save');
  act({ t: 'hello', name: $('#nameInput').value, team });
};
$('#useRentalBtn').onclick = () => {
  joinedWith = 'rental';
  sessionStorage.setItem('arena-source-' + room, 'rental');
  act({ t: 'hello', name: $('#nameInput').value });
};
$('#regearBtn').onclick = () => screen('picker');

// chat
$('#chatSend').onclick = () => {
  const v = $('#chatInput').value.trim();
  if (!v) return;
  $('#chatInput').value = '';
  act({ t: 'chat', text: v });
};
$('#chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('#chatSend').click(); });
const em = $('#emotes');
for (const e of EMOTES) {
  const b = document.createElement('button');
  b.textContent = e;
  b.onclick = () => act({ t: 'chat', text: e });
  em.appendChild(b);
}

// ---------- render ----------
let seenChallenges = new Set(), seenTradeReqs = new Set();

function render() {
  const s = S;
  if (s.status === 'waiting' || !s.view) {
    $('#waitTitle').textContent = 'The island is quiet — invite a friend!';
    screen('waiting');
    return;
  }
  const seated = s.seats.includes(s.you);
  if (!seated) {
    $('#waitTitle').textContent = 'This room is full (8 trainers).';
    $('#waitHint').innerHTML = `Try another room code — e.g. <b>${esc(room)}-2</b> — or watch from here.`;
    screen('waiting');
    return;
  }
  const v = s.view;
  const me = v.roster[s.you];
  if (!me) { screen('picker'); return; }

  applyReceipts(v);

  const myBattle = Object.values(v.battles).find(b => b.order.includes(s.you));
  if (myBattle) { renderBattle(v, myBattle, s); $('#battleOverlay').classList.add('on'); }
  else if (watching && v.battles[watching]) { renderBattle(v, v.battles[watching], s, true); $('#battleOverlay').classList.add('on'); }
  else { watching = null; $('#battleOverlay').classList.remove('on'); }

  screen('main');
  renderPrompts(v, s);
  renderLounge(v, s);
  renderDepot(v, s);
  renderMist(v, s);
  renderRanks(v);
  renderTeam(v, s);
  renderChat(v);
}

function renderPrompts(v, s) {
  // banner area: incoming challenges + trade requests + active trade
  const el = $('#banners');
  el.innerHTML = '';
  for (const c of v.challenges.filter(c => c.to === s.you)) {
    const who = v.roster[c.from]?.name || '???';
    const d = document.createElement('div');
    d.className = 'banner';
    d.innerHTML = `⚔ <b>${esc(who)}</b> challenges you! `;
    const yes = document.createElement('button'); yes.className = 'primary'; yes.textContent = 'Accept — pick your lead';
    yes.onclick = () => pickFromTeam('Choose your lead creature', () => true, lead => act({ t: 'accept', from: c.from, lead }));
    const no = document.createElement('button'); no.className = 'ghost'; no.textContent = 'Decline';
    no.style.marginLeft = '8px';
    no.onclick = () => act({ t: 'decline', from: c.from });
    d.append(yes, no);
    el.appendChild(d);
    const key = c.from + ':' + (v.roster[c.from]?.name || '');
    if (!seenChallenges.has(key)) { seenChallenges.add(key); toast(`⚔ ${who} challenges you!`); }
  }
  for (const r of v.tradeReqs.filter(r => r.to === s.you)) {
    const who = v.roster[r.from]?.name || '???';
    const d = document.createElement('div');
    d.className = 'banner';
    d.innerHTML = `⇄ <b>${esc(who)}</b> wants to trade. `;
    const yes = document.createElement('button'); yes.className = 'primary'; yes.textContent = 'Open trade';
    yes.onclick = () => act({ t: 'trade-accept', from: r.from });
    const no = document.createElement('button'); no.className = 'ghost'; no.textContent = 'Not now';
    no.style.marginLeft = '8px';
    no.onclick = () => act({ t: 'trade-decline', from: r.from });
    d.append(yes, no);
    el.appendChild(d);
  }
  if (v.trade && (v.trade.a === s.you || v.trade.b === s.you)) renderTradeModal(v, s);
  else if ($('#modalBox').dataset.kind === 'trade') closeModal();
}

function renderLounge(v, s) {
  const el = $('#roster');
  el.innerHTML = '';
  for (const pid of v.order) {
    const p = v.roster[pid];
    if (!p) continue;
    const online = (s.connected || []).includes(pid);
    const inBattle = Object.values(v.battles).find(b => b.order.includes(pid));
    const row = document.createElement('div');
    row.className = 'player-row';
    const rec = v.records[pid];
    row.innerHTML = `<span class="dot ${online ? 'on' : ''}"></span>
      <div class="who"><b>${esc(p.name)}</b>${pid === s.you ? ' (you)' : ''}${p.rental ? ' <span class="pill">rental</span>' : ''}
      <small>${inBattle ? '⚔ in battle' : online ? 'online' : 'away — depot deals still work'}${rec ? ` · ${rec.w}W/${rec.l}L` : ''}</small></div>
      <span class="minimons">${p.team.map(m => monImg(m.sp, 2)).join('')}</span>`;
    if (pid !== s.you) {
      const b1 = document.createElement('button'); b1.className = 'primary'; b1.textContent = '⚔ battle';
      b1.disabled = !!inBattle || !!Object.values(v.battles).find(b => b.order.includes(s.you));
      b1.onclick = () => pickFromTeam(`Challenge ${p.name} — choose your lead`, () => true, lead => { act({ t: 'challenge', to: pid, lead }); toast('Challenge sent!'); });
      const b2 = document.createElement('button'); b2.className = 'ghost'; b2.textContent = '⇄ trade';
      b2.onclick = () => { act({ t: 'trade-req', to: pid }); toast(`Trade offer sent to ${p.name}.`); };
      row.append(b1, b2);
      if (inBattle) {
        const b3 = document.createElement('button'); b3.className = 'ghost'; b3.textContent = '👁 watch';
        b3.onclick = () => { watching = inBattle.id; render(); };
        row.append(b3);
      }
    }
    el.appendChild(row);
  }
  const feed = $('#resultsFeed');
  feed.innerHTML = v.results.length ? '<p class="tagline" style="margin-bottom:4px">Recent battles:</p>' +
    v.results.slice().reverse().map(r => `<div style="font-size:.8rem;opacity:.85;padding:2px 0">${esc(r.text)}</div>`).join('') : '';
}

function renderDepot(v, s) {
  const cnt = $('#depotCnt');
  const readyForMe = v.depot.filter(d => d.owner === s.you && d.fulfilled).length;
  cnt.classList.toggle('hidden', readyForMe === 0);
  cnt.textContent = readyForMe;

  $('#depotPutBtn').onclick = () => pickFromTeam('List which creature at the Depot?', () => true, idx => {
    const options = Object.entries(SPECIES).map(([id, sp]) => `<option value="${id}">${sp.n}</option>`).join('');
    const box = openModal(`<h3>Your wish in return?</h3>
      <p class="tagline">The Depot only hands your creature over to someone who offers what you wish for.</p>
      <select id="wishSel" style="padding:8px;border-radius:6px;background:#0e1220;color:var(--ink);border:2px solid var(--panel2)">
        <option value="any">Any creature — surprise me</option>${options}</select>
      <div style="margin-top:12px"><button class="primary" id="wgo">List it 📦</button>
      <button class="ghost" id="wcancel" style="margin-left:8px">Cancel</button></div>`);
    box.querySelector('#wgo').onclick = () => { act({ t: 'depot-put', index: idx, wish: box.querySelector('#wishSel').value }); closeModal(); };
    box.querySelector('#wcancel').onclick = closeModal;
  });

  const grid = $('#depotGrid');
  grid.innerHTML = '';
  if (!v.depot.length) {
    grid.innerHTML = '<p class="tagline">The shelves are empty. Be the first to list a creature!</p>';
    return;
  }
  for (const d of v.depot.slice().reverse()) {
    const mine = d.owner === s.you;
    const card = document.createElement('div');
    card.className = 'depot-card' + (mine ? ' mine' : '') + (mine && d.fulfilled ? ' ready' : '');
    const wishTxt = d.wish === 'any' ? 'any creature' : SPECIES[d.wish].n;
    card.innerHTML = `<div class="head">${monImg(d.mon.sp, 3)}<div><b>${esc(d.mon.nick)}</b><br><small>${SPECIES[d.mon.sp].t.join('/')}</small></div></div>
      <div class="wish">wants: <b>${esc(wishTxt)}</b></div>
      <div class="owner">listed by ${esc(d.ownerName)}${mine ? ' (you)' : ''}</div>`;
    if (mine && d.fulfilled) {
      const p = document.createElement('div');
      p.className = 'wish';
      p.innerHTML = `✅ <b>${esc(d.fulfilled.byName)}</b> sent you <b>${esc(d.fulfilled.mon.nick)}</b>!`;
      const btn = document.createElement('button'); btn.className = 'primary'; btn.textContent = '🎁 Collect';
      btn.onclick = () => act({ t: 'depot-collect', id: d.id });
      card.append(p, btn);
    } else if (mine) {
      const btn = document.createElement('button'); btn.className = 'ghost'; btn.textContent = 'Withdraw';
      btn.onclick = () => act({ t: 'depot-withdraw', id: d.id });
      card.appendChild(btn);
    } else if (!d.fulfilled) {
      const btn = document.createElement('button'); btn.className = 'primary'; btn.textContent = '⇄ Fulfill this wish';
      btn.onclick = () => pickFromTeam(`Give which creature to ${d.ownerName}?`,
        m => d.wish === 'any' || m.sp === d.wish,
        idx => act({ t: 'depot-take', id: d.id, index: idx }));
      card.appendChild(btn);
    } else {
      const p = document.createElement('div'); p.className = 'wish'; p.textContent = '✅ fulfilled — awaiting collection';
      card.appendChild(p);
    }
    grid.appendChild(card);
  }
}

function renderMist(v, s) {
  const box = $('#mistBox');
  const othersWaiting = v.mistCount - (v.mistMine ? 1 : 0);
  if (v.mistMine) {
    box.innerHTML = `<div class="cloud">🌫</div>
      <p><b>${esc(v.mistMine.mon.nick)}</b> is drifting in the Mist, waiting for a match…</p>
      <p class="tagline">${othersWaiting > 0 ? 'Something else is out there…' : 'The Mist is empty besides yours. A match will happen the moment anyone else offers.'}</p>`;
    const btn = document.createElement('button'); btn.className = 'ghost'; btn.textContent = 'Call it back';
    btn.onclick = () => act({ t: 'mist-withdraw' });
    box.appendChild(btn);
  } else {
    box.innerHTML = `<div class="cloud">🌫</div>
      <p>${othersWaiting > 0 ? `<b>${othersWaiting}</b> unknown creature${othersWaiting > 1 ? 's are' : ' is'} drifting out there right now.` : 'The Mist is still. Offer a creature and see what fate returns.'}</p>`;
    const btn = document.createElement('button'); btn.className = 'primary'; btn.textContent = '🌫 Offer a creature';
    btn.onclick = () => pickFromTeam('Send which creature into the Mist?', () => true, idx => act({ t: 'mist-put', index: idx }));
    box.appendChild(btn);
  }
}

function renderRanks(v) {
  const rows = Object.entries(v.records)
    .sort(([, a], [, b]) => b.w - a.w || a.l - b.l);
  $('#ranksTable').innerHTML = rows.length
    ? '<tr><th></th><th>Trainer</th><th>W</th><th>L</th><th>Streak</th><th>Best</th></tr>' +
      rows.map(([pid, r], i) =>
        `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(r.name)}</td><td>${r.w}</td><td>${r.l}</td>
         <td class="streak">${r.streak > 1 ? '🔥' + r.streak : r.streak}</td><td>${r.best}</td></tr>`).join('')
    : '<tr><td style="opacity:.7">No battles fought here yet. Someone throw the first punch.</td></tr>';
}

function renderTeam(v, s) {
  const me = v.roster[s.you];
  $('#teamNote').innerHTML = `<b>${esc(me.name)}</b> — ${me.rental ? 'rental team' : 'adventure team (Depot deals & trades sync into your save)'} · creatures marked 📦 are committed to the Depot or Mist.`;
  const el = $('#myTeam');
  el.innerHTML = '';
  me.team.forEach((m, i) => el.appendChild(slotDiv(m, { locked: me.locks[i], sub: MOVES[m.moves?.[0]] ? '' : '' })));
}

function renderChat(v) {
  const cl = $('#chatLog');
  cl.innerHTML = '';
  for (const c of v.chat) {
    const div = document.createElement('div');
    div.innerHTML = c.from === '★' ? `<span class="sys">${esc(c.text)}</span>` : `<b>${esc(c.from)}:</b> ${esc(c.text)}`;
    cl.appendChild(div);
  }
  cl.scrollTop = cl.scrollHeight;
}

// ---------- direct trade modal ----------
function renderTradeModal(v, s) {
  const t = v.trade;
  const other = t.a === s.you ? t.b : t.a;
  const me = v.roster[s.you], foe = v.roster[other];
  const mySel = t.sel[s.you], theirSel = t.sel[other];
  const meConf = !!t.confirmed[s.you], themConf = !!t.confirmed[other];
  const box = openModal(`<h3>⇄ Trade with ${esc(foe?.name || '???')}</h3>
    <p class="tagline">Pick one creature each, then both confirm.</p>
    <h4>You offer:</h4><div class="pickgrid" id="tMine"></div>
    <h4>They offer:</h4><div class="pickgrid" id="tTheirs"></div>
    <p class="tagline" id="tStatus"></p>
    <button class="primary" id="tConfirm">Confirm</button>
    <button class="ghost" id="tCancel" style="margin-left:8px">Cancel trade</button>`);
  box.dataset.kind = 'trade';
  me.team.forEach((m, i) => box.querySelector('#tMine').appendChild(
    slotDiv(m, { locked: me.locks[i], sel: mySel === i, onclick: meConf ? null : () => act({ t: 'trade-select', index: i }) })));
  (foe?.team || []).forEach((m, i) => box.querySelector('#tTheirs').appendChild(
    slotDiv(m, { sel: theirSel === i })));
  box.querySelector('#tStatus').textContent =
    (mySel == null ? 'Pick one of yours. ' : meConf ? 'You confirmed. ' : 'Confirm when ready. ') +
    (theirSel == null ? `${foe?.name} is picking…` : themConf ? `${foe?.name} confirmed!` : `${foe?.name} picked.`);
  box.querySelector('#tConfirm').onclick = () => act({ t: 'trade-confirm' });
  box.querySelector('#tCancel').onclick = () => { act({ t: 'trade-cancel' }); closeModal(); };
}

// ---------- battle scene ----------
let watching = null;
let lastHp = {};   // uid -> hp, to trigger hit animations

function plateHtml(mon, showHp) {
  const pct = Math.max(0, Math.round(mon.hp / mon.stats.hp * 100));
  const cls = pct > 50 ? 'ok' : pct > 20 ? 'warn' : 'bad';
  return `<div class="bplate"><div class="p-name">${esc(mon.nick)} <span class="p-lv">Lv${mon.level}</span>
      ${mon.status ? `<span class="p-status">${mon.status.toUpperCase()}</span>` : ''}</div>
    <div class="p-hpbar"><div class="p-hpfill bhpfill ${cls}" style="width:${pct}%"></div></div>
    ${showHp ? `<div class="p-hptext">${mon.hp} / ${mon.stats.hp}</div>` : ''}</div>`;
}

function renderBattle(v, b, s, spectate = false) {
  const youKey = spectate ? 'a' : (b.order[0] === s.you ? 'a' : 'b');
  const foeKey = youKey === 'a' ? 'b' : 'a';
  const mySide = b[youKey], foeSide = b[foeKey];
  const mine = mySide.team[mySide.active], theirs = foeSide.team[foeSide.active];

  const hitFoe = lastHp[theirs.uid] !== undefined && theirs.hp < lastHp[theirs.uid];
  const hitMe = lastHp[mine.uid] !== undefined && mine.hp < lastHp[mine.uid];
  for (const side of [mySide, foeSide]) for (const m of side.team) lastHp[m.uid] = m.hp;

  const overlay = $('#battleOverlay');
  overlay.innerHTML = `<div class="bwrap">
    <div class="bstage">
      <span class="vsbadge">${esc(mySide.name)} vs ${esc(foeSide.name)}${spectate ? ' · spectating' : ''}${b.locked?.[b.order[foeKey === 'a' ? 0 : 1]] ? ' · foe locked in' : ''}</span>
      <div class="foe"><div>${plateHtml(theirs, false)}</div><span class="spr ${hitFoe ? 'hit' : ''} ${theirs.hp <= 0 ? 'faint' : ''}" id="foeSpr"></span></div>
      <div class="ally"><span class="spr ${hitMe ? 'hit' : ''} ${mine.hp <= 0 ? 'faint' : ''}" id="allySpr"></span><div>${plateHtml(mine, true)}</div></div>
    </div>
    <div class="bconsole">
      <div class="blog" id="blog"></div>
      <div id="bctrl"></div>
      <div class="bfoot">
        <span style="font-size:.72rem;opacity:.6">Turn ${b.turn}</span>
        <span>${spectate
          ? '<button class="quiet" id="bStopWatch">stop watching</button>'
          : '<button class="quiet" id="bClaim">claim win (opponent away)</button> <button class="quiet" id="bForfeit">forfeit</button>'}</span>
      </div>
    </div></div>`;

  overlay.querySelector('#foeSpr').appendChild(monCanvas(theirs.sp, false, 4));
  overlay.querySelector('#allySpr').appendChild(monCanvas(mine.sp, true, 5));

  const log = overlay.querySelector('#blog');
  for (const line of b.log) { const d = document.createElement('div'); d.textContent = line; log.appendChild(d); }
  log.scrollTop = log.scrollHeight;

  if (spectate) { overlay.querySelector('#bStopWatch').onclick = () => { watching = null; render(); }; return; }

  overlay.querySelector('#bForfeit').onclick = () => { if (confirm('Forfeit this battle?')) act({ t: 'forfeit' }); };
  overlay.querySelector('#bClaim').onclick = () => { if (confirm('Claim victory because your opponent left?')) act({ t: 'claimwin' }); };

  const ctrl = overlay.querySelector('#bctrl');
  const mustSwitch = b.awaitSwitch.includes(s.you);
  const iAmLocked = !!b.locked?.[s.you];
  if (b.awaitSwitch.length && !mustSwitch) { ctrl.innerHTML = '<p class="locked-note">Waiting for the other trainer to send a new creature…</p>'; return; }
  if (iAmLocked) { ctrl.innerHTML = '<p class="locked-note">Locked in — waiting for the other trainer…</p>'; return; }

  if (!mustSwitch) {
    const mv = document.createElement('div');
    mv.className = 'bmoves';
    mine.moves.forEach((slot, i) => {
      const m = MOVES[slot.id];
      const btn = document.createElement('button');
      btn.innerHTML = `${m.n}<small>${m.t} · ${m.cat === 'T' ? 'status' : 'pow ' + m.pow} · PP ${slot.pp}/${slot.maxPp}</small>`;
      btn.disabled = slot.pp <= 0;
      btn.onclick = () => act({ t: 'move', slot: i });
      mv.appendChild(btn);
    });
    ctrl.appendChild(mv);
  } else {
    const p = document.createElement('p');
    p.className = 'locked-note';
    p.textContent = `${mine.nick} fainted! Send out your next creature:`;
    ctrl.appendChild(p);
  }
  const sw = document.createElement('div');
  sw.className = 'bside';
  mySide.team.forEach((m, i) => {
    if (m.hp <= 0 || i === mySide.active) return;
    const btn = document.createElement('button');
    btn.innerHTML = `→ ${esc(m.nick)} (${m.hp}/${m.stats.hp})`;
    btn.onclick = () => act({ t: 'switch', to: i });
    sw.appendChild(btn);
  });
  ctrl.appendChild(sw);
}

connect();

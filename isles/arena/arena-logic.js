// Shellfire Isles Arena — platform rules module, v2 "Island Depot".
// A persistent lounge for up to 8 trainers: concurrent battles, direct trades,
// a wish-based Trade Depot (async — deposits wait for you while you're away),
// blind Mist Trades, and room records. The deploy build prepends data.js +
// engine.js (imports/exports stripped), so SPECIES, MOVES, makeMon, resolveTurn
// etc. are in scope. State is pure JSON and is cloned before every change.

export const meta = { game: 'Shellfire Isles Arena', minPlayers: 1, maxPlayers: 8 };

const CHAT_CAP = 40, LOG_CAP = 80, RECEIPT_CAP = 60, DEPOT_CAP = 24, RESULT_CAP = 8;
const MAX_DEPOSITS_PER_PLAYER = 2;

export function setup(_players) {
  return {
    v: 2,
    roster: {},        // pid -> { name, team:[serialMon], rental, locks:[bool x6] }
    order: [],         // pids in join order
    chat: [],          // { from, text }
    seq: 0,            // event counter (receipts, depot, results)
    receipts: [],      // { seq, pid, kind, gaveIndex, got, note }
    depot: [],         // { id, seq, owner, ownerName, mon, wish, fromIndex,
                       //   fulfilled: null | { by, byName, mon, seq } }
    mystery: [],       // { owner, mon, fromIndex }
    challenges: [],    // { from, to, lead }
    tradeReqs: [],     // { from, to }
    trade: null,       // { a, b, sel:{}, confirmed:{} }
    battles: {},       // id -> battle
    records: {},       // pid -> { name, w, l, streak, best }
    results: [],       // { seq, text }
  };
}

// ---------- helpers ----------
const clone = x => JSON.parse(JSON.stringify(x));
const cleanText = (s, max) => String(s == null ? '' : s).replace(/[<>&"'`]/g, '').trim().slice(0, max);
const cleanName = s => cleanText(s, 14) || 'Trainer';

function sanitizeTeam(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = [];
  for (const d of raw.slice(0, 6)) {
    if (!d || typeof d !== 'object' || !SPECIES[d.sp]) return null;
    const legal = (Array.isArray(d.moves) ? d.moves : []).filter(id => MOVES[id]).slice(0, 4);
    out.push({
      sp: d.sp,
      nick: typeof d.nick === 'string' && d.nick.trim() ? String(d.nick).slice(0, 14) : SPECIES[d.sp].n,
      moves: legal.length ? legal : movesAtLevel(d.sp, 50),
    });
  }
  return out.length ? out : null;
}

function rentalSerial() {
  const pool = Object.keys(SPECIES);
  const picks = [];
  while (picks.length < 6) {
    const sp = pool[Math.floor(Math.random() * pool.length)];
    if (!picks.includes(sp)) picks.push(sp);
  }
  return picks.map(sp => ({ sp, nick: SPECIES[sp].n, moves: movesAtLevel(sp, 50) }));
}

function member(state, pid) { return state.roster[pid] || null; }
function nameOf(state, pid) { return state.roster[pid] ? state.roster[pid].name : 'Trainer'; }
function battleOf(state, pid) {
  for (const b of Object.values(state.battles)) if (b.order.includes(pid)) return b;
  return null;
}
function depositCount(state, pid) {
  return state.depot.filter(d => d.owner === pid && !d.fulfilled).length
       + state.mystery.filter(m => m.owner === pid).length;
}
function hasPendingExchanges(state, pid) {
  return state.depot.some(d => d.owner === pid)
      || state.mystery.some(m => m.owner === pid)
      || (state.trade && (state.trade.a === pid || state.trade.b === pid));
}
function pushReceipt(state, pid, kind, gaveIndex, got, note) {
  state.seq++;
  state.receipts.push({ seq: state.seq, pid, kind, gaveIndex, got, note });
  if (state.receipts.length > RECEIPT_CAP) state.receipts = state.receipts.slice(-RECEIPT_CAP);
}
function pushResult(state, text) {
  state.seq++;
  state.results.push({ seq: state.seq, text });
  if (state.results.length > RESULT_CAP) state.results = state.results.slice(-RESULT_CAP);
}
function announce(state, text) {
  state.chat.push({ from: '★', text });
  if (state.chat.length > CHAT_CAP) state.chat = state.chat.slice(-CHAT_CAP);
}

// ---------- battles ----------
function newBattle(state, pidA, pidB, leadA, leadB) {
  const mk = (pid, lead) => {
    const side = makeSide(
      state.roster[pid].team.map((d, i) => {
        const m = makeMon(d.sp, 50, d.moves);
        m.uid = pid + '-' + i;
        m.nick = d.nick;
        return m;
      }),
      state.roster[pid].name,
    );
    if (side.team[lead] && side.team[lead].hp > 0) side.active = lead;
    return side;
  };
  state.seq++;
  const id = 'b' + state.seq;
  state.battles[id] = {
    id, order: [pidA, pidB],
    a: mk(pidA, leadA), b: mk(pidB, leadB),
    turn: 0, over: false, winner: null, opts: {},
    pending: {}, awaitSwitch: [],
    log: [`⚔ ${nameOf(state, pidA)} vs ${nameOf(state, pidB)} — level 50 rules!`],
  };
  return state.battles[id];
}

function sideKey(b, pid) { return b.order[0] === pid ? 'a' : 'b'; }

function pushLog(b, lines) {
  for (const l of lines) if (l) b.log.push(l);
  if (b.log.length > LOG_CAP) b.log = b.log.slice(-LOG_CAP);
}

function bumpRecord(state, pid, won) {
  const r = state.records[pid] || { name: nameOf(state, pid), w: 0, l: 0, streak: 0, best: 0 };
  r.name = nameOf(state, pid);
  if (won) { r.w++; r.streak++; r.best = Math.max(r.best, r.streak); }
  else { r.l++; r.streak = 0; }
  state.records[pid] = r;
}

function endBattle(state, b, winnerPid, note) {
  const loserPid = b.order.find(p => p !== winnerPid);
  if (winnerPid) {
    bumpRecord(state, winnerPid, true);
    bumpRecord(state, loserPid, false);
    pushResult(state, `🏆 ${nameOf(state, winnerPid)} defeated ${nameOf(state, loserPid)}${note ? ` (${note})` : ''}`);
    announce(state, `${nameOf(state, winnerPid)} defeated ${nameOf(state, loserPid)}${note ? ` — ${note}` : ''}!`);
  } else {
    pushResult(state, `🤝 ${nameOf(state, b.order[0])} and ${nameOf(state, b.order[1])} fought to a draw`);
  }
  delete state.battles[b.id];
}

function settleAfterTurn(state, b) {
  if (b.over) {
    const winnerPid = b.winner ? b.order[b.winner === 'a' ? 0 : 1] : null;
    endBattle(state, b, winnerPid);
    return;
  }
  b.awaitSwitch = [];
  for (const key of ['a', 'b']) {
    if (activeMon(b[key]).hp <= 0 && sideHasHealthy(b[key])) b.awaitSwitch.push(b.order[key === 'a' ? 0 : 1]);
  }
}

function runTurnIfReady(state, b) {
  const [pA, pB] = b.order;
  if (b.awaitSwitch.length || !b.pending[pA] || !b.pending[pB]) return;
  const actA = b.pending[pA], actB = b.pending[pB];
  b.pending = {};
  const ev = resolveTurn(b, actA, actB);
  pushLog(b, ev.map(e => e.text));
  settleAfterTurn(state, b);
}

// ---------- the kernel contract ----------
export function validateAction(state, playerId, action) {
  if (!action || typeof action !== 'object' || typeof action.t !== 'string') {
    return { ok: false, error: 'Malformed action.' };
  }
  const me = member(state, playerId);
  if (action.t !== 'hello' && !me) return { ok: false, error: 'Introduce yourself first (pick a name and team).' };
  const myBattle = me ? battleOf(state, playerId) : null;

  switch (action.t) {
    case 'hello': {
      if (action.team && me && hasPendingExchanges(state, playerId)) {
        return { ok: false, error: 'Finish or withdraw your depot/mist/trade business before changing teams.' };
      }
      return { ok: true };
    }
    case 'chat': {
      const text = cleanText(action.text, 200);
      if (!text) return { ok: false, error: 'Say something first.' };
      return { ok: true };
    }

    // --- battles
    case 'challenge': {
      const target = member(state, action.to);
      if (!target) return { ok: false, error: 'No such trainer here.' };
      if (action.to === playerId) return { ok: false, error: 'You cannot battle yourself.' };
      if (myBattle) return { ok: false, error: 'You are already battling.' };
      if (battleOf(state, action.to)) return { ok: false, error: `${target.name} is mid-battle.` };
      return { ok: true };
    }
    case 'accept': {
      const ch = state.challenges.find(c => c.from === action.from && c.to === playerId);
      if (!ch) return { ok: false, error: 'That challenge is gone.' };
      if (!member(state, action.from)) return { ok: false, error: 'They left the room.' };
      if (myBattle || battleOf(state, action.from)) return { ok: false, error: 'Someone is already battling.' };
      return { ok: true };
    }
    case 'decline':
      return { ok: true };
    case 'move': {
      if (!myBattle) return { ok: false, error: 'You are not in a battle.' };
      if (myBattle.awaitSwitch.length) {
        return { ok: false, error: myBattle.awaitSwitch.includes(playerId) ? 'Pick a replacement creature.' : 'Waiting for a switch.' };
      }
      if (myBattle.pending[playerId]) return { ok: false, error: 'Choice already locked in.' };
      const side = myBattle[sideKey(myBattle, playerId)];
      const slot = side.team[side.active].moves[action.slot];
      if (!slot) return { ok: false, error: 'No such move.' };
      if (slot.pp <= 0) return { ok: false, error: 'No PP left for that move.' };
      return { ok: true };
    }
    case 'switch': {
      if (!myBattle) return { ok: false, error: 'You are not in a battle.' };
      if (myBattle.awaitSwitch.length && !myBattle.awaitSwitch.includes(playerId)) {
        return { ok: false, error: 'Waiting for the other trainer.' };
      }
      if (!myBattle.awaitSwitch.length && myBattle.pending[playerId]) return { ok: false, error: 'Choice already locked in.' };
      const side = myBattle[sideKey(myBattle, playerId)];
      const target = side.team[action.to];
      if (!target) return { ok: false, error: 'No creature in that slot.' };
      if (target.hp <= 0) return { ok: false, error: `${target.nick} has fainted.` };
      if (action.to === side.active) return { ok: false, error: `${target.nick} is already out.` };
      return { ok: true };
    }
    case 'forfeit':
      if (!myBattle) return { ok: false, error: 'You are not in a battle.' };
      return { ok: true };
    case 'claimwin': {
      if (!myBattle) return { ok: false, error: 'You are not in a battle.' };
      const opp = myBattle.order.find(p => p !== playerId);
      const waitingOnOpp =
        (myBattle.pending[playerId] && !myBattle.pending[opp] && !myBattle.awaitSwitch.length) ||
        (myBattle.awaitSwitch.length && !myBattle.awaitSwitch.includes(playerId));
      if (!waitingOnOpp) return { ok: false, error: 'You can only claim while waiting on your opponent.' };
      return { ok: true };
    }

    // --- direct trades
    case 'trade-req': {
      const target = member(state, action.to);
      if (!target) return { ok: false, error: 'No such trainer here.' };
      if (action.to === playerId) return { ok: false, error: 'Trading with yourself is just shuffling.' };
      if (state.trade) return { ok: false, error: 'Another trade is in progress — one at a time.' };
      return { ok: true };
    }
    case 'trade-accept': {
      if (state.trade) return { ok: false, error: 'Another trade is in progress.' };
      if (!state.tradeReqs.some(r => r.from === action.from && r.to === playerId)) {
        return { ok: false, error: 'That trade offer is gone.' };
      }
      if (!member(state, action.from)) return { ok: false, error: 'They left the room.' };
      return { ok: true };
    }
    case 'trade-decline':
      return { ok: true };
    case 'trade-select': {
      const t = state.trade;
      if (!t || (t.a !== playerId && t.b !== playerId)) return { ok: false, error: 'You are not in this trade.' };
      if (t.confirmed[playerId]) return { ok: false, error: 'You already confirmed.' };
      const idx = action.index;
      if (!Number.isInteger(idx) || !me.team[idx]) return { ok: false, error: 'Pick one of your own creatures.' };
      if (me.locks[idx]) return { ok: false, error: 'That creature is committed to the Depot or the Mist.' };
      return { ok: true };
    }
    case 'trade-confirm': {
      const t = state.trade;
      if (!t || (t.a !== playerId && t.b !== playerId)) return { ok: false, error: 'You are not in this trade.' };
      if (t.sel[playerId] == null) return { ok: false, error: 'Pick a creature to offer first.' };
      return { ok: true };
    }
    case 'trade-cancel':
      if (!state.trade || (state.trade.a !== playerId && state.trade.b !== playerId)) {
        return { ok: false, error: 'You are not in this trade.' };
      }
      return { ok: true };

    // --- the Trade Depot (async, wish-based)
    case 'depot-put': {
      const idx = action.index;
      if (!Number.isInteger(idx) || !me.team[idx]) return { ok: false, error: 'Pick one of your creatures.' };
      if (me.locks[idx]) return { ok: false, error: 'That creature is already committed.' };
      if (depositCount(state, playerId) >= MAX_DEPOSITS_PER_PLAYER) {
        return { ok: false, error: `You already have ${MAX_DEPOSITS_PER_PLAYER} creatures out — collect or withdraw first.` };
      }
      if (state.depot.length >= DEPOT_CAP) return { ok: false, error: 'The Depot shelves are full right now.' };
      const wish = action.wish;
      if (wish !== 'any' && !SPECIES[wish]) return { ok: false, error: 'Wish for a real species, or "any".' };
      return { ok: true };
    }
    case 'depot-take': {
      const entry = state.depot.find(d => d.id === action.id);
      if (!entry) return { ok: false, error: 'That listing is gone.' };
      if (entry.fulfilled) return { ok: false, error: 'Already fulfilled — the owner just has to collect it.' };
      if (entry.owner === playerId) return { ok: false, error: 'That one is yours — withdraw it instead.' };
      const idx = action.index;
      if (!Number.isInteger(idx) || !me.team[idx]) return { ok: false, error: 'Pick one of your creatures to give.' };
      if (me.locks[idx]) return { ok: false, error: 'That creature is already committed.' };
      if (entry.wish !== 'any' && me.team[idx].sp !== entry.wish) {
        return { ok: false, error: `The owner wishes for ${SPECIES[entry.wish].n}.` };
      }
      return { ok: true };
    }
    case 'depot-collect': {
      const entry = state.depot.find(d => d.id === action.id);
      if (!entry || entry.owner !== playerId) return { ok: false, error: 'No such deposit of yours.' };
      if (!entry.fulfilled) return { ok: false, error: 'No one has fulfilled it yet.' };
      return { ok: true };
    }
    case 'depot-withdraw': {
      const entry = state.depot.find(d => d.id === action.id);
      if (!entry || entry.owner !== playerId) return { ok: false, error: 'No such deposit of yours.' };
      if (entry.fulfilled) return { ok: false, error: 'It was fulfilled — collect it instead!' };
      return { ok: true };
    }

    // --- Mist Trade (blind)
    case 'mist-put': {
      const idx = action.index;
      if (!Number.isInteger(idx) || !me.team[idx]) return { ok: false, error: 'Pick one of your creatures.' };
      if (me.locks[idx]) return { ok: false, error: 'That creature is already committed.' };
      if (state.mystery.some(m => m.owner === playerId)) return { ok: false, error: 'You already have a creature in the Mist.' };
      if (depositCount(state, playerId) >= MAX_DEPOSITS_PER_PLAYER) {
        return { ok: false, error: 'Too many creatures out at once — collect or withdraw first.' };
      }
      return { ok: true };
    }
    case 'mist-withdraw':
      if (!state.mystery.some(m => m.owner === playerId)) return { ok: false, error: 'You have nothing in the Mist.' };
      return { ok: true };

    default:
      return { ok: false, error: 'Unknown action.' };
  }
}

export function applyAction(prev, playerId, action) {
  const state = clone(prev);
  const me = () => state.roster[playerId];

  switch (action.t) {
    case 'hello': {
      const supplied = sanitizeTeam(action.team);
      const existing = state.roster[playerId];
      state.roster[playerId] = {
        name: cleanName(action.name),
        team: supplied || (existing ? existing.team : rentalSerial()),
        rental: supplied ? false : (existing ? existing.rental : true),
        locks: supplied || !existing ? [false, false, false, false, false, false] : existing.locks,
      };
      if (!state.order.includes(playerId)) {
        state.order.push(playerId);
        announce(state, `${state.roster[playerId].name} arrived on the island.`);
      }
      break;
    }
    case 'chat':
      state.chat.push({ from: nameOf(state, playerId), text: cleanText(action.text, 200) });
      if (state.chat.length > CHAT_CAP) state.chat = state.chat.slice(-CHAT_CAP);
      break;

    // --- battles
    case 'challenge': {
      state.challenges = state.challenges.filter(c => c.from !== playerId);
      state.challenges.push({ from: playerId, to: action.to, lead: Number.isInteger(action.lead) ? action.lead : 0 });
      break;
    }
    case 'accept': {
      const ch = state.challenges.find(c => c.from === action.from && c.to === playerId);
      state.challenges = state.challenges.filter(c => c.from !== action.from && c.to !== playerId && c.from !== playerId);
      newBattle(state, ch.from, playerId, ch.lead, Number.isInteger(action.lead) ? action.lead : 0);
      break;
    }
    case 'decline':
      state.challenges = state.challenges.filter(c => !(c.from === action.from && c.to === playerId));
      break;
    case 'move': {
      const b = battleOf(state, playerId);
      b.pending[playerId] = { type: 'move', slot: action.slot };
      runTurnIfReady(state, b);
      break;
    }
    case 'switch': {
      const b = battleOf(state, playerId);
      if (b.awaitSwitch.includes(playerId)) {
        const ev = [];
        doSwitch(b, sideKey(b, playerId), action.to, ev);
        pushLog(b, ev.map(e => e.text));
        b.awaitSwitch = b.awaitSwitch.filter(p => p !== playerId);
      } else {
        b.pending[playerId] = { type: 'switch', to: action.to };
        runTurnIfReady(state, b);
      }
      break;
    }
    case 'forfeit': {
      const b = battleOf(state, playerId);
      endBattle(state, b, b.order.find(p => p !== playerId), 'forfeit');
      break;
    }
    case 'claimwin': {
      const b = battleOf(state, playerId);
      endBattle(state, b, playerId, 'opponent away');
      break;
    }

    // --- direct trades
    case 'trade-req':
      state.tradeReqs = state.tradeReqs.filter(r => r.from !== playerId);
      state.tradeReqs.push({ from: playerId, to: action.to });
      break;
    case 'trade-accept':
      state.tradeReqs = state.tradeReqs.filter(r => r.from !== action.from && r.to !== playerId);
      state.trade = { a: action.from, b: playerId, sel: {}, confirmed: {} };
      break;
    case 'trade-decline':
      state.tradeReqs = state.tradeReqs.filter(r => !(r.from === action.from && r.to === playerId));
      break;
    case 'trade-select':
      state.trade.sel[playerId] = action.index;
      state.trade.confirmed[playerId] = false;
      break;
    case 'trade-confirm': {
      const t = state.trade;
      t.confirmed[playerId] = true;
      if (t.confirmed[t.a] && t.confirmed[t.b] && t.sel[t.a] != null && t.sel[t.b] != null) {
        const A = state.roster[t.a], B = state.roster[t.b];
        const monA = A.team[t.sel[t.a]], monB = B.team[t.sel[t.b]];
        A.team[t.sel[t.a]] = monB;
        B.team[t.sel[t.b]] = monA;
        pushReceipt(state, t.a, 'trade', t.sel[t.a], monB, `traded with ${B.name}`);
        pushReceipt(state, t.b, 'trade', t.sel[t.b], monA, `traded with ${A.name}`);
        announce(state, `⇄ ${A.name} and ${B.name} completed a trade!`);
        state.trade = null;
      }
      break;
    }
    case 'trade-cancel':
      state.trade = null;
      break;

    // --- Trade Depot
    case 'depot-put': {
      state.seq++;
      const m = me();
      m.locks[action.index] = true;
      state.depot.push({
        id: 'd' + state.seq, seq: state.seq,
        owner: playerId, ownerName: m.name,
        mon: m.team[action.index], wish: action.wish === 'any' ? 'any' : action.wish,
        fromIndex: action.index, fulfilled: null,
      });
      announce(state, `📦 ${m.name} listed ${m.team[action.index].nick} at the Depot (wants: ${action.wish === 'any' ? 'any creature' : SPECIES[action.wish].n}).`);
      break;
    }
    case 'depot-take': {
      const entry = state.depot.find(d => d.id === action.id);
      const taker = me();
      const given = taker.team[action.index];
      taker.team[action.index] = entry.mon;               // deposited creature arrives instantly
      state.seq++;
      entry.fulfilled = { by: playerId, byName: taker.name, mon: given, seq: state.seq };
      pushReceipt(state, playerId, 'depot-fulfill', action.index, entry.mon, `Depot deal with ${entry.ownerName}`);
      announce(state, `📦 ${taker.name} fulfilled ${entry.ownerName}'s Depot wish!`);
      break;
    }
    case 'depot-collect': {
      const entry = state.depot.find(d => d.id === action.id);
      const m = me();
      m.team[entry.fromIndex] = entry.fulfilled.mon;      // your side of the deal, collected
      m.locks[entry.fromIndex] = false;
      pushReceipt(state, playerId, 'depot-collect', entry.fromIndex, entry.fulfilled.mon, `Depot deal with ${entry.fulfilled.byName}`);
      state.depot = state.depot.filter(d => d.id !== action.id);
      break;
    }
    case 'depot-withdraw': {
      const entry = state.depot.find(d => d.id === action.id);
      me().locks[entry.fromIndex] = false;
      state.depot = state.depot.filter(d => d.id !== action.id);
      break;
    }

    // --- Mist Trade
    case 'mist-put': {
      const m = me();
      m.locks[action.index] = true;
      state.mystery.push({ owner: playerId, mon: m.team[action.index], fromIndex: action.index });
      const partner = state.mystery.find(x => x.owner !== playerId);
      if (partner) {
        const mine = state.mystery.find(x => x.owner === playerId);
        const A = state.roster[partner.owner], B = m;
        A.team[partner.fromIndex] = mine.mon;
        A.locks[partner.fromIndex] = false;
        B.team[mine.fromIndex] = partner.mon;
        B.locks[mine.fromIndex] = false;
        pushReceipt(state, partner.owner, 'mist', partner.fromIndex, mine.mon, 'a trade in the Mist');
        pushReceipt(state, playerId, 'mist', mine.fromIndex, partner.mon, 'a trade in the Mist');
        state.mystery = state.mystery.filter(x => x !== partner && x !== mine);
        announce(state, `🌫 The Mist swirled — two creatures changed hands!`);
      } else {
        announce(state, `🌫 A creature slipped into the Mist, waiting for a match...`);
      }
      break;
    }
    case 'mist-withdraw': {
      const mine = state.mystery.find(x => x.owner === playerId);
      me().locks[mine.fromIndex] = false;
      state.mystery = state.mystery.filter(x => x !== mine);
      break;
    }
  }
  return state;
}

export function isGameOver(_state) {
  // The island never closes — battles and trades resolve inside the state.
  return { over: false };
}

export function viewFor(state, playerId) {
  const v = clone(state);
  // Hide locked-in battle choices from everyone but their owner.
  for (const b of Object.values(v.battles)) {
    b.locked = {};
    for (const pid of b.order) b.locked[pid] = !!b.pending[pid];
    for (const pid of Object.keys(b.pending)) {
      if (pid !== playerId) b.pending[pid] = { hidden: true };
    }
  }
  // The Mist is blind: others' offerings show as species "???".
  v.mistMine = null;
  v.mistCount = v.mystery.length;
  const mine = v.mystery.find(x => x.owner === playerId);
  if (mine) v.mistMine = mine;
  delete v.mystery;
  // Receipts are personal.
  v.receipts = v.receipts.filter(r => r.pid === playerId);
  return v;
}

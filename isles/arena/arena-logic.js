// Shellfire Isles Arena — platform rules module (the six kernel exports).
// The deploy build prepends the full contents of data.js + engine.js (with
// import/export keywords stripped), so DATA (SPECIES, MOVES, …) and ENGINE
// helpers (makeMon, resolveTurn, doSwitch, …) are in scope as plain globals.
// State is pure JSON: no Map/Set/class instances, cloned before every change.

export const meta = { game: 'Shellfire Isles Arena', minPlayers: 2, maxPlayers: 2 };

const CHAT_CAP = 30, LOG_CAP = 70, TRADELOG_CAP = 12;

export function setup(players) {
  return {
    players: [...players],
    info: {},            // pid -> { name, team:[{sp,nick,moves[]}] }  (arena is flat level 50)
    phase: 'lobby',      // 'lobby' | 'battle'
    chat: [],
    seq: 0,
    tradeLog: [],        // [{seq, got:{pid:serialMon}, gaveIndex:{pid:idx}}]
    trade: null,         // { sel:{pid:idx|null}, confirmed:{pid:bool} }
    battle: null,
    lastResult: null,    // { winner, loser, summary }
  };
}

function clone(x) { return JSON.parse(JSON.stringify(x)); }
function otherOf(state, pid) { return state.players.find(p => p !== pid); }

function cleanName(s) {
  const t = String(s == null ? '' : s).replace(/[<>&"'`]/g, '').trim().slice(0, 14);
  return t || 'Trainer';
}

// Normalize an untrusted team into arena form: known species, level-50, legal moves.
function sanitizeTeam(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out = [];
  for (const d of raw.slice(0, 6)) {
    if (!d || typeof d !== 'object' || !SPECIES[d.sp]) return null;
    const legal = (Array.isArray(d.moves) ? d.moves : []).filter(id => MOVES[id]).slice(0, 4);
    const moves = legal.length ? legal : movesAtLevel(d.sp, 50);
    const nick = typeof d.nick === 'string' && d.nick.trim() ? String(d.nick).slice(0, 14) : SPECIES[d.sp].n;
    out.push({ sp: d.sp, nick, moves });
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

function bothReady(state) {
  return state.players.every(p => state.info[p] && state.info[p].team && state.info[p].team.length);
}

// ---------- battle plumbing ----------
function newBattle(state) {
  const [pA, pB] = state.players;
  const mk = pid => makeSide(
    state.info[pid].team.map((d, i) => {
      const m = makeMon(d.sp, 50, d.moves);
      m.uid = pid + '-' + i;      // deterministic ids: isolates may restart between calls
      m.nick = d.nick;
      return m;
    }),
    state.info[pid].name,
  );
  return {
    order: [pA, pB],              // order[0] is engine side 'a'
    a: mk(pA), b: mk(pB),
    turn: 0, over: false, winner: null, opts: {},
    pending: {},                  // pid -> action while waiting for the other side
    awaitSwitch: [],              // pids that must pick a replacement after a faint
    log: ['⚔ Battle started! Teams are set to level 50.'],
  };
}

function sideKey(battle, pid) { return battle.order[0] === pid ? 'a' : 'b'; }

function pushLog(battle, lines) {
  for (const l of lines) if (l) battle.log.push(l);
  if (battle.log.length > LOG_CAP) battle.log = battle.log.slice(-LOG_CAP);
}

function settleAfterTurn(state) {
  const b = state.battle;
  if (b.over) {
    const winnerPid = b.winner ? b.order[b.winner === 'a' ? 0 : 1] : null;
    state.lastResult = {
      winner: winnerPid,
      loser: winnerPid ? otherOf(state, winnerPid) : null,
      summary: winnerPid ? `${state.info[winnerPid].name} won the battle!` : 'The battle ended in a draw.',
    };
    state.phase = 'lobby';
    state.battle = null;
    return;
  }
  b.awaitSwitch = [];
  for (const key of ['a', 'b']) {
    if (activeMon(b[key]).hp <= 0 && sideHasHealthy(b[key])) {
      b.awaitSwitch.push(b.order[key === 'a' ? 0 : 1]);
    }
  }
}

function runTurnIfReady(state) {
  const b = state.battle;
  const [pA, pB] = b.order;
  if (b.awaitSwitch.length || !b.pending[pA] || !b.pending[pB]) return;
  const actA = b.pending[pA], actB = b.pending[pB];
  b.pending = {};
  const ev = resolveTurn(b, actA, actB);   // b already has a/b/turn/over/winner shape
  pushLog(b, ev.map(e => e.text));
  settleAfterTurn(state);
}

// ---------- the kernel contract ----------
export function validateAction(state, playerId, action) {
  if (!state.players.includes(playerId)) return { ok: false, error: 'Spectators cannot act in this room.' };
  if (!action || typeof action !== 'object' || typeof action.t !== 'string') {
    return { ok: false, error: 'Malformed action.' };
  }
  const inBattle = state.phase === 'battle' && state.battle;

  switch (action.t) {
    case 'hello':
      return { ok: true };
    case 'chat': {
      const text = String(action.text == null ? '' : action.text).trim();
      if (!text) return { ok: false, error: 'Say something first.' };
      if (text.length > 200) return { ok: false, error: 'Message too long (200 max).' };
      return { ok: true };
    }
    case 'battle':
      if (inBattle) return { ok: false, error: 'A battle is already underway.' };
      if (state.trade) return { ok: false, error: 'Finish or cancel the trade first.' };
      if (!bothReady(state)) return { ok: false, error: 'Both trainers need a team first.' };
      return { ok: true };
    case 'move': {
      if (!inBattle) return { ok: false, error: 'No battle right now.' };
      const b = state.battle;
      if (b.awaitSwitch.length) {
        return { ok: false, error: b.awaitSwitch.includes(playerId) ? 'Pick a replacement creature.' : 'Waiting for a switch.' };
      }
      if (b.pending[playerId]) return { ok: false, error: 'Choice already locked in.' };
      const side = b[sideKey(b, playerId)];
      const mon = side.team[side.active];
      const slot = mon.moves[action.slot];
      if (!slot) return { ok: false, error: 'No such move.' };
      if (slot.pp <= 0) return { ok: false, error: 'No PP left for that move.' };
      return { ok: true };
    }
    case 'switch': {
      if (!inBattle) return { ok: false, error: 'No battle right now.' };
      const b = state.battle;
      if (b.awaitSwitch.length && !b.awaitSwitch.includes(playerId)) {
        return { ok: false, error: 'Waiting for the other trainer.' };
      }
      if (!b.awaitSwitch.length && b.pending[playerId]) return { ok: false, error: 'Choice already locked in.' };
      const side = b[sideKey(b, playerId)];
      const target = side.team[action.to];
      if (!target) return { ok: false, error: 'No creature in that slot.' };
      if (target.hp <= 0) return { ok: false, error: `${target.nick} has fainted.` };
      if (action.to === side.active) return { ok: false, error: `${target.nick} is already out.` };
      return { ok: true };
    }
    case 'trade-open':
      if (inBattle) return { ok: false, error: 'Not during a battle.' };
      if (state.trade) return { ok: false, error: 'A trade is already open.' };
      if (!bothReady(state)) return { ok: false, error: 'Both trainers need a team first.' };
      return { ok: true };
    case 'trade-select': {
      if (!state.trade) return { ok: false, error: 'No trade is open.' };
      if (state.trade.confirmed[playerId]) return { ok: false, error: 'You already confirmed.' };
      const idx = action.index;
      if (!Number.isInteger(idx) || idx < 0 || idx >= state.info[playerId].team.length) {
        return { ok: false, error: 'Pick one of your own creatures.' };
      }
      return { ok: true };
    }
    case 'trade-confirm':
      if (!state.trade) return { ok: false, error: 'No trade is open.' };
      if (state.trade.sel[playerId] == null) return { ok: false, error: 'Pick a creature to offer first.' };
      return { ok: true };
    case 'trade-cancel':
      if (!state.trade) return { ok: false, error: 'No trade is open.' };
      return { ok: true };
    default:
      return { ok: false, error: 'Unknown action.' };
  }
}

export function applyAction(prev, playerId, action) {
  const state = clone(prev);

  switch (action.t) {
    case 'hello': {
      const team = sanitizeTeam(action.team) || rentalSerial();
      const existing = state.info[playerId];
      state.info[playerId] = {
        name: cleanName(action.name),
        // keep the current team on a re-hello (rename/reconnect) unless a new one is sent
        team: (existing && !action.team) ? existing.team : team,
        rental: !sanitizeTeam(action.team),
      };
      break;
    }
    case 'chat':
      state.chat.push({ from: state.info[playerId] ? state.info[playerId].name : 'Trainer', text: String(action.text).trim().slice(0, 200) });
      if (state.chat.length > CHAT_CAP) state.chat = state.chat.slice(-CHAT_CAP);
      break;
    case 'battle':
      state.lastResult = null;
      state.battle = newBattle(state);
      state.phase = 'battle';
      break;
    case 'move': {
      const b = state.battle;
      b.pending[playerId] = { type: 'move', slot: action.slot };
      runTurnIfReady(state);
      break;
    }
    case 'switch': {
      const b = state.battle;
      if (b.awaitSwitch.includes(playerId)) {
        const ev = [];
        doSwitch(b, sideKey(b, playerId), action.to, ev);
        pushLog(b, ev.map(e => e.text));
        b.awaitSwitch = b.awaitSwitch.filter(p => p !== playerId);
      } else {
        b.pending[playerId] = { type: 'switch', to: action.to };
        runTurnIfReady(state);
      }
      break;
    }
    case 'trade-open':
      state.trade = { sel: {}, confirmed: {} };
      break;
    case 'trade-select':
      state.trade.sel[playerId] = action.index;
      state.trade.confirmed[playerId] = false;
      break;
    case 'trade-confirm': {
      state.trade.confirmed[playerId] = true;
      const [pA, pB] = state.players;
      const t = state.trade;
      if (t.confirmed[pA] && t.confirmed[pB] && t.sel[pA] != null && t.sel[pB] != null) {
        const monA = state.info[pA].team[t.sel[pA]];
        const monB = state.info[pB].team[t.sel[pB]];
        state.info[pA].team[t.sel[pA]] = monB;
        state.info[pB].team[t.sel[pB]] = monA;
        state.seq++;
        state.tradeLog.push({
          seq: state.seq,
          got: { [pA]: monB, [pB]: monA },
          gaveIndex: { [pA]: t.sel[pA], [pB]: t.sel[pB] },
          names: { [pA]: state.info[pA].name, [pB]: state.info[pB].name },
        });
        if (state.tradeLog.length > TRADELOG_CAP) state.tradeLog = state.tradeLog.slice(-TRADELOG_CAP);
        state.trade = null;
      }
      break;
    }
    case 'trade-cancel':
      state.trade = null;
      break;
  }
  return state;
}

export function isGameOver(_state) {
  // The room is a persistent friend-lounge: battle results and trades live in
  // state, and players can rematch forever — the kernel game never "ends".
  return { over: false };
}

export function viewFor(state, playerId) {
  const v = clone(state);
  // Hide the opponent's locked-in battle choice; show only that it is locked.
  if (v.battle) {
    const locked = {};
    for (const pid of v.players) locked[pid] = !!v.battle.pending[pid];
    for (const pid of Object.keys(v.battle.pending)) {
      if (pid !== playerId) v.battle.pending[pid] = { hidden: true };
    }
    v.battle.locked = locked;
  }
  return v;
}

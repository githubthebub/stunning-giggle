#!/usr/bin/env node
// Shellfire Isles — game + Island Link hub server. Zero dependencies.
//
//   node server.js            → http://localhost:8420
//   PORT=3000 node server.js  → custom port
//
// Serves the adventure + hub pages and referees multiplayer battles/trades
// over Server-Sent Events (works on any plain Node host, no websockets needed).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { MOVES } from './public/js/data.js';
import * as E from './public/js/engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 8420;
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon',
};

// ---------------- rooms ----------------
// room = { players: Map(id -> {id,name,team,res}), battles: Map, trades: Map }
const rooms = new Map();
const MAX_PLAYERS = 16, MAX_ROOMS = 200;

function getRoom(code) {
  let r = rooms.get(code);
  if (!r) {
    if (rooms.size >= MAX_ROOMS) return null;
    r = { players: new Map(), battles: new Map(), trades: new Map() };
    rooms.set(code, r);
  }
  return r;
}

function send(player, ev) {
  if (!player?.res || player.res.writableEnded) return;
  player.res.write(`data: ${JSON.stringify(ev)}\n\n`);
}
function broadcast(room, ev) { for (const p of room.players.values()) send(p, ev); }
function roster(room) {
  broadcast(room, { t:'roster', players: [...room.players.values()].map(p => ({ id: p.id, name: p.name })) });
}

function cleanName(s, max = 14) {
  return String(s || '').replace(/[<>&"']/g, '').trim().slice(0, max) || 'Trainer';
}

function publicMonState(m) {
  return { sp: m.sp, nick: m.nick, level: m.level, hp: m.hp, maxHp: m.stats.hp, status: m.status,
           moves: m.moves.map(s => ({ id: s.id, pp: s.pp })) };
}
function battleStateFor(battle, key) {
  const you = battle[key], foe = battle[key === 'a' ? 'b' : 'a'];
  return { you: you.team.map(publicMonState), foe: foe.team.map(publicMonState),
           youActive: you.active, foeActive: foe.active };
}

// ---------------- battle refereeing ----------------
function startBattle(room, p1, p2) {
  const id = crypto.randomBytes(6).toString('hex');
  const teamA = E.flat50(p1.team.map(E.reviveMonFrom));
  const teamB = E.flat50(p2.team.map(E.reviveMonFrom));
  const battle = E.makeBattle(E.makeSide(teamA, p1.name), E.makeSide(teamB, p2.name));
  const rec = { id, battle, ids: { a: p1.id, b: p2.id }, pending: {}, awaitingSwitch: null };
  room.battles.set(id, rec);
  p1.battleId = id; p2.battleId = id;
  send(p1, { t:'battle-start', battleId: id, foeName: p2.name, yourTeam: teamA.map(publicMonState), foeTeam: teamB.map(publicMonState) });
  send(p2, { t:'battle-start', battleId: id, foeName: p1.name, yourTeam: teamB.map(publicMonState), foeTeam: teamA.map(publicMonState) });
  broadcast(room, { t:'sys', text:`⚔ ${p1.name} and ${p2.name} began a battle!` });
}

function battleAction(room, player, battleId, action) {
  const rec = room.battles.get(battleId);
  if (!rec) return;
  const key = rec.ids.a === player.id ? 'a' : rec.ids.b === player.id ? 'b' : null;
  if (!key) return;

  // validate
  if (action?.type === 'move') {
    const mon = E.activeMon(rec.battle[key]);
    const slot = mon.moves[action.slot];
    if (!slot || slot.pp <= 0) return sendErr(player, 'That move is out of PP.');
  } else if (action?.type === 'switch') {
    const target = rec.battle[key].team[action.to];
    if (!target || target.hp <= 0) return sendErr(player, "Can't switch to that creature.");
  } else return;

  // mid-turn forced switch (after a faint)
  if (rec.awaitingSwitch) {
    if (rec.awaitingSwitch !== key || action.type !== 'switch') return;
    const ev = [];
    E.doSwitch(rec.battle, key, action.to, ev);
    rec.awaitingSwitch = null;
    pushEvents(room, rec, ev);
    return;
  }

  rec.pending[key] = action;
  const other = key === 'a' ? 'b' : 'a';
  if (!rec.pending[other]) return; // wait for the other side

  const ev = E.resolveTurn(rec.battle, rec.pending.a, rec.pending.b);
  rec.pending = {};
  pushEvents(room, rec, ev);
}

function pushEvents(room, rec, ev) {
  const pA = room.players.get(rec.ids.a), pB = room.players.get(rec.ids.b);
  const lines = ev.filter(e => e.text).map(e => e.text);
  const over = rec.battle.over;

  // if someone fainted but has healthy mons left, they must pick a switch
  let needSwitchA = false, needSwitchB = false;
  if (!over) {
    if (E.activeMon(rec.battle.a).hp <= 0) { needSwitchA = true; rec.awaitingSwitch = 'a'; }
    if (E.activeMon(rec.battle.b).hp <= 0) { needSwitchB = true; rec.awaitingSwitch = 'b'; }
  }

  if (pA) send(pA, { t:'battle-log', lines, state: battleStateFor(rec.battle, 'a'), needSwitch: needSwitchA });
  if (pB) send(pB, { t:'battle-log', lines, state: battleStateFor(rec.battle, 'b'), needSwitch: needSwitchB });

  if (over) {
    const winnerKey = rec.battle.winner;
    if (pA) send(pA, { t:'battle-end', youWon: winnerKey === 'a' });
    if (pB) send(pB, { t:'battle-end', youWon: winnerKey === 'b' });
    const wName = winnerKey ? rec.battle[winnerKey].name : null;
    broadcast(room, { t:'sys', text: wName ? `🏆 ${wName} won the battle!` : 'The battle ended in a draw.' });
    if (pA) pA.battleId = null;
    if (pB) pB.battleId = null;
    room.battles.delete(rec.id);
  }
}

function sendErr(player, text) { send(player, { t:'error', text }); }

// ---------------- trades ----------------
function startTrade(room, p1, p2) {
  const id = crypto.randomBytes(6).toString('hex');
  const rec = { id, a: p1.id, b: p2.id, sel: {}, confirmed: {} };
  room.trades.set(id, rec);
  p1.tradeId = id; p2.tradeId = id;
  send(p1, { t:'trade-start', tradeId: id, partner: p2.name, partnerTeam: p2.team });
  send(p2, { t:'trade-start', tradeId: id, partner: p1.name, partnerTeam: p1.team });
}

function tradeUpdate(room, rec) {
  const pA = room.players.get(rec.a), pB = room.players.get(rec.b);
  if (pA) send(pA, { t:'trade-update', partnerSel: rec.sel[rec.b] ?? null, partnerConfirmed: !!rec.confirmed[rec.b] });
  if (pB) send(pB, { t:'trade-update', partnerSel: rec.sel[rec.a] ?? null, partnerConfirmed: !!rec.confirmed[rec.a] });

  if (rec.confirmed[rec.a] && rec.confirmed[rec.b] && rec.sel[rec.a] != null && rec.sel[rec.b] != null) {
    const monA = pA.team[rec.sel[rec.a]], monB = pB.team[rec.sel[rec.b]];
    pA.team[rec.sel[rec.a]] = monB;
    pB.team[rec.sel[rec.b]] = monA;
    send(pA, { t:'trade-done', received: monB, gaveIndex: rec.sel[rec.a] });
    send(pB, { t:'trade-done', received: monA, gaveIndex: rec.sel[rec.b] });
    broadcast(room, { t:'sys', text:`⇄ ${pA.name} and ${pB.name} completed a trade!` });
    pA.tradeId = null; pB.tradeId = null;
    room.trades.delete(rec.id);
  }
}

function cancelTrade(room, rec, reason) {
  for (const pid of [rec.a, rec.b]) {
    const p = room.players.get(pid);
    if (p) { p.tradeId = null; send(p, { t:'trade-cancel', reason }); }
  }
  room.trades.delete(rec.id);
}

// ---------------- api ----------------
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => { buf += c; if (buf.length > 256 * 1024) { reject(new Error('too big')); req.destroy(); } });
    req.on('end', () => { try { resolve(JSON.parse(buf || '{}')); } catch (e) { reject(e); } });
  });
}
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type':'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function sanitizeTeam(team) {
  if (!Array.isArray(team) || !team.length) return null;
  const out = [];
  for (const d of team.slice(0, 6)) {
    try {
      const m = E.reviveMonFrom(d || {});
      out.push(E.serializeMon(m));
    } catch { return null; }
  }
  return out;
}

async function api(req, res, url) {
  if (req.method === 'POST' && url.pathname === '/api/join') {
    const body = await readBody(req);
    const code = String(body.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (!code) return json(res, 400, { error:'Room code required.' });
    const room = getRoom(code);
    if (!room) return json(res, 503, { error:'Server is full — try later.' });
    if (room.players.size >= MAX_PLAYERS) return json(res, 409, { error:'That room is full (16 max).' });
    const team = sanitizeTeam(body.team) || E.rentalTeam().map(E.serializeMon);
    const id = crypto.randomBytes(8).toString('hex');
    room.players.set(id, { id, name: cleanName(body.name), team, res: null, battleId: null, tradeId: null, lastSeen: Date.now() });
    return json(res, 200, { id, room: code });
  }

  if (req.method === 'GET' && url.pathname === '/api/events') {
    const room = rooms.get(String(url.searchParams.get('room') || '').toUpperCase());
    const player = room?.players.get(url.searchParams.get('id'));
    if (!player) return json(res, 404, { error:'Join the room first.' });
    res.writeHead(200, {
      'Content-Type':'text/event-stream', 'Cache-Control':'no-cache', Connection:'keep-alive',
      'X-Accel-Buffering':'no',
    });
    res.write('retry: 2000\n\n');
    player.res = res;
    player.lastSeen = Date.now();
    roster(room);
    broadcast(room, { t:'sys', text:`${player.name} entered the Link.` });
    const ping = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 25000);
    req.on('close', () => {
      clearInterval(ping);
      if (player.res === res) player.res = null;
      // grace period for refreshes; drop the player if they don't come back
      setTimeout(() => {
        if (player.res) return;
        const r = rooms.get(String(url.searchParams.get('room') || '').toUpperCase());
        if (!r) return;
        r.players.delete(player.id);
        for (const rec of r.battles.values())
          if (rec.ids.a === player.id || rec.ids.b === player.id) {
            const otherId = rec.ids.a === player.id ? rec.ids.b : rec.ids.a;
            const other = r.players.get(otherId);
            if (other) { send(other, { t:'battle-end', youWon: true }); other.battleId = null; }
            r.battles.delete(rec.id);
          }
        for (const rec of r.trades.values())
          if (rec.a === player.id || rec.b === player.id) cancelTrade(r, rec, 'partner left');
        broadcast(r, { t:'sys', text:`${player.name} left.` });
        roster(r);
        if (!r.players.size) rooms.delete(String(url.searchParams.get('room') || '').toUpperCase());
      }, 8000);
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/act') {
    const body = await readBody(req);
    const room = rooms.get(String(body.room || '').toUpperCase());
    const player = room?.players.get(body.id);
    if (!player) return json(res, 404, { error:'Not in a room.' });
    player.lastSeen = Date.now();

    switch (body.type) {
      case 'chat': {
        const text = String(body.text || '').slice(0, 200);
        if (text) broadcast(room, { t:'chat', from: player.name, text });
        break;
      }
      case 'challenge': {
        const target = room.players.get(body.target);
        if (!target) return json(res, 404, { error:'They left.' });
        if (target.battleId || player.battleId) return json(res, 409, { error:'Someone is already battling.' });
        send(target, { t:'challenged', from: player.name, fromId: player.id });
        break;
      }
      case 'accept': {
        const challenger = room.players.get(body.target);
        if (!challenger) return json(res, 404, { error:'They left.' });
        if (challenger.battleId || player.battleId) return json(res, 409, { error:'Busy.' });
        startBattle(room, challenger, player);
        break;
      }
      case 'decline': {
        const challenger = room.players.get(body.target);
        if (challenger) send(challenger, { t:'sys', text:`${player.name} declined the challenge.` });
        break;
      }
      case 'action':
        battleAction(room, player, body.battleId, body.action);
        break;
      case 'trade-offer': {
        const target = room.players.get(body.target);
        if (!target) return json(res, 404, { error:'They left.' });
        if (target.tradeId || player.tradeId) return json(res, 409, { error:'A trade is already open.' });
        startTrade(room, player, target);
        break;
      }
      case 'trade-select': {
        const rec = room.trades.get(body.tradeId);
        if (!rec) break;
        const idx = Number(body.index);
        if (!(idx >= 0 && idx < player.team.length)) break;
        rec.sel[player.id] = idx;
        rec.confirmed[player.id] = false;
        tradeUpdate(room, rec);
        break;
      }
      case 'trade-confirm': {
        const rec = room.trades.get(body.tradeId);
        if (!rec || rec.sel[player.id] == null) break;
        rec.confirmed[player.id] = true;
        tradeUpdate(room, rec);
        break;
      }
      case 'trade-cancel': {
        const rec = room.trades.get(body.tradeId);
        if (rec) cancelTrade(room, rec, 'cancelled');
        break;
      }
      default:
        return json(res, 400, { error:'Unknown action.' });
    }
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error:'No such endpoint.' });
}

// ---------------- static ----------------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);

    let p = url.pathname;
    if (p === '/') p = '/index.html';
    if (p === '/hub') p = '/hub.html';
    if (p === '/game') p = '/game.html';
    const file = path.normalize(path.join(PUB, p));
    if (!file.startsWith(PUB)) { res.writeHead(400); return res.end('Bad request'); }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type':'text/plain' }); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
      fs.createReadStream(file).pipe(res);
    });
  } catch (e) {
    if (!res.headersSent) json(res, 500, { error:'Server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('\n  🏝  Shellfire Isles is running');
  console.log(`  ➜  Adventure:   http://localhost:${PORT}/`);
  console.log(`  ➜  Island Link: http://localhost:${PORT}/hub\n`);
  console.log('  Friends on your network / the internet just open the same URL.\n');
});

#!/usr/bin/env node
// Shellfire Isles — self-host kernel. Zero dependencies.
//
// Runs the exact same rules module (dist-deploy/logic.js) and client bundle as
// the hosted deployment, speaking the same protocol:
//   client → {type:'join', playerId} | {type:'action', action}
//   server → {type:'state', status, seats, you, connected, view, result, meta}
//          | {type:'error', error}
// Rooms persist to disk, so Depot deposits survive restarts.
//
//   node kernel-server.js            → http://localhost:8420
//   PORT=3000 node kernel-server.js

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist-deploy');
const DATA = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 8420;
const HOST = process.env.HOST || '0.0.0.0';

if (!fs.existsSync(path.join(DIST, 'logic.js'))) {
  console.log('Building the game bundle first…');
  const r = spawnSync(process.execPath, [path.join(ROOT, 'build-deploy.mjs'), '--no-zip'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
}
const logic = await import(path.join(DIST, 'logic.js'));

// ---------------- rooms ----------------
// room = { seats: [pid], state: object|null, socks: Map(ws -> pid) }
const rooms = new Map();
const ROOMS_FILE = path.join(DATA, 'rooms.json');
fs.mkdirSync(DATA, { recursive: true });
try {
  const saved = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf8'));
  for (const [id, r] of Object.entries(saved)) rooms.set(id, { seats: r.seats, state: r.state, socks: new Map() });
  console.log(`Restored ${rooms.size} room(s) from disk.`);
} catch { /* fresh start */ }

let saveTimer = null;
function persistRooms() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const out = {};
    for (const [id, r] of rooms) out[id] = { seats: r.seats, state: r.state };
    fs.writeFile(ROOMS_FILE, JSON.stringify(out), () => {});
  }, 800);
}

function getRoom(id) {
  let r = rooms.get(id);
  if (!r) { r = { seats: [], state: null, socks: new Map() }; rooms.set(id, r); }
  return r;
}

function stateMsgFor(room, pid) {
  const connected = [...new Set(room.socks.values())];
  const status = room.state ? 'playing' : 'waiting';
  return JSON.stringify({
    type: 'state', status,
    seats: room.seats, you: pid, connected,
    view: room.state ? logic.viewFor(room.state, pid) : null,
    result: room.state ? logic.isGameOver(room.state) : null,
    meta: logic.meta,
  });
}

function broadcast(room) {
  for (const [ws, pid] of room.socks) wsSend(ws, stateMsgFor(room, pid));
  persistRooms();
}

function handleMessage(room, ws, raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (msg.type === 'join' && typeof msg.playerId === 'string' && msg.playerId.length <= 40) {
    const pid = msg.playerId;
    room.socks.set(ws, pid);
    if (!room.seats.includes(pid) && room.seats.length < logic.meta.maxPlayers) room.seats.push(pid);
    if (!room.state && room.seats.length >= logic.meta.minPlayers) room.state = logic.setup([...room.seats]);
    broadcast(room);
    return;
  }
  if (msg.type === 'action') {
    const pid = room.socks.get(ws);
    if (!pid) return wsSend(ws, JSON.stringify({ type: 'error', error: 'Join first.' }));
    if (!room.seats.includes(pid)) return wsSend(ws, JSON.stringify({ type: 'error', error: 'Spectators cannot act.' }));
    if (!room.state) return wsSend(ws, JSON.stringify({ type: 'error', error: 'Room not started yet.' }));
    let verdict;
    try { verdict = logic.validateAction(room.state, pid, msg.action); }
    catch { verdict = { ok: false, error: 'Action failed.' }; }
    if (!verdict.ok) return wsSend(ws, JSON.stringify({ type: 'error', error: verdict.error || 'Not allowed.' }));
    try { room.state = logic.applyAction(room.state, pid, msg.action); }
    catch (e) { console.error('applyAction error:', e); return wsSend(ws, JSON.stringify({ type: 'error', error: 'Action failed.' })); }
    broadcast(room);
  }
}

// ---------------- minimal RFC6455 WebSocket ----------------
function wsAccept(key) {
  return crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
}
function wsSend(sock, text) {
  if (sock.destroyed) return;
  const payload = Buffer.from(text, 'utf8');
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81; header[1] = 126; header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81; header[1] = 127; header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  sock.write(Buffer.concat([header, payload]));
}
function wsFrameParser(sock, onText, onClose) {
  let buf = Buffer.alloc(0);
  let fragments = [];
  sock.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]);
    while (true) {
      if (buf.length < 2) return;
      const fin = (buf[0] & 0x80) !== 0;
      const opcode = buf[0] & 0x0f;
      const masked = (buf[1] & 0x80) !== 0;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      const maskOff = off;
      if (masked) off += 4;
      if (buf.length < off + len) return;
      let payload = buf.subarray(off, off + len);
      if (masked) {
        const mask = buf.subarray(maskOff, maskOff + 4);
        const un = Buffer.alloc(len);
        for (let i = 0; i < len; i++) un[i] = payload[i] ^ mask[i & 3];
        payload = un;
      }
      buf = buf.subarray(off + len);
      if (opcode === 0x8) { onClose(); sock.end(); return; }
      if (opcode === 0x9) { // ping → pong
        const pong = Buffer.concat([Buffer.from([0x8a, payload.length]), payload]);
        sock.write(pong);
        continue;
      }
      if (opcode === 0x1 || opcode === 0x0) {
        fragments.push(payload);
        if (fin) {
          onText(Buffer.concat(fragments).toString('utf8'));
          fragments = [];
        }
      }
    }
  });
  sock.on('error', onClose);
  sock.on('close', onClose);
}

// ---------------- http + upgrade ----------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(DIST, p));
  if (!file.startsWith(DIST)) { res.writeHead(400); return res.end('Bad request'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});

server.on('upgrade', (req, sock) => {
  const m = (req.url || '').match(/\/ws\/([A-Za-z0-9_-]{1,32})/);
  const key = req.headers['sec-websocket-key'];
  if (!m || !key) { sock.end('HTTP/1.1 400 Bad Request\r\n\r\n'); return; }
  sock.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${wsAccept(key)}\r\n\r\n`);
  const room = getRoom(m[1]);
  const cleanup = () => {
    if (room.socks.delete(sock)) broadcast(room);
  };
  wsFrameParser(sock, text => handleMessage(room, sock, text), cleanup);
});

server.listen(PORT, HOST, () => {
  console.log('\n  🏝  Shellfire Isles — Island Depot (self-hosted)');
  console.log(`  ➜  Arena / Depot:  http://localhost:${PORT}/`);
  console.log(`  ➜  Solo adventure: http://localhost:${PORT}/assets/adventure.html`);
  console.log('\n  Friends open the same URL (share via LAN, a tunnel, or any Node host).\n');
});

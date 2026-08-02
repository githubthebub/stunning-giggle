/* gtsnet.js — the GLOBAL GTS trade board. A tiny public JSON blob is the
 * shared pool: deposit a ticket and ANY trainer playing the game can fulfill
 * it — no accounts, no server of our own. The pool's address is provisioned
 * by .github/workflows/gts-pool.yml and published as gts-pool.json. */
(function () {
  'use strict';
  const G = (window.G = window.G || {});
  // Where to find the pool address: same-origin config on the public site,
  // falling back to the repo's raw config (works from a saved file too).
  const RAW_CFG = 'https://raw.githubusercontent.com/githubthebub/stunning-giggle/claude/pokemon-dreamworld-jcu1u5/gts-pool.json';
  const LS_KEY = 'gts_pool_url_v1';
  const MAX_TRADES = 48;                     // keep the blob tiny (free-tier limits)
  const OPEN_TTL = 21 * 24 * 3600 * 1000;    // open listings last 3 weeks
  const DONE_TTL = 7 * 24 * 3600 * 1000;     // fulfilled trades wait a week for pickup
  let poolUrl = null;

  async function j(url, opt) {
    const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 9000);
    try {
      const res = await fetch(url, Object.assign({ signal: ac.signal }, opt));
      if (!res.ok) throw Object.assign(new Error('http ' + res.status), { status: res.status });
      return res;
    } finally { clearTimeout(t); }
  }

  async function discover() {
    if (window.GTS_POOL_URL) return (poolUrl = window.GTS_POOL_URL); // tests / overrides
    if (poolUrl) return poolUrl;
    try {
      const c = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (c && c.url && Date.now() - c.ts < 24 * 3600 * 1000) return (poolUrl = c.url);
    } catch (e) {}
    for (const src of ['gts-pool.json', RAW_CFG]) {
      try {
        const cfg = await (await j(src, { cache: 'no-store' })).json();
        if (cfg && cfg.url) {
          try { localStorage.setItem(LS_KEY, JSON.stringify({ url: cfg.url, ts: Date.now() })); } catch (e) {}
          return (poolUrl = cfg.url);
        }
      } catch (e) {}
    }
    throw new Error('no pool config');
  }

  function emptyPool() { return { v: 1, trades: {} }; }
  async function getPool() {
    const u = await discover();
    try { const d = await (await j(u, { cache: 'no-store' })).json(); return d && d.trades ? d : emptyPool(); }
    catch (e) { if (e.status === 404) return emptyPool(); throw e; }
  }
  function prune(pool) {
    const now = Date.now();
    const es = Object.entries(pool.trades).filter(([, t]) =>
      t && t.ts && (t.st === 'open' ? now - t.ts < OPEN_TTL : now - t.ts < DONE_TTL));
    es.sort((a, b) => b[1].ts - a[1].ts);
    pool.trades = Object.fromEntries(es.slice(0, MAX_TRADES));
  }
  async function putPool(pool) {
    prune(pool);
    let s = JSON.stringify(pool);
    while (s.length > 15000) { // free-tier value cap: drop oldest listings
      const es = Object.entries(pool.trades).sort((a, b) => a[1].ts - b[1].ts);
      if (!es.length) break;
      delete pool.trades[es[0][0]];
      s = JSON.stringify(pool);
    }
    await j(await discover(), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: s });
  }
  const rid = () => Math.random().toString(36).slice(2, 10);

  // ---- operations ----
  async function deposit(ticket) {
    const pool = await getPool(); const id = rid();
    pool.trades[id] = { st: 'open', t: ticket, ts: Date.now() };
    await putPool(pool); return id;
  }
  async function withdraw(id) { const pool = await getPool(); if (pool.trades[id]) { delete pool.trades[id]; await putPool(pool); } }
  async function listOpen() {
    const pool = await getPool();
    return Object.entries(pool.trades)
      .filter(([, t]) => t.st === 'open' && t.t)
      .map(([id, t]) => ({ id, ticket: t.t, ts: t.ts }))
      .sort((a, b) => b.ts - a.ts);
  }
  async function fulfill(id, receipt) {
    const pool = await getPool(); const t = pool.trades[id];
    if (!t || t.st !== 'open') throw new Error('trade gone');
    t.st = 'done'; t.r = receipt; t.ts = Date.now();
    await putPool(pool);
  }
  async function check(id) { const pool = await getPool(); return pool.trades[id] || null; }
  async function claim(id) { const pool = await getPool(); delete pool.trades[id]; await putPool(pool); }

  G.gtsnet = { deposit, withdraw, listOpen, fulfill, check, claim, discover };
})();

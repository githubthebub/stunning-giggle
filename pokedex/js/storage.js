/*
 * storage.js — the "caught" collection, persisted in localStorage.
 * Keyed by species id; catching a duplicate bumps its count instead of
 * adding a second entry, just like registering another sighting.
 */

const KEY = 'carddex.caught.v1';
const CAREER_KEY = 'carddex.career.v1';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
  } catch {
    return {};
  }
}

function save(d) {
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* quota */ }
}

export function allCaught() {
  return Object.values(load()).sort((a, b) => a.id - b.id);
}

export function getCaught(id) {
  return load()[id] || null;
}

export function caughtCount() {
  return Object.keys(load()).length;
}

/**
 * Career total across all catches (duplicates included) — drives ball
 * unlocks. A separate monotonic counter, NOT derived from the inventory,
 * so releasing Pokémon never takes earned unlocks away. Seeded from the
 * inventory once for saves that predate the counter.
 */
export function totalCatches() {
  const raw = localStorage.getItem(CAREER_KEY);
  if (raw != null) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  const seed = Object.values(load()).reduce((sum, m) => sum + (m.count || 1), 0);
  try { localStorage.setItem(CAREER_KEY, String(seed)); } catch { /* quota */ }
  return seed;
}

/** Store (or re-register) a catch. Returns { stored, isNew }. */
export function recordCatch(entry) {
  const career = totalCatches() + 1; // seed (if needed) BEFORE this catch lands
  const d = load();
  const now = new Date().toISOString();
  const prev = d[entry.id];
  const stored = {
    ...entry,
    count: ((prev && prev.count) || 0) + 1,
    shiny: !!(entry.shiny || (prev && prev.shiny)), // once shiny, always shiny
    firstCaughtAt: (prev && prev.firstCaughtAt) || now,
    lastCaughtAt: now,
  };
  d[entry.id] = stored;
  save(d);
  try { localStorage.setItem(CAREER_KEY, String(career)); } catch { /* quota */ }
  return { stored, isNew: !prev };
}

export function releaseMon(id) {
  const d = load();
  delete d[id];
  save(d);
}

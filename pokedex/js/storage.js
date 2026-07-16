/*
 * storage.js — the "caught" collection, persisted in localStorage.
 * Keyed by species id; catching a duplicate bumps its count instead of
 * adding a second entry, just like registering another sighting.
 */

const KEY = 'carddex.caught.v1';

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

/** Store (or re-register) a catch. Returns { stored, isNew }. */
export function recordCatch(entry) {
  const d = load();
  const now = new Date().toISOString();
  const prev = d[entry.id];
  const stored = {
    ...entry,
    count: ((prev && prev.count) || 0) + 1,
    firstCaughtAt: (prev && prev.firstCaughtAt) || now,
    lastCaughtAt: now,
  };
  d[entry.id] = stored;
  save(d);
  return { stored, isNew: !prev };
}

export function releaseMon(id) {
  const d = load();
  delete d[id];
  save(d);
}

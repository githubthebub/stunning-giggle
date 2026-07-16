/*
 * app.js — Card Dex UI: scan → identify → show entry → catch → collection.
 */

import { getSpeciesList, getEntry, prettify } from './api.js';
import { matchFromOcr, normalizeName, similarity, prepareSpecies } from './matcher.js';
import * as store from './storage.js';
import * as scanner from './scanner.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  video: $('#camera'),
  freeze: $('#freeze'),
  cameraBox: $('#camera-box'),
  cameraOff: $('#camera-off'),
  cameraOffMsg: $('#camera-off-msg'),
  scanline: $('#scanline'),
  status: $('#scan-status'),
  suggestions: $('#suggestions'),
  btnScan: $('#btn-scan'),
  btnFlip: $('#btn-flip'),
  fileInput: $('#file-input'),
  search: $('#search'),
  btnSearch: $('#btn-search'),
  datalist: $('#species-names'),
  dexGrid: $('#dex-grid'),
  dexEmpty: $('#dex-empty'),
  dexCount: $('#dex-count'),
  dexBar: $('#dex-progress-bar'),
  tabCount: $('#tab-count'),
  entryOverlay: $('#entry-overlay'),
  entryCard: $('#entry-card'),
  catchOverlay: $('#catch-overlay'),
  pokeball: $('#pokeball'),
  toast: $('#toast'),
};

const TOTAL_SPECIES_FALLBACK = 1025;
const STAT_LABELS = {
  hp: 'HP', attack: 'Attack', defense: 'Defense',
  'special-attack': 'Sp. Atk', 'special-defense': 'Sp. Def', speed: 'Speed',
};

let species = []; // prepared: [{ id, name, norm }]
let cameraOn = false;
let busy = false;
let currentEntry = null;
let entryFromDex = false;

async function init() {
  bindTabs();
  bindScan();
  bindSearch();
  bindModal();
  renderDex();

  try {
    species = prepareSpecies(await getSpeciesList());
    fillDatalist();
    renderDex(); // progress total now reflects the real species count
  } catch {
    setStatus('⚠ Could not reach the Pokédex database — search and scanning need a connection.', 'error');
  }

  startCameraSafe();
}

/* ---------------- tabs ---------------- */

function bindTabs() {
  for (const tab of document.querySelectorAll('#tabs .tab')) {
    tab.addEventListener('click', () => {
      for (const t of document.querySelectorAll('#tabs .tab')) t.classList.toggle('active', t === tab);
      for (const v of document.querySelectorAll('.view')) {
        v.classList.toggle('active', v.id === `view-${tab.dataset.view}`);
      }
    });
  }
}

/* ---------------- camera & scanning ---------------- */

async function startCameraSafe() {
  try {
    await scanner.startCamera(els.video);
    cameraOn = true;
    els.cameraOff.hidden = true;
    els.video.hidden = false;
  } catch (e) {
    cameraOn = false;
    els.video.hidden = true;
    els.cameraOff.hidden = false;
    els.cameraOffMsg.textContent = `📵 ${e && e.message ? e.message : 'Camera unavailable.'}`;
  }
}

function bindScan() {
  els.btnScan.addEventListener('click', onScan);
  els.btnFlip.addEventListener('click', async () => {
    if (busy) return;
    try {
      await scanner.flipCamera(els.video);
      cameraOn = true;
      els.cameraOff.hidden = true;
      els.video.hidden = false;
    } catch {
      setStatus('Could not switch camera.', 'error');
    }
  });
  els.fileInput.addEventListener('change', async () => {
    const file = els.fileInput.files && els.fileInput.files[0];
    els.fileInput.value = '';
    if (!file || busy) return;
    busy = true;
    try {
      const canvas = await scanner.fileToCanvas(file);
      showFreeze(canvas);
      await identifyFrom(canvas, 'photo');
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Could not scan that photo.', 'error');
    } finally {
      hideFreeze();
      busy = false;
    }
  });
}

async function onScan() {
  if (busy) return;
  if (!species.length) {
    setStatus('⚠ Pokédex database not loaded — check your connection and reload.', 'error');
    return;
  }
  if (!cameraOn) {
    setStatus('Camera is off — use 🖼 Photo instead.', 'error');
    return;
  }
  busy = true;
  els.btnScan.classList.add('busy');
  try {
    const frame = scanner.captureFrame(els.video);
    showFreeze(frame);
    await identifyFrom(frame, 'camera');
  } catch (e) {
    setStatus(e && e.message ? e.message : 'Scan failed — try again.', 'error');
  } finally {
    hideFreeze();
    els.btnScan.classList.remove('busy');
    busy = false;
  }
}

/** Where the card sits in the camera frame — mirrors the on-screen guide:
 *  a centered trading-card rectangle (63×88 mm ≈ 0.716 aspect). */
function guideRect(w, h) {
  const AR = 0.716;
  let gh = h * 0.92;
  let gw = gh * AR;
  if (gw > w * 0.92) {
    gw = w * 0.92;
    gh = gw / AR;
  }
  return { x: (w - gw) / 2, y: (h - gh) / 2, w: gw, h: gh };
}

function regionsFor(canvas, mode) {
  const w = canvas.width;
  const h = canvas.height;
  if (mode === 'camera') {
    const g = guideRect(w, h);
    return [
      // The name lives in the card's top strip — try that first, sharper.
      { rect: { x: g.x, y: g.y, w: g.w, h: g.h * 0.24 }, targetW: 1300, boost: 0.04 },
      { rect: g, targetW: 1000, boost: 0 },
    ];
  }
  return [
    { rect: { x: 0, y: 0, w, h: h * 0.32 }, targetW: 1300, boost: 0.04 },
    { rect: { x: 0, y: 0, w, h }, targetW: 1100, boost: 0 },
  ];
}

async function identifyFrom(sourceCanvas, mode) {
  hideSuggestions();
  setStatus('🔎 Warming up the scanner…');
  const collected = [];
  let match = { best: null, alternates: [] };

  for (const region of regionsFor(sourceCanvas, mode)) {
    const prepped = scanner.preprocess(sourceCanvas, region.rect, region.targetW);
    const words = await scanner.ocr(prepped, (pct) => setStatus(`🔎 Reading card… ${pct}%`));
    collected.push(...words.map((x) => ({ ...x, boost: region.boost })));
    match = matchFromOcr(collected, species);
    if (match.best) break; // confident after the name strip → skip the slow full pass
  }

  if (match.best) {
    setStatus(`✨ ${prettify(match.best.name)} identified!`);
    await openEntry(match.best.id);
  } else if (match.alternates.length) {
    setStatus('Hmm, not quite sure — did you mean:');
    showSuggestions(match.alternates.slice(0, 3));
  } else {
    setStatus("Couldn't read the card — fill the frame, avoid glare, keep the name sharp.", 'error');
  }
}

function showFreeze(canvas) {
  els.freeze.width = canvas.width;
  els.freeze.height = canvas.height;
  els.freeze.getContext('2d').drawImage(canvas, 0, 0);
  els.freeze.hidden = false;
  els.scanline.hidden = false;
}

function hideFreeze() {
  els.freeze.hidden = true;
  els.scanline.hidden = true;
}

function setStatus(msg, kind) {
  els.status.textContent = msg;
  els.status.classList.toggle('error', kind === 'error');
}

function showSuggestions(alts) {
  els.suggestions.innerHTML = '';
  for (const alt of alts) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = prettify(alt.name);
    b.addEventListener('click', () => {
      hideSuggestions();
      openEntry(alt.id);
    });
    els.suggestions.appendChild(b);
  }
  els.suggestions.hidden = false;
}

function hideSuggestions() {
  els.suggestions.hidden = true;
  els.suggestions.innerHTML = '';
}

/* ---------------- search ---------------- */

function bindSearch() {
  els.btnSearch.addEventListener('click', onSearch);
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onSearch();
  });
}

function onSearch() {
  const raw = els.search.value.trim();
  const q = normalizeName(raw);
  if (!q) return;
  if (!species.length) {
    setStatus('⚠ Pokédex database not loaded yet.', 'error');
    return;
  }
  let hit = species.find((s) => s.norm === q) || species.find((s) => s.norm.startsWith(q));
  if (!hit) {
    let bestScore = 0;
    for (const s of species) {
      const sc = similarity(q, s.norm);
      if (sc > bestScore) {
        bestScore = sc;
        hit = s;
      }
    }
    if (bestScore < 0.6) hit = null;
  }
  if (hit) {
    hideSuggestions();
    openEntry(hit.id);
  } else {
    setStatus(`No Pokémon called “${raw}” in the dex.`, 'error');
  }
}

function fillDatalist() {
  const frag = document.createDocumentFragment();
  for (const s of species) {
    const o = document.createElement('option');
    o.value = prettify(s.name);
    frag.appendChild(o);
  }
  els.datalist.replaceChildren(frag);
}

/* ---------------- entry modal ---------------- */

function bindModal() {
  els.entryOverlay.addEventListener('click', (e) => {
    if (e.target === els.entryOverlay) closeEntry();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !els.entryOverlay.hidden) closeEntry();
  });
}

async function openEntry(id, fromDex = false) {
  entryFromDex = fromDex;
  try {
    setStatus('📖 Opening Pokédex entry…');
    let entry;
    try {
      entry = await getEntry(id);
    } catch (err) {
      entry = store.getCaught(id); // offline: fall back to the saved copy
      if (!entry) throw err;
    }
    currentEntry = entry;
    renderEntry(entry);
    els.entryOverlay.hidden = false;
    setStatus('Point the camera at a Pokémon card, then press the button.');
  } catch {
    setStatus('⚠ Could not load that entry — are you online?', 'error');
  }
}

function closeEntry() {
  els.entryOverlay.hidden = true;
  currentEntry = null;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function renderEntry(entry) {
  const caught = store.getCaught(entry.id);
  const num = `#${String(entry.id).padStart(4, '0')}`;
  const types = entry.types
    .map((t) => `<span class="type-badge type-${esc(t)}">${esc(t)}</span>`)
    .join('');
  const rarity = entry.isMythical ? '<span class="rarity">✨ Mythical</span>'
    : entry.isLegendary ? '<span class="rarity">⭐ Legendary</span>' : '';

  const statRows = Object.entries(STAT_LABELS).map(([key, label]) => {
    const v = (entry.stats && entry.stats[key]) || 0;
    const pct = Math.min(100, Math.round((v / 200) * 100));
    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <span class="stat-value">${v}</span>
        <div class="stat-track"><div class="stat-bar" style="width:${pct}%"></div></div>
      </div>`;
  }).join('');

  els.entryCard.innerHTML = `
    <button class="entry-close" aria-label="Close">✕</button>
    <header class="entry-head">
      <span class="entry-no">${num}</span>
      <h2>${esc(entry.displayName)}</h2>
      <span class="entry-genus">${esc(entry.genus || '')}</span>
      ${rarity}
      ${caught ? `<span class="caught-badge">✔ Caught${caught.count > 1 ? ` ×${caught.count}` : ''}</span>` : ''}
    </header>
    <div class="entry-art">${entry.artwork ? `<img src="${esc(entry.artwork)}" alt="${esc(entry.displayName)}" />` : '❔'}</div>
    <div class="entry-types">${types}</div>
    ${entry.flavor ? `<p class="entry-flavor">${esc(entry.flavor)}</p>` : ''}
    <p class="entry-meta">Height <b>${entry.heightM} m</b> · Weight <b>${entry.weightKg} kg</b></p>
    <div class="entry-stats">${statRows}</div>
    <div class="entry-actions">
      ${entry.cry ? '<button id="btn-cry" class="btn btn-ghost">🔊 Cry</button>' : ''}
      <button id="btn-catch" class="btn btn-catch">${caught ? '● Catch again' : '● Catch!'}</button>
      ${caught && entryFromDex ? '<button id="btn-release" class="btn btn-ghost">Release</button>' : ''}
    </div>
    ${caught ? `<p class="entry-caughtat">First caught ${new Date(caught.firstCaughtAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>` : ''}
  `;

  els.entryCard.querySelector('.entry-close').addEventListener('click', closeEntry);
  els.entryCard.querySelector('#btn-catch').addEventListener('click', onCatch);
  const cryBtn = els.entryCard.querySelector('#btn-cry');
  if (cryBtn) {
    cryBtn.addEventListener('click', () => {
      const a = new Audio(entry.cry);
      a.volume = 0.5;
      a.play().catch(() => {});
    });
  }
  const releaseBtn = els.entryCard.querySelector('#btn-release');
  if (releaseBtn) {
    releaseBtn.addEventListener('click', () => {
      if (!window.confirm(`Release ${entry.displayName} from your Pokédex?`)) return;
      store.releaseMon(entry.id);
      renderDex();
      closeEntry();
      toast(`${entry.displayName} was released. Bye bye!`);
    });
  }
}

/* ---------------- catching ---------------- */

async function onCatch() {
  if (!currentEntry) return;
  const entry = currentEntry;
  const btn = els.entryCard.querySelector('#btn-catch');
  if (btn) btn.disabled = true;

  await playCatchAnimation();

  const { stored, isNew } = store.recordCatch({
    id: entry.id,
    name: entry.name,
    displayName: entry.displayName,
    genus: entry.genus,
    flavor: entry.flavor,
    types: entry.types,
    stats: entry.stats,
    heightM: entry.heightM,
    weightKg: entry.weightKg,
    artwork: entry.artwork,
    sprite: entry.sprite,
    cry: entry.cry,
    isLegendary: entry.isLegendary,
    isMythical: entry.isMythical,
  });

  renderDex();
  if (currentEntry && currentEntry.id === entry.id) renderEntry(currentEntry);
  toast(isNew
    ? `Gotcha! ${entry.displayName} was caught and added to your Pokédex!`
    : `${entry.displayName} was caught again! (×${stored.count})`);
}

function playCatchAnimation() {
  return new Promise((resolve) => {
    els.catchOverlay.hidden = false;
    els.pokeball.classList.remove('wobble');
    // restart the CSS animation even on back-to-back catches
    void els.pokeball.offsetWidth;
    els.pokeball.classList.add('wobble');
    setTimeout(() => {
      els.catchOverlay.hidden = true;
      resolve();
    }, 1900);
  });
}

let toastTimer = null;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.remove('show');
    els.toast.hidden = true;
  }, 2800);
}

/* ---------------- dex view ---------------- */

function renderDex() {
  const caught = store.allCaught();
  const total = species.length || TOTAL_SPECIES_FALLBACK;

  els.dexCount.textContent = `${caught.length} / ${total} caught`;
  els.dexBar.style.width = `${Math.min(100, (caught.length / total) * 100)}%`;
  els.tabCount.hidden = caught.length === 0;
  els.tabCount.textContent = String(caught.length);
  els.dexEmpty.hidden = caught.length > 0;

  const frag = document.createDocumentFragment();
  for (const mon of caught) {
    const cell = document.createElement('button');
    cell.className = 'dex-cell';
    cell.innerHTML = `
      <img src="${esc(mon.sprite || mon.artwork || '')}" alt="" loading="lazy" />
      <span class="dex-cell-no">#${String(mon.id).padStart(4, '0')}</span>
      <span class="dex-cell-name">${esc(mon.displayName || prettify(mon.name))}</span>
      ${mon.count > 1 ? `<span class="dex-cell-count">×${mon.count}</span>` : ''}
    `;
    cell.addEventListener('click', () => openEntry(mon.id, true));
    frag.appendChild(cell);
  }
  els.dexGrid.replaceChildren(frag);
}

init();

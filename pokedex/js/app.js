/*
 * app.js — Card Dex UI: scan → identify → show entry → catch → collection.
 */

import { getSpeciesList, getEntry, prettify } from './api.js';
import { matchFromOcr, normalizeName, similarity, prepareSpecies } from './matcher.js';
import { BALLS, ballById, catchProbability, rollCatch, rollShiny, breakoutText } from './game.js';
import { sfx } from './sfx.js';
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
  btnTorch: $('#btn-torch'),
  btnCameraRetry: $('#btn-camera-retry'),
  cameraSelect: $('#camera-select'),
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
  catchStars: $('#catch-stars'),
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
let encounterShiny = false; // rolled once per wild encounter (scan/search)
let attemptCount = 0;       // failed throws this encounter — feeds the pity ramp
let selectedBallId = 'poke';
let throwing = false;

async function init() {
  bindTabs();
  bindScan();
  bindSearch();
  bindModal();
  renderDex();

  // Pre-create the audio context on the first tap so post-scan jingles play.
  document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  registerServiceWorker();

  try {
    species = prepareSpecies(await getSpeciesList());
    fillDatalist();
    renderDex(); // progress total now reflects the real species count
  } catch {
    setStatus('⚠ Could not reach the Pokédex database — search and scanning need a connection.', 'error');
  }

  startCameraSafe();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').catch(() => { /* http dev server etc. */ });
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

const CAMERA_PREF_KEY = 'carddex.camera.v1';

function friendlyCameraError(e) {
  const name = (e && e.name) || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access is blocked for this site. Click the camera/lock icon in your browser’s address bar, allow the camera, then press Enable camera.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera found on this device — scan a photo instead, or search by name.';
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'The camera is busy in another app (Zoom, Teams, OBS…?). Close it, then press Enable camera.';
  }
  return (e && e.message) || 'Camera unavailable.';
}

async function startCameraSafe(deviceId = null) {
  const preferred = deviceId || localStorage.getItem(CAMERA_PREF_KEY) || null;
  try {
    try {
      await scanner.startCamera(els.video, undefined, preferred);
    } catch (err) {
      // A remembered camera may have been unplugged — fall back to any camera.
      if (!preferred) throw err;
      localStorage.removeItem(CAMERA_PREF_KEY);
      await scanner.startCamera(els.video);
    }
    cameraOn = true;
    els.cameraOff.hidden = true;
    els.video.hidden = false;
    updateTorchButton();
    fillCameraPicker();
  } catch (e) {
    cameraOn = false;
    els.video.hidden = true;
    els.cameraOff.hidden = false;
    els.cameraOffMsg.textContent = `📵 ${friendlyCameraError(e)}`;
  }
}

/** Laptops often have several webcams — offer a picker when they do. */
async function fillCameraPicker() {
  const cams = await scanner.listCameras();
  if (cams.length < 2) {
    els.cameraSelect.hidden = true;
    return;
  }
  const active = scanner.activeCameraId();
  els.cameraSelect.innerHTML = '';
  cams.forEach((cam, i) => {
    const o = document.createElement('option');
    o.value = cam.deviceId;
    o.textContent = cam.label || `Camera ${i + 1}`;
    if (cam.deviceId === active) o.selected = true;
    els.cameraSelect.appendChild(o);
  });
  els.cameraSelect.hidden = false;
}

let torchOn = false;
let torchBusy = false;
function updateTorchButton() {
  torchOn = false;
  torchBusy = false;
  els.btnTorch.classList.remove('active');
  els.btnTorch.hidden = !scanner.torchSupported();
  // Android Chrome may not report torch capability until the track settles.
  setTimeout(() => {
    if (cameraOn && scanner.torchSupported()) els.btnTorch.hidden = false;
  }, 700);
}

function bindScan() {
  els.btnScan.addEventListener('click', onScan);
  els.btnFlip.addEventListener('click', async () => {
    if (busy) return;
    try {
      try { localStorage.removeItem(CAMERA_PREF_KEY); } catch { /* quota */ }
      await scanner.flipCamera(els.video);
      cameraOn = true;
      els.cameraOff.hidden = true;
      els.video.hidden = false;
      updateTorchButton();
      fillCameraPicker();
    } catch {
      setStatus('Could not switch camera.', 'error');
    }
  });
  els.btnTorch.addEventListener('click', async () => {
    if (torchBusy) return;
    torchBusy = true;
    const next = !torchOn;
    try {
      if (await scanner.setTorch(next)) {
        torchOn = next;
        els.btnTorch.classList.toggle('active', torchOn);
      }
    } finally {
      torchBusy = false;
    }
  });
  els.fileInput.addEventListener('change', () => {
    const file = els.fileInput.files && els.fileInput.files[0];
    els.fileInput.value = '';
    scanFile(file);
  });
  els.btnCameraRetry.addEventListener('click', () => {
    els.cameraOffMsg.textContent = '🎥 Asking for the camera…';
    startCameraSafe();
  });
  els.cameraSelect.addEventListener('change', () => {
    const id = els.cameraSelect.value;
    try { localStorage.setItem(CAMERA_PREF_KEY, id); } catch { /* quota */ }
    startCameraSafe(id);
  });

  // Desktop niceties: drop a card image onto the viewfinder, or paste one.
  els.cameraBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.cameraBox.classList.add('dropping');
  });
  els.cameraBox.addEventListener('dragleave', () => els.cameraBox.classList.remove('dropping'));
  els.cameraBox.addEventListener('drop', (e) => {
    e.preventDefault();
    els.cameraBox.classList.remove('dropping');
    const file = [...((e.dataTransfer && e.dataTransfer.files) || [])].find((f) => f.type.startsWith('image/'));
    if (file) scanFile(file);
  });
  document.addEventListener('paste', (e) => {
    const file = [...((e.clipboardData && e.clipboardData.files) || [])].find((f) => f.type.startsWith('image/'));
    if (file) scanFile(file);
  });
}

async function scanFile(file) {
  if (!file || busy) return;
  if (!species.length) {
    setStatus('⚠ Pokédex database not loaded — check your connection and reload.', 'error');
    return;
  }
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
  if (throwing) return; // don't hijack an in-flight throw
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
    attemptCount = 0;
    if (fromDex) {
      const caught = store.getCaught(id);
      encounterShiny = !!(caught && caught.shiny);
    } else {
      encounterShiny = rollShiny();
      if (encounterShiny) sfx.shiny();
    }
    renderEntry(entry);
    els.entryOverlay.hidden = false;
    setStatus('Point the camera at a Pokémon card, then press the button.');
  } catch {
    setStatus('⚠ Could not load that entry — are you online?', 'error');
  }
}

function closeEntry() {
  if (throwing) return; // no running from a battle mid-throw
  els.entryOverlay.hidden = true;
  currentEntry = null;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function renderEntry(entry) {
  const caught = store.getCaught(entry.id);
  const num = esc(`#${String(entry.id).padStart(4, '0')}`);
  const shiny = encounterShiny;
  const art = (shiny && entry.artworkShiny) || entry.artwork;
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

  const total = store.totalCatches();
  if (total < ballById(selectedBallId).unlockAt) selectedBallId = 'poke'; // never keep a locked ball selected
  const nextLocked = BALLS.find((b) => total < b.unlockAt);
  const ballRow = BALLS.map((b) => {
    const locked = total < b.unlockAt;
    const pct = Math.round(catchProbability(entry.captureRate, b.mult, attemptCount) * 100);
    return `
      <button class="ball-option${b.id === selectedBallId ? ' selected' : ''}${locked ? ' locked' : ''}"
              data-ball="${b.id}" ${locked ? 'disabled' : ''}
              title="${esc(b.name)}${locked ? ` — unlocks at ${b.unlockAt} catches` : ''}">
        <span class="ball-icon" style="--ball-top:${b.top}"></span>
        <span class="ball-name">${esc(b.name.replace(' Ball', ''))}</span>
        <span class="ball-odds">${locked ? '🔒' : `${pct}%`}</span>
      </button>`;
  }).join('');

  els.entryCard.innerHTML = `
    <button class="entry-close" aria-label="Close">✕</button>
    <header class="entry-head">
      <span class="entry-no">${num}</span>
      <h2>${shiny ? '✨ ' : ''}${esc(entry.displayName)}</h2>
      <span class="entry-genus">${esc(entry.genus || '')}</span>
      ${shiny && !entryFromDex ? '<span class="shiny-banner">✨ It’s a SHINY! ✨</span>' : ''}
      ${rarity}
      ${caught ? `<span class="caught-badge">✔ Caught${caught.count > 1 ? ` ×${caught.count}` : ''}${caught.shiny ? ' ✨' : ''}</span>` : ''}
    </header>
    <div class="entry-art${shiny ? ' shiny' : ''}">${art ? `<img src="${esc(art)}" alt="${esc(entry.displayName)}" crossorigin="anonymous" />` : '❔'}</div>
    <div class="entry-types">${types}</div>
    ${entry.flavor ? `<p class="entry-flavor">${esc(entry.flavor)}</p>` : ''}
    <p class="entry-meta">Height <b>${entry.heightM} m</b> · Weight <b>${entry.weightKg} kg</b></p>
    <div class="entry-stats">${statRows}</div>
    <div class="ball-row">${ballRow}</div>
    ${nextLocked ? `<p class="unlock-hint">🎯 ${total} career catches — ${esc(nextLocked.name)} unlocks at ${nextLocked.unlockAt}</p>` : ''}
    <div class="entry-actions">
      ${entry.cry ? '<button id="btn-cry" class="btn btn-ghost">🔊 Cry</button>' : ''}
      <button id="btn-catch" class="btn btn-catch">● Throw!</button>
      ${caught && entryFromDex ? '<button id="btn-release" class="btn btn-ghost">Release</button>' : ''}
    </div>
    ${caught ? `<p class="entry-caughtat">First caught ${new Date(caught.firstCaughtAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>` : ''}
  `;

  els.entryCard.querySelector('.entry-close').addEventListener('click', closeEntry);
  els.entryCard.querySelector('#btn-catch').addEventListener('click', onThrow);
  for (const btn of els.entryCard.querySelectorAll('.ball-option')) {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      selectedBallId = btn.dataset.ball;
      for (const b of els.entryCard.querySelectorAll('.ball-option')) {
        b.classList.toggle('selected', b === btn);
      }
    });
  }
  const cryBtn = els.entryCard.querySelector('#btn-cry');
  if (cryBtn) {
    cryBtn.addEventListener('click', () => {
      const a = new Audio();
      a.crossOrigin = 'anonymous';
      a.src = entry.cry;
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function onThrow() {
  if (!currentEntry || throwing) return;
  throwing = true;
  // Snapshot everything the throw depends on — the awaited animation takes
  // seconds, and module state may be redirected at another entry meanwhile.
  const entry = currentEntry;
  const shiny = encounterShiny;
  if (store.totalCatches() < ballById(selectedBallId).unlockAt) selectedBallId = 'poke';
  const ball = ballById(selectedBallId);
  const btn = els.entryCard.querySelector('#btn-catch');
  if (btn) btn.disabled = true;

  const p = catchProbability(entry.captureRate, ball.mult, attemptCount);
  const { caught, shakes } = rollCatch(p);

  await playThrowAnimation(ball, shakes, caught);

  if (caught) {
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
      artworkShiny: entry.artworkShiny,
      sprite: entry.sprite,
      spriteShiny: entry.spriteShiny,
      cry: entry.cry,
      captureRate: entry.captureRate,
      isLegendary: entry.isLegendary,
      isMythical: entry.isMythical,
      shiny,
    });
    sfx.gotcha();
    if (isNew) {
      sfx.newEntry();
      spawnConfetti(shiny ? 70 : 40);
    }
    if (currentEntry === entry) attemptCount = 0; // fresh odds for the next ball
    renderDex();
    toast(isNew
      ? `Gotcha! ${shiny ? '✨ SHINY ' : ''}${entry.displayName} was caught and added to your Pokédex!`
      : `${entry.displayName} was caught again! (×${stored.count})`);
  } else {
    if (currentEntry === entry) attemptCount++; // pity ramp: next throw gets better odds
    sfx.breakout();
    toast(breakoutText(shakes, entry.displayName));
  }

  if (currentEntry && currentEntry.id === entry.id) renderEntry(currentEntry);
  throwing = false;
}

/** Drop the ball in, shake 0–3 times, then either click shut or burst open. */
async function playThrowAnimation(ball, shakes, caught) {
  const ballEl = els.pokeball;
  ballEl.className = '';
  ballEl.querySelector('.ball-top').style.background =
    `linear-gradient(180deg, ${ball.top}, ${ball.top})`;
  els.catchStars.hidden = true;
  els.catchOverlay.hidden = false;

  sfx.throw();
  ballEl.classList.add('drop');
  await wait(600);
  sfx.bounce();
  await wait(350);

  for (let i = 0; i < shakes; i++) {
    ballEl.classList.remove('shake');
    void ballEl.offsetWidth; // restart the animation
    sfx.shake();
    ballEl.classList.add('shake');
    await wait(650);
  }

  if (caught) {
    ballEl.classList.add('clicked');
    els.catchStars.hidden = false;
    await wait(900);
  } else {
    ballEl.classList.add('burst');
    await wait(600);
  }

  els.catchOverlay.hidden = true;
  ballEl.className = '';
}

function spawnConfetti(n = 40) {
  let host = document.getElementById('confetti');
  if (!host) {
    host = document.createElement('div');
    host.id = 'confetti';
    document.body.appendChild(host);
  }
  const colors = ['#ff5b4d', '#ffd23e', '#58e07c', '#3fc1ff', '#d685ad', '#fff'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.style.left = `${Math.random() * 100}vw`;
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 0.4}s`;
    s.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
    host.appendChild(s);
    setTimeout(() => s.remove(), 3000);
  }
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
    cell.className = mon.shiny ? 'dex-cell shiny' : 'dex-cell';
    const sprite = (mon.shiny && mon.spriteShiny) || mon.sprite || mon.artwork || '';
    cell.innerHTML = `
      <img src="${esc(sprite)}" alt="" loading="lazy" crossorigin="anonymous" />
      <span class="dex-cell-no">${esc(`#${String(mon.id).padStart(4, '0')}`)}</span>
      <span class="dex-cell-name">${mon.shiny ? '✨' : ''}${esc(mon.displayName || prettify(mon.name))}</span>
      ${mon.count > 1 ? `<span class="dex-cell-count">×${mon.count}</span>` : ''}
    `;
    cell.addEventListener('click', () => openEntry(mon.id, true));
    frag.appendChild(cell);
  }
  els.dexGrid.replaceChildren(frag);
}

init();

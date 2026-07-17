/*
 * game.js — the "playable" part of the Card Dex: catch mechanics.
 * Pure functions (no DOM, no audio) so they run under Node for tests.
 *
 * Every species has a real capture rate from the games (3 for Mewtwo,
 * 255 for Caterpie). Throwing a ball runs three shake checks, exactly
 * like the classic games' feel: pass all three and it's caught, fail one
 * and it breaks free — then you throw again, with a small "pity" ramp so
 * a legendary can't stonewall you forever.
 */

export const BALLS = [
  { id: 'poke',   name: 'Poké Ball',   mult: 1,        unlockAt: 0,
    top: '#d5232d', label: 'P' },
  { id: 'great',  name: 'Great Ball',  mult: 1.5,      unlockAt: 10,
    top: '#2f6fd6', label: 'G' },
  { id: 'ultra',  name: 'Ultra Ball',  mult: 2,        unlockAt: 25,
    top: '#3a3a3a', label: 'U' },
  { id: 'master', name: 'Master Ball', mult: Infinity, unlockAt: 60,
    top: '#7d4bd0', label: 'M' },
];

export function ballById(id) {
  return BALLS.find((b) => b.id === id) || BALLS[0];
}

/** Balls available at a given career total of catches. */
export function unlockedBalls(totalCatches) {
  return BALLS.filter((b) => totalCatches >= b.unlockAt);
}

/**
 * Chance this throw catches the Pokémon.
 * captureRate: 3–255 from PokéAPI; attempt: how many balls already broke
 * free this encounter (each adds +15% relative — the pity ramp).
 * Master Ball (mult Infinity) never fails. Clamped to [0.12, 0.95] so
 * nothing is a guaranteed catch and nothing is hopeless.
 */
export function catchProbability(captureRate, ballMult = 1, attempt = 0) {
  if (!Number.isFinite(ballMult)) return 1;
  const rate = Number.isFinite(captureRate) ? captureRate : 128;
  // Floor BEFORE the pity ramp, so every failed throw visibly improves the
  // odds even for rate-3 legendaries (12% → 13.8% → 15.9% → …).
  const base = Math.max(0.12, (rate / 255) * ballMult);
  return Math.min(0.95, base * (1 + attempt * 0.15));
}

/**
 * Run the three shake checks. Each shake passes with probability
 * cbrt(p), so the overall catch chance is exactly p.
 * Returns { caught, shakes } with shakes in 0–3.
 */
export function rollCatch(p, rng = Math.random) {
  if (p >= 1) return { caught: true, shakes: 3 };
  const q = Math.cbrt(p);
  let shakes = 0;
  for (let i = 0; i < 3; i++) {
    if (rng() < q) shakes++;
    else break;
  }
  return { caught: shakes === 3, shakes };
}

export const SHINY_ODDS = 1 / 64;

/** Rolled once per wild encounter (scan/search), never from the dex. */
export function rollShiny(rng = Math.random) {
  return rng() < SHINY_ODDS;
}

/** Flavor line for a failed throw, by how close it was. */
export function breakoutText(shakes, displayName) {
  if (shakes <= 0) return `Oh no! ${displayName} broke free instantly!`;
  if (shakes === 1) return `Aww! It appeared to be caught!`;
  return `Gah! It was so close, too!`;
}

/*
 * matcher.js — turns noisy OCR output from a photographed trading card into a
 * Pokémon species match. Pure functions, no DOM: also runnable under Node.
 *
 * Card text is messy: "Charizard ex", "Dark Blastoise", "HP 220", "Stage 2",
 * attack names, flavor text… The strategy is to normalize every OCR word,
 * build unigram + bigram candidates ("mr"+"mime" → "mrmime"), throw away
 * known card vocabulary, and fuzzy-match the rest against every species name.
 */

export const STRONG_SCORE = 0.9; // open the entry without asking
export const ACCEPT_SCORE = 0.74; // confident match
export const CONFIRM_SCORE = 0.6; // below STRONG but ≥ this → "Is it X?" confirm step
export const SUGGEST_SCORE = 0.55; // above this → offered as a "did you mean?" chip

// Words that appear on nearly every card and must never be treated as a name.
const NOISE_WORDS = new Set([
  'basic', 'stage', 'stagel', 'stage1', 'stage2', 'evolves', 'from', 'put',
  'onto', 'the', 'and', 'this', 'that', 'your', 'card', 'cards', 'bench',
  'hp', 'ability', 'poke', 'body', 'power', 'weakness', 'resistance',
  'retreat', 'cost', 'pokemon', 'trainer', 'energy', 'item', 'supporter',
  'stadium', 'tool', 'illus', 'level', 'attack', 'damage', 'coin', 'flip',
  'heads', 'tails', 'each', 'opponent', 'opponents', 'active', 'vmax',
  'vstar', 'vunion', 'break', 'prime', 'legend', 'radiant', 'shining',
  'dark', 'light', 'team', 'rocket', 'rockets', 'galarian', 'alolan',
  'hisuian', 'paldean', 'origin', 'forme', 'form', 'tag', 'mega', 'delta',
  'species', 'length', 'weight',
]);

/** Lowercase, strip accents (Pokémon → pokemon, Flabébé → flabebe) and
 *  everything that isn't a letter or digit ("Mr. Mime" → "mrmime"). */
export function normalizeName(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Classic two-row Levenshtein distance. */
export function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** 1 = identical, 0 = nothing in common. */
export function similarity(a, b) {
  if (!a.length || !b.length) return 0;
  if (a === b) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/** Precompute normalized names once so matching stays fast. */
export function prepareSpecies(list) {
  return list.map((s) => ({ ...s, norm: normalizeName(s.name) }));
}

/**
 * Turn OCR words into candidate name strings.
 * words: [{ text, y0?, boost? }] — y0 is the word's vertical position within
 * its scanned region (0 = top), boost is a per-region score bonus (the strip
 * at the top of the card, where the name lives, gets a small edge).
 */
export function extractCandidates(words) {
  const toks = [];
  for (const w of words) {
    const norm = normalizeName(w?.text ?? '');
    if (norm.length < 2 || /^\d+$/.test(norm)) continue;
    toks.push({ norm, y0: w.y0 ?? 0.5, boost: w.boost ?? 0 });
  }

  const cands = new Map();
  const push = (norm, weight) => {
    if (norm.length < 3 || norm.length > 24) return;
    if (NOISE_WORDS.has(norm)) return;
    const prev = cands.get(norm);
    if (!prev || prev.weight < weight) cands.set(norm, { norm, weight });
  };

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    const prev1 = i > 0 ? toks[i - 1].norm : '';
    const prev2 = i > 1 ? toks[i - 2].norm : '';
    // "Evolves from Charmeleon" sits right next to the name on real cards and
    // names a DIFFERENT Pokémon — knock those below the auto-accept bar.
    const evolvesFrom = prev1 === 'from' || prev1 === 'evolves' || prev2 === 'evolves';
    let weight = t.boost + (t.y0 <= 0.35 ? 0.03 : 0); // names sit near the top
    if (evolvesFrom) weight -= 0.4;
    push(t.norm, weight);
    // OCR often glues the rarity suffix onto the name: "Charizardex", "PikachuV"
    const stem = t.norm.replace(/(vmax|vstar|ex|gx|v)$/, '');
    if (stem !== t.norm && stem.length >= 4) push(stem, weight);
    if (i + 1 < toks.length) push(t.norm + toks[i + 1].norm, weight);
    if (i + 2 < toks.length) push(t.norm + toks[i + 1].norm + toks[i + 2].norm, weight);
  }
  return [...cands.values()];
}

/**
 * Match OCR words against a prepared species list.
 * Returns { best, alternates } where best is null unless a species scored
 * at least ACCEPT_SCORE, and alternates holds up to 5 runners-up for a
 * "did you mean?" prompt.
 */
export function matchFromOcr(words, species) {
  const cands = extractCandidates(words);
  if (!cands.length || !species.length) return { best: null, alternates: [] };

  const scored = [];
  for (const s of species) {
    let best = 0;
    let via = null;
    for (const c of cands) {
      let sc;
      if (s.norm.length >= 5 && c.norm.length > s.norm.length && c.norm.includes(s.norm)) {
        // The name is buried inside glued OCR text ("kingdragx220hp") —
        // Levenshtein on the whole string would miss it entirely.
        sc = 0.92 + c.weight;
      } else if (Math.abs(c.norm.length - s.norm.length) / Math.max(c.norm.length, s.norm.length) > 0.5) {
        continue; // hopeless length mismatch — skip the Levenshtein cost
      } else {
        sc = similarity(c.norm, s.norm) + c.weight;
      }
      if (sc > best) {
        best = sc;
        via = c.norm;
      }
    }
    if (best >= SUGGEST_SCORE) scored.push({ id: s.id, name: s.name, score: Math.min(best, 1), via });
  }

  scored.sort((a, b) => b.score - a.score || a.id - b.id);
  const best = scored.length && scored[0].score >= ACCEPT_SCORE ? scored[0] : null;
  return { best, alternates: scored.slice(0, 5) };
}

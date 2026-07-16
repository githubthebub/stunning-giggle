/*
 * api.js — thin PokéAPI (pokeapi.co) client.
 * The species list is fetched once and cached in localStorage; individual
 * entries are fetched on demand and shaped into the flat object the UI uses.
 */

const API_BASE = 'https://pokeapi.co/api/v2';
const SPECIES_KEY = 'carddex.species.v1';

/** "mr-mime" → "Mr Mime" — for datalists and fallbacks; real display names
 *  come from the species endpoint. */
export function prettify(apiName) {
  return String(apiName)
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** All species as [{ id, name }], cached forever (the dex rarely grows). */
export async function getSpeciesList() {
  try {
    const cached = JSON.parse(localStorage.getItem(SPECIES_KEY));
    if (Array.isArray(cached) && cached.length) return cached;
  } catch { /* corrupted cache — refetch */ }

  const res = await fetch(`${API_BASE}/pokemon-species?limit=2000&offset=0`);
  if (!res.ok) throw new Error(`PokeAPI ${res.status}`);
  const data = await res.json();
  const list = (data.results || [])
    .map((r) => {
      const m = /\/(\d+)\/?$/.exec(r.url || '');
      return m ? { id: Number(m[1]), name: r.name } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

  if (!list.length) throw new Error('PokeAPI returned no species');
  try { localStorage.setItem(SPECIES_KEY, JSON.stringify(list)); } catch { /* quota — fine */ }
  return list;
}

/** Full display entry for one species id. */
export async function getEntry(id) {
  const [pRes, sRes] = await Promise.all([
    fetch(`${API_BASE}/pokemon/${id}`),
    fetch(`${API_BASE}/pokemon-species/${id}`),
  ]);
  if (!pRes.ok || !sRes.ok) throw new Error('PokeAPI entry fetch failed');
  const [p, s] = await Promise.all([pRes.json(), sRes.json()]);

  const en = (arr) => (arr || []).find((x) => x.language && x.language.name === 'en');
  const flavors = (s.flavor_text_entries || []).filter((f) => f.language && f.language.name === 'en');
  const flavor = (flavors.length ? flavors[flavors.length - 1].flavor_text : '')
    .replace(/[\n\f\r­]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stats = {};
  for (const st of p.stats || []) stats[st.stat.name] = st.base_stat;

  return {
    id: s.id,
    name: s.name,
    displayName: (en(s.names) || {}).name || prettify(s.name),
    genus: (en(s.genera) || {}).genus || '',
    flavor,
    types: (p.types || [])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => t.type.name),
    stats,
    heightM: (p.height ?? 0) / 10,
    weightKg: (p.weight ?? 0) / 10,
    artwork:
      (p.sprites && p.sprites.other && p.sprites.other['official-artwork'] &&
        p.sprites.other['official-artwork'].front_default) ||
      (p.sprites && p.sprites.front_default) || '',
    sprite: (p.sprites && p.sprites.front_default) || '',
    cry: (p.cries && (p.cries.latest || p.cries.legacy)) || '',
    isLegendary: !!s.is_legendary,
    isMythical: !!s.is_mythical,
  };
}

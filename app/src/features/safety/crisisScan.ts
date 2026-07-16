/**
 * Crisis keyword scanning.
 *
 * Scans user free-text on-device against the maintained keyword list
 * (src/data/content/safety/crisisKeywords.json). Matching is case-insensitive
 * with word-boundary handling to reduce false positives (so "died laughing"
 * does not match a bare "die"-style phrase). This is a routing signal ONLY —
 * on a match the app shows the calm crisis screen with hotline info. It never
 * counsels, diagnoses, or scores severity.
 *
 * Nothing here leaves the device.
 */

export type CrisisScanResult = {
  matched: boolean;
  matches: string[];
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns which keywords/phrases were found in `text`. A keyword matches when it
 * appears bounded by non-alphanumeric characters (or string edges), so multi-word
 * phrases and single words both work without matching inside larger words.
 */
export function scanForCrisis(text: string, keywords: string[]): CrisisScanResult {
  if (!text || !keywords.length) return { matched: false, matches: [] };

  // Collapse whitespace and pad so boundary checks work at the edges.
  const haystack = ` ${text.toLowerCase().replace(/\s+/g, ' ')} `;
  const matches: string[] = [];

  for (const raw of keywords) {
    const keyword = raw.toLowerCase().trim();
    if (!keyword) continue;
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(keyword)}($|[^a-z0-9])`);
    if (pattern.test(haystack)) matches.push(raw);
  }

  return { matched: matches.length > 0, matches };
}

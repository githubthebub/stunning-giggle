/**
 * Pattern recurrence detection.
 *
 * Deliberately simple and transparent: this is counting, not inference. It
 * counts how often a pattern tag has been logged inside a rolling time window
 * and surfaces a gentle call-out when the count crosses a configured threshold.
 * There is no modelling, no prediction — just "you've flagged X five times".
 */
import { appConfig } from '../../config/appConfig';

export type PatternEvent = {
  tag: string;
  /** ISO timestamp. */
  at: string;
  source?: string;
};

export type PatternInsight = {
  tag: string;
  count: number;
  windowDays: number;
  firstAt: string;
  lastAt: string;
};

export type DetectorOptions = {
  windowDays?: number;
  minOccurrences?: number;
  now?: Date;
};

export function detectRecurrences(
  events: PatternEvent[],
  options: DetectorOptions = {},
): PatternInsight[] {
  const windowDays = options.windowDays ?? appConfig.patterns.windowDays;
  const minOccurrences = options.minOccurrences ?? appConfig.patterns.minOccurrences;
  const now = options.now ?? new Date();
  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;

  const byTag = new Map<string, PatternEvent[]>();
  for (const event of events) {
    const t = Date.parse(event.at);
    if (Number.isNaN(t) || t < cutoff || t > now.getTime()) continue;
    const list = byTag.get(event.tag) ?? [];
    list.push(event);
    byTag.set(event.tag, list);
  }

  const insights: PatternInsight[] = [];
  for (const [tag, list] of byTag.entries()) {
    if (list.length < minOccurrences) continue;
    const sorted = [...list].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    insights.push({
      tag,
      count: list.length,
      windowDays,
      firstAt: sorted[0].at,
      lastAt: sorted[sorted.length - 1].at,
    });
  }

  // Strongest recurrence first; stable tie-break by tag.
  insights.sort((a, b) => (b.count !== a.count ? b.count - a.count : a.tag < b.tag ? -1 : 1));
  return insights;
}

/**
 * Apply a cooldown so the same call-out isn't repeated too often. `lastSurfaced`
 * maps tag -> ISO timestamp it was last shown to the user.
 */
export function filterByCooldown(
  insights: PatternInsight[],
  lastSurfaced: Record<string, string>,
  options: { cooldownDays?: number; now?: Date } = {},
): PatternInsight[] {
  const cooldownDays = options.cooldownDays ?? appConfig.patterns.cooldownDays;
  const now = options.now ?? new Date();
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  return insights.filter((insight) => {
    const last = lastSurfaced[insight.tag];
    if (!last) return true;
    const lastMs = Date.parse(last);
    if (Number.isNaN(lastMs)) return true;
    return now.getTime() - lastMs >= cooldownMs;
  });
}

/**
 * Compose a gentle, non-clinical call-out sentence. The caller supplies the
 * human label + supportive note from the values model so no copy is hard-coded
 * here.
 */
export function formatInsight(
  insight: PatternInsight,
  label: string,
  supportiveNote?: string,
): string {
  const base = `You've flagged "${label}" ${insight.count} times in the last ${insight.windowDays} days.`;
  return supportiveNote ? `${base} ${supportiveNote}` : base;
}

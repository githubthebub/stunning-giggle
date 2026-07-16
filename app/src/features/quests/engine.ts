/**
 * Quest suggestion & progress.
 *
 * Deterministic matching of starter quests to the user's topics and flagged
 * patterns, plus pure progress math for the check-in loop. Progress is
 * intentionally encouraging: it counts completed check-ins and never penalises
 * missed days (no streaks, no guilt — per the product non-goals).
 */
import type { Quest } from '../../data/schema';

export type QuestContext = {
  topics?: string[];
  patterns?: string[];
  excludeIds?: string[];
};

export function scoreQuest(quest: Quest, ctx: QuestContext): number {
  let score = 0;
  const patterns = ctx.patterns ?? [];
  const topics = ctx.topics ?? [];
  score += quest.linkedPatterns.filter((p) => patterns.includes(p)).length * 2;
  score += quest.linkedValues.length ? 0 : 0; // values not used for matching here
  score += quest.topics.filter((t) => topics.includes(t)).length;
  return score;
}

/**
 * Suggest up to `count` quests ranked by relevance to the context. Deterministic
 * tie-break by id keeps suggestions stable across renders.
 */
export function suggestQuests(pack: Quest[], ctx: QuestContext, count = 3): Quest[] {
  const exclude = new Set(ctx.excludeIds ?? []);
  return pack
    .filter((q) => !exclude.has(q.id))
    .map((quest) => ({ quest, score: scoreQuest(quest, ctx) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.quest.id < b.quest.id ? -1 : a.quest.id > b.quest.id ? 1 : 0;
    })
    .slice(0, count)
    .map((s) => s.quest);
}

export type CheckIn = {
  /** ISO timestamp. */
  at: string;
  status: 'done' | 'partial' | 'skipped';
  note?: string;
};

export type QuestProgress = {
  totalCheckIns: number;
  completed: number;
  lastCheckInAt: string | null;
};

/**
 * Pure progress summary. "skipped" check-ins are counted as engagement, never
 * as a penalty — the UI frames all progress positively.
 */
export function questProgress(checkIns: CheckIn[]): QuestProgress {
  const completed = checkIns.filter((c) => c.status === 'done').length;
  const last = checkIns.reduce<string | null>((acc, c) => {
    if (!acc) return c.at;
    return Date.parse(c.at) > Date.parse(acc) ? c.at : acc;
  }, null);
  return {
    totalCheckIns: checkIns.length,
    completed,
    lastCheckInAt: last,
  };
}

/**
 * Socratic question selection.
 *
 * Deterministic, weighted, non-repeating selection from the tagged question
 * bank. There is NO randomness: given the same bank, context and recent
 * history, the choice is always the same. It "feels" curated (not on-a-loop)
 * because recently-served items are penalised, so repeated calls rotate through
 * the relevant pool before cycling back.
 */
import type { SocraticQuestion } from '../../data/schema';
import { appConfig } from '../../config/appConfig';

export type SelectionContext = {
  topic?: string;
  patternTags?: string[];
  /** Most-recently-served first. */
  recentlyServedIds?: string[];
};

export type SelectionConfig = {
  patternBoost: number;
  recencyPenalty: number;
  recentMemory: number;
};

const DEFAULT_CONFIG: SelectionConfig = {
  patternBoost: appConfig.questionSelection.patternBoost,
  recencyPenalty: appConfig.questionSelection.recencyPenalty,
  recentMemory: appConfig.questionSelection.recentMemory,
};

export function scoreQuestion(
  q: SocraticQuestion,
  ctx: SelectionContext,
  config: SelectionConfig = DEFAULT_CONFIG,
): number {
  let score = q.weight ?? 1;

  if (ctx.topic && q.topics.includes(ctx.topic)) {
    score += 3;
  }

  if (ctx.patternTags && ctx.patternTags.length) {
    const overlap = q.patternTags.filter((t) => ctx.patternTags!.includes(t)).length;
    score += overlap * config.patternBoost;
  }

  // Recency penalty: the more recently served, the larger the penalty.
  const recent = ctx.recentlyServedIds ?? [];
  const idx = recent.indexOf(q.id);
  if (idx !== -1 && idx < config.recentMemory) {
    const proximity = (config.recentMemory - idx) / config.recentMemory; // 1 = just served
    score -= config.recencyPenalty * proximity;
  }

  return score;
}

/**
 * Rank the bank for a context. Deterministic ordering: score desc, then a
 * stable tie-break by id.
 */
export function rankQuestions(
  bank: SocraticQuestion[],
  ctx: SelectionContext,
  config: SelectionConfig = DEFAULT_CONFIG,
): { question: SocraticQuestion; score: number }[] {
  return bank
    .map((question) => ({ question, score: scoreQuestion(question, ctx, config) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.question.id < b.question.id ? -1 : a.question.id > b.question.id ? 1 : 0;
    });
}

export function selectQuestion(
  bank: SocraticQuestion[],
  ctx: SelectionContext,
  config: SelectionConfig = DEFAULT_CONFIG,
): SocraticQuestion | null {
  const ranked = rankQuestions(bank, ctx, config);
  return ranked.length ? ranked[0].question : null;
}

/**
 * Select `count` distinct questions, non-repeating within the batch. Each pick
 * is added to the working "recently served" set so the next pick avoids it.
 */
export function selectQuestions(
  bank: SocraticQuestion[],
  ctx: SelectionContext,
  count: number,
  config: SelectionConfig = DEFAULT_CONFIG,
): SocraticQuestion[] {
  const picked: SocraticQuestion[] = [];
  const served = [...(ctx.recentlyServedIds ?? [])];

  for (let i = 0; i < count && picked.length < bank.length; i += 1) {
    const question = selectQuestion(bank, { ...ctx, recentlyServedIds: served }, config);
    if (!question) break;
    if (picked.some((p) => p.id === question.id)) break;
    picked.push(question);
    served.unshift(question.id);
  }

  return picked;
}

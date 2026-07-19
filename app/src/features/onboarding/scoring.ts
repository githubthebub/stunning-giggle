/**
 * Values & pattern scoring.
 *
 * Pure, deterministic mapping from questionnaire answers onto a values profile
 * and a set of pattern tags. No inference, no randomness — just summing the
 * hand-authored weights on the options the user selected. Given the same
 * answers and model, the output is always identical.
 */
import type { ValuesModel } from '../../data/schema';

/** questionId -> selected option ids (length 1 for "single"/"scale"). */
export type ValuesAnswers = Record<string, string[]>;

export type ScoredId = { id: string; score: number };

export type ValuesProfile = {
  /** Every value dimension, highest score first. */
  valueScores: ScoredId[];
  /** Top dimensions with a positive score (up to `topValueCount`). */
  topValues: string[];
  /** Every pattern tag, highest score first. */
  patternScores: ScoredId[];
  /** Pattern tags at/above `patternThreshold`, strongest first. */
  flaggedPatterns: string[];
  computedAt: string;
};

export type ScoringOptions = {
  topValueCount?: number;
  patternThreshold?: number;
  maxFlaggedPatterns?: number;
  now?: Date;
};

const DEFAULTS: Required<Omit<ScoringOptions, 'now'>> = {
  topValueCount: 5,
  patternThreshold: 2,
  maxFlaggedPatterns: 4,
};

function addWeights(target: Map<string, number>, weights: Record<string, number>) {
  for (const [key, value] of Object.entries(weights)) {
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    target.set(key, (target.get(key) ?? 0) + value);
  }
}

/**
 * Rank a score map into a stable, descending list. Ties break by the canonical
 * order supplied in `order` (the model's declared order), then by id — so the
 * result is fully deterministic.
 */
function rank(scores: Map<string, number>, order: string[]): ScoredId[] {
  const orderIndex = new Map(order.map((id, i) => [id, i]));
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ia = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const ib = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (ia !== ib) return ia - ib;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
}

export function scoreValues(
  model: ValuesModel,
  answers: ValuesAnswers,
  options: ScoringOptions = {},
): ValuesProfile {
  const opts = { ...DEFAULTS, ...options };
  const now = options.now ?? new Date();

  const valueTotals = new Map<string, number>();
  const patternTotals = new Map<string, number>();

  // Seed every declared dimension/tag at 0 so absent ones still rank stably.
  for (const dim of model.valueDimensions) valueTotals.set(dim.id, 0);
  for (const tag of model.patternTags) patternTotals.set(tag.id, 0);

  const optionIndex = new Map<string, (typeof model.questions)[number]['options'][number]>();
  for (const q of model.questions) {
    for (const opt of q.options) optionIndex.set(`${q.id}::${opt.id}`, opt);
  }

  for (const [questionId, optionIds] of Object.entries(answers)) {
    for (const optionId of optionIds) {
      const opt = optionIndex.get(`${questionId}::${optionId}`);
      if (!opt) continue;
      addWeights(valueTotals, opt.valueWeights ?? {});
      addWeights(patternTotals, opt.patternWeights ?? {});
    }
  }

  const valueOrder = model.valueDimensions.map((d) => d.id);
  const patternOrder = model.patternTags.map((t) => t.id);

  const valueScores = rank(valueTotals, valueOrder);
  const patternScores = rank(patternTotals, patternOrder);

  const topValues = valueScores
    .filter((v) => v.score > 0)
    .slice(0, opts.topValueCount)
    .map((v) => v.id);

  const flaggedPatterns = patternScores
    .filter((p) => p.score >= opts.patternThreshold)
    .slice(0, opts.maxFlaggedPatterns)
    .map((p) => p.id);

  return {
    valueScores,
    topValues,
    patternScores,
    flaggedPatterns,
    computedAt: now.toISOString(),
  };
}

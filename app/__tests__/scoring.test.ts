import { scoreValues } from '../src/features/onboarding/scoring';
import type { ValuesModel } from '../src/data/schema';

const model: ValuesModel = {
  version: 1,
  valueDimensions: [
    { id: 'growth', label: 'Growth', description: '' },
    { id: 'security', label: 'Security', description: '' },
  ],
  patternTags: [
    { id: 'avoidance', label: 'Avoidance', description: '', supportiveNote: 'note' },
    { id: 'perfectionism', label: 'Perfectionism', description: '', supportiveNote: '' },
  ],
  questions: [
    {
      id: 'q1',
      prompt: '',
      helpText: '',
      type: 'single',
      options: [
        { id: 'a', label: '', valueWeights: { growth: 2 }, patternWeights: { avoidance: 1 } },
        { id: 'b', label: '', valueWeights: { security: 2 }, patternWeights: {} },
      ],
    },
    {
      id: 'q2',
      prompt: '',
      helpText: '',
      type: 'single',
      options: [
        { id: 'a', label: '', valueWeights: { growth: 1 }, patternWeights: { avoidance: 2 } },
        { id: 'b', label: '', valueWeights: { security: 1 }, patternWeights: { perfectionism: 3 } },
      ],
    },
  ],
};

const NOW = new Date('2026-07-16T00:00:00Z');

test('sums weights across selected options', () => {
  const p = scoreValues(model, { q1: ['a'], q2: ['a'] }, { now: NOW });
  expect(p.valueScores).toEqual([
    { id: 'growth', score: 3 },
    { id: 'security', score: 0 },
  ]);
  expect(p.patternScores.find((s) => s.id === 'avoidance')?.score).toBe(3);
  expect(p.topValues).toEqual(['growth']); // security has score 0 -> excluded
  expect(p.flaggedPatterns).toEqual(['avoidance']); // threshold 2; perfectionism 0
});

test('is fully deterministic for identical input', () => {
  const a = scoreValues(model, { q1: ['b'], q2: ['b'] }, { now: NOW });
  const b = scoreValues(model, { q1: ['b'], q2: ['b'] }, { now: NOW });
  expect(a).toEqual(b);
  expect(a.topValues).toEqual(['security']);
  expect(a.flaggedPatterns).toEqual(['perfectionism']); // score 3 >= 2
});

test('ignores unknown option ids gracefully', () => {
  const p = scoreValues(model, { q1: ['does-not-exist'] }, { now: NOW });
  expect(p.topValues).toEqual([]);
  expect(p.flaggedPatterns).toEqual([]);
});

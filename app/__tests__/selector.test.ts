import {
  scoreQuestion,
  selectQuestion,
  selectQuestions,
} from '../src/features/questions/selector';
import type { SocraticQuestion } from '../src/data/schema';

const bank: SocraticQuestion[] = [
  { id: 'q1', text: 'a', topics: ['career'], patternTags: ['avoidance'], weight: 1 },
  { id: 'q2', text: 'b', topics: ['habits'], patternTags: [], weight: 1 },
  { id: 'q3', text: 'c', topics: ['career'], patternTags: [], weight: 1 },
];

test('topic + pattern overlap raise the score', () => {
  const s = scoreQuestion(bank[0], { topic: 'career', patternTags: ['avoidance'] });
  expect(s).toBeCloseTo(1 + 3 + 1.5); // weight + topic + one pattern boost
});

test('selects the highest-scoring question deterministically', () => {
  expect(selectQuestion(bank, { topic: 'career', patternTags: ['avoidance'] })?.id).toBe('q1');
});

test('selectQuestions is non-repeating within the batch', () => {
  const picked = selectQuestions(bank, { topic: 'career' }, 2);
  expect(picked.map((q) => q.id)).toEqual(['q1', 'q3']);
  expect(new Set(picked.map((q) => q.id)).size).toBe(picked.length);
});

test('recently served questions are penalised', () => {
  const chosen = selectQuestion(bank, { topic: 'career', recentlyServedIds: ['q1'] });
  expect(chosen?.id).not.toBe('q1');
  expect(chosen?.id).toBe('q3');
});

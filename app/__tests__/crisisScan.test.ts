import { scanForCrisis } from '../src/features/safety/crisisScan';

const keywords = ['kill myself', 'want to die', 'end my life', 'die'];

test('matches a crisis phrase in free text', () => {
  const r = scanForCrisis('honestly I want to die sometimes', keywords);
  expect(r.matched).toBe(true);
  expect(r.matches).toContain('want to die');
});

test('is case-insensitive', () => {
  expect(scanForCrisis('I could KILL MYSELF', keywords).matched).toBe(true);
});

test('respects word boundaries (no match inside a larger word)', () => {
  expect(scanForCrisis('he died laughing at the diet', keywords).matches).not.toContain('die');
});

test('matches a bounded single word', () => {
  expect(scanForCrisis('I might die', keywords).matches).toContain('die');
});

test('non-crisis text does not match', () => {
  expect(scanForCrisis('I had a great and ordinary day', keywords).matched).toBe(false);
});

test('empty input is safe', () => {
  expect(scanForCrisis('', keywords).matched).toBe(false);
  expect(scanForCrisis('anything', []).matched).toBe(false);
});

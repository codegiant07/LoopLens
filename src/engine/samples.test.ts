import { describe, it, expect } from 'vitest';
import { trace, SAMPLES, GROUPS } from './index';
import { realJS } from './realjs';

describe('every example matches real JavaScript', () => {
  for (const [name, code] of SAMPLES) {
    it(name, async () => {
      const r = trace(code);
      expect(r.err).toBeUndefined();
      expect(r.steps.at(-1)!.out).toEqual(await realJS(code));
      expect(r.steps.every(s => s.note.trim().length > 0)).toBe(true); // every step is explained
      expect(r.steps.length).toBeLessThan(120); // short enough to step through
    });
  }
});

describe('example picker', () => {
  it('names are unique', () => expect(new Set(SAMPLES.map(s => s[0])).size).toBe(SAMPLES.length));
  it('no empty category', () => expect(GROUPS.every(g => g.samples.length > 0)).toBe(true));
});

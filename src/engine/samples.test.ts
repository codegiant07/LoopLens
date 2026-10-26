import { describe, it, expect } from 'vitest';
import vm from 'node:vm';
import { trace, SAMPLES, GROUPS } from './index';

// Run code as real JavaScript (Node's own engine) and record console.log the way a browser console shows it.
// An error thrown inside a timer is recorded as "Uncaught <error>", like the browser logs it.
async function realJS(code: string) {
  const out: string[] = [];
  const log = (...a: unknown[]) => out.push(a.map(String).join(' '));
  const timer = (fn: (...x: unknown[]) => void, ms = 0, ...args: unknown[]) =>
    setTimeout(() => { try { fn(...args); } catch (e) { out.push('Uncaught ' + String(e)); } }, ms);
  vm.runInContext(code, vm.createContext({ console: { log }, setTimeout: timer, queueMicrotask }));
  await new Promise(r => setTimeout(r, 400)); // longer than any example's timers
  return out;
}

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

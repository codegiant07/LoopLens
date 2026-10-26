// Test helper: run code as real JavaScript (Node's engine) and record console output like a browser console.
// Used to check that LoopLens shows the same output, in the same order, as real JavaScript.
import vm from 'node:vm';

export async function realJS(code: string): Promise<string[]> {
  const out: string[] = [];
  const log = (k: string) => (...a: unknown[]) => out.push((k == 'log' ? '' : k + ': ') + a.map(String).join(' '));
  const live = new Set<unknown>(); // timers still waiting to fire
  // An error thrown inside a timer is recorded as "Uncaught <error>", like the browser logs it.
  const guard = (fn: (...x: unknown[]) => void, args: unknown[]) => () => { try { fn(...args); } catch (e) { out.push('Uncaught ' + String(e)); } };
  const stop = (h: unknown) => { if (live.delete(h)) clearTimeout(h as ReturnType<typeof setTimeout>); };
  const sandbox = {
    console: { log: log('log'), error: log('error'), warn: log('warn') },
    setTimeout: (fn: (...x: unknown[]) => void, ms = 0, ...args: unknown[]) => {
      const h = setTimeout(() => { live.delete(h); guard(fn, args)(); }, ms); live.add(h); return h;
    },
    setInterval: (fn: (...x: unknown[]) => void, ms = 0, ...args: unknown[]) => { const h = setInterval(guard(fn, args), ms); live.add(h); return h; },
    clearTimeout: stop, clearInterval: stop, queueMicrotask,
  };
  vm.runInContext(code, vm.createContext(sandbox));
  const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
  // Wait first (promise callbacks may create timers), then until no timer is left (at most 3 s).
  let i = 0;
  do await wait(10); while (live.size && ++i < 300);
  for (const h of live) stop(h);
  return out;
}

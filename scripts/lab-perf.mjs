// Lab performance check with no dependencies: drives the installed Google Chrome over the DevTools protocol with
// Lighthouse's mobile settings (4x CPU slowdown, slow 4G, phone viewport, no cache) and prints the median of 3 runs.
// Usage: npm run build && npx vite preview --port 4173, then: node scripts/lab-perf.mjs [url ...]
// These are lab numbers for comparing builds, not field data (INP in particular needs real users).
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chrome =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const urls = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["http://localhost:4173/", "http://localhost:4173/javascript-event-loop"];
const RUNS = 3,
  PORT = 9333;
const profile = mkdtempSync(join(tmpdir(), "looplens-perf-"));
const proc = spawn(
  chrome,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Collected inside the page from the first byte: paint, layout-shift and long-task entries.
const OBSERVE = `window.__m = { lcp: 0, cls: 0, lt: [] };
new PerformanceObserver(l => { for (const e of l.getEntries()) __m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) __m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
new PerformanceObserver(l => { for (const e of l.getEntries()) __m.lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
// "Interactive": when React has attached to the visualizer (#viz), i.e. its buttons respond.
(function poll() { const v = document.getElementById('viz'); if (v && Object.keys(v).some(k => k.startsWith('__reactContainer'))) __m.ready = performance.now(); else requestAnimationFrame(poll); })();`;

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const t = await (
        await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
          method: "PUT",
        })
      ).json();
      return t.webSocketDebuggerUrl;
    } catch {
      await sleep(100);
    }
  }
  throw new Error("Chrome did not start");
}

async function measure(url) {
  const ws = new WebSocket(await connect());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map(),
    events = [];
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id) pending.get(d.id)?.(d.result);
    else events.push(d);
  });
  const send = (method, params = {}) =>
    new Promise((r) => {
      pending.set(++id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send("Network.enable");
  await send("Page.enable");
  await send("Network.setCacheDisabled", { cacheDisabled: true });
  await send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
  await send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 412,
    height: 823,
    deviceScaleFactor: 1.75,
    mobile: true,
  });
  await send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVE });
  await send("Page.navigate", { url });
  while (!events.some((e) => e.method === "Page.loadEventFired"))
    await sleep(50);
  await sleep(4000); // let late work (hydration, lazy chunks) finish
  const { result } = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `({ ...__m, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0 })`,
  });
  const bytes = events
    .filter((e) => e.method === "Network.loadingFinished")
    .reduce((a, e) => a + e.params.encodedDataLength, 0);
  ws.close();
  const m = result.value;
  // Total Blocking Time: the part of each long task over 50 ms, after first paint.
  const tbt = m.lt
    .filter(([s]) => s >= m.fcp)
    .reduce((a, [, d]) => a + Math.max(0, d - 50), 0);
  return {
    fcp: m.fcp,
    lcp: m.lcp,
    cls: m.cls,
    tbt,
    ready: m.ready ?? NaN,
    kb: bytes / 1024,
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
try {
  for (const url of urls) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(url));
    const k = (key) => median(runs.map((r) => r[key]));
    console.log(
      `${url}\n  FCP ${k("fcp").toFixed(0)} ms · LCP ${k("lcp").toFixed(0)} ms · CLS ${k("cls").toFixed(3)} · TBT ${k("tbt").toFixed(0)} ms · interactive ${k("ready").toFixed(0)} ms · transferred ${k("kb").toFixed(1)} KB  (median of ${RUNS}, mobile lab settings)`,
    );
  }
} finally {
  proc.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}

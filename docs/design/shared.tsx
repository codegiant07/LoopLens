// Shared state + helpers for the design mockups. Mirrors src/App.tsx state logic exactly
// (same trace(), same step index / play / speed semantics) so every mockup shows real engine output.
import { useEffect, useState, type ReactNode } from "react";
import { trace, SAMPLES } from "../../src/engine";
import type { Step } from "../../src/engine";

export { SAMPLES };
export type { Step };

export const EMPTY: Step = {
  k: "start",
  note: "",
  line: 0,
  stack: [],
  web: [],
  tasks: [],
  micro: [],
  out: [],
  scope: [],
  loop: "sync",
  time: 0,
};

// Same grouping as App.tsx KC, with readable names.
export const GROUP: Record<string, "sync" | "micro" | "task" | "log" | "err"> =
  {
    call: "sync",
    run: "sync",
    ret: "sync",
    start: "sync",
    done: "sync",
    await: "micro",
    enq: "micro",
    micro: "micro",
    task: "task",
    timer: "task",
    log: "log",
    err: "err",
  };
export const KIND: Record<string, string> = {
  start: "Start",
  call: "Function call",
  run: "Run line",
  ret: "Return",
  log: "Console output",
  await: "Await",
  enq: "Microtask queued",
  micro: "Microtask runs",
  task: "Task runs",
  timer: "Timer",
  done: "Finished",
  err: "Error",
};
export const PHASES: [string, string][] = [
  ["sync", "Script"],
  ["micro", "Microtasks"],
  ["task", "Task"],
];
export const PHASE_LABEL: Record<string, string> = {
  sync: "Running script",
  micro: "Draining microtasks",
  task: "Running one task",
  done: "Idle",
};

export function useLens(sample0 = 0, step0 = 0) {
  const [sample, setSample] = useState(sample0);
  const [code, setCode] = useState(SAMPLES[sample0][1]);
  const [res, setRes] = useState(() => trace(SAMPLES[sample0][1]));
  const [editing, setEditing] = useState(false);
  const [ix, setIx] = useState(() =>
    Math.min(step0, Math.max(0, res.steps.length - 1)),
  );
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const S = res.steps,
    last = S.length - 1;
  const s = S[ix] ?? EMPTY,
    p = S[ix - 1] ?? EMPTY;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () =>
        setIx((i) => {
          if (i >= last) {
            setPlaying(false);
            return i;
          }
          return i + 1;
        }),
      1400 / speed,
    );
    return () => clearInterval(t);
  }, [playing, speed, last]);

  const run = (src: string) => {
    const r = trace(src);
    setRes(r);
    setIx(0);
    setPlaying(false);
    setEditing(!r.steps.length);
  };
  const pick = (k: number) => {
    setSample(k);
    setCode(SAMPLES[k][1]);
    run(SAMPLES[k][1]);
  };
  const reset = () => {
    setPlaying(false);
    setIx(0);
  };
  const back = () => {
    setPlaying(false);
    setIx((i) => Math.max(0, i - 1));
  };
  const next = () => {
    setPlaying(false);
    setIx((i) => Math.min(last, i + 1));
  };
  const toggle = () => {
    if (!playing && ix >= last) setIx(0);
    setPlaying(!playing);
  };
  const jump = (k: number) => {
    setPlaying(false);
    setIx(k);
  };
  const edit = () => {
    setPlaying(false);
    setEditing(true);
  };
  const view = !editing && S.length > 0;

  // Keyboard: ← / → step, Space play/pause (ignored while typing).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!view || (e.target as HTMLElement).closest("textarea,input,select"))
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === " ") {
        e.preventDefault();
        toggle();
      }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  });

  const prevVars = new Map(
    p.scope.flatMap(([n, v]) => v.map(([k, x]) => [n + "." + k, x] as const)),
  );
  const changed = (n: string, k: string, x: string) =>
    prevVars.get(n + "." + k) !== x;
  return {
    sample,
    pick,
    code,
    setCode,
    res,
    S,
    last,
    ix,
    s,
    p,
    playing,
    speed,
    setSpeed,
    view,
    editing,
    run,
    reset,
    back,
    next,
    toggle,
    jump,
    edit,
    changed,
  };
}
export type Lens = ReturnType<typeof useLens>;

// Tiny dependency-free JS highlighter (presentation only).
const TOK =
  /(\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\b(async|await|function|return|const|let|var|new|if|else|for|while|try|catch|throw|of|in|typeof)\b|\b(\d+(?:\.\d+)?)\b|\b(console|Promise|setTimeout|queueMicrotask)\b|([A-Za-z_$][\w$]*)(?=\s*\()/g;
const CLS = ["", "tc", "ts", "tk", "tn", "tb", "tf"];
export function Hl({ src }: { src: string }) {
  const out: ReactNode[] = [];
  let i = 0,
    m: RegExpExecArray | null;
  TOK.lastIndex = 0;
  while ((m = TOK.exec(src))) {
    if (m.index > i) out.push(src.slice(i, m.index));
    const g = m.slice(1).findIndex(Boolean) + 1;
    out.push(
      <span key={m.index} className={CLS[g]}>
        {m[0]}
      </span>,
    );
    i = m.index + m[0].length;
  }
  if (i < src.length) out.push(src.slice(i));
  return <>{out.length ? out : " "}</>;
}

export function Timeline({
  L,
  className = "tl",
}: {
  L: Lens;
  className?: string;
}) {
  return (
    <div
      className={className}
      role="slider"
      aria-label="Execution timeline"
      aria-valuemin={0}
      aria-valuemax={L.last}
      aria-valuenow={L.ix}
    >
      {L.S.map((t, k) => (
        <button
          key={k}
          title={`Step ${k} · ${KIND[t.k] ?? t.k}`}
          data-g={GROUP[t.k] ?? "sync"}
          className={(k === L.ix ? "cur" : "") + (k < L.ix ? " past" : "")}
          onClick={() => L.jump(k)}
        />
      ))}
    </div>
  );
}

export const isNew = (t: string, prev: string[]) => !prev.includes(t);

const PATHS: Record<string, string> = {
  play: "M7 4.5v15l12-7.5z",
  pause: "M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z",
  next: "M6 4.5v15l10-7.5zM17 4.5h2v15h-2z",
  back: "M18 4.5v15L8 12zM5 4.5h2v15H5z",
  reset: "M12 5a7 7 0 1 1-6.6 4.7l1.9.6A5 5 0 1 0 12 7v3L7.5 6 12 2z",
  edit: "M4 17.2V20h2.8l8.3-8.3-2.8-2.8zM19.7 7.3a1 1 0 0 0 0-1.4L18 4.3a1 1 0 0 0-1.4 0l-1.3 1.3 2.8 2.8z",
};
export const Icon = ({ n, s = 16 }: { n: string; s?: number }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill="currentColor"
  >
    <path d={PATHS[n]} />
  </svg>
);

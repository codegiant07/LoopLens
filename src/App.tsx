import {
  createContext,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SAMPLES } from "./engine/samples";
import Picker from "./Picker";
import { exampleCode } from "./examples";
import type { Step, TraceResult } from "./engine";
import "./App.css";

// The interpreter and acorn (most of the JavaScript) are only needed to run new code, so they load on demand:
// pages arrive with the example's steps already computed. Loading starts as soon as the visualizer is touched.
let engine: Promise<typeof import("./engine")> | undefined;
const loadEngine = () =>
  (engine ??= import("./engine").catch((e) => {
    engine = undefined;
    throw e;
  }));
const warm = () => {
  loadEngine().catch(() => {});
};

const EDIT = "looplensEdit"; // history.state flag for the editor screen
const KC: Record<string, string> = {
  call: "a",
  run: "a",
  ret: "a",
  start: "a",
  done: "a",
  await: "g",
  enq: "g",
  micro: "g",
  task: "y",
  timer: "y",
  log: "b",
  err: "r",
};
const KIND: Record<string, string> = {
  call: "function call",
  run: "line runs",
  ret: "return",
  start: "start",
  done: "finished",
  await: "await",
  enq: "callback queued",
  micro: "microtask runs",
  task: "task runs",
  timer: "timer",
  log: "console output",
  err: "error",
};
const EMPTY: Step = {
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
// The page HTML is prerendered in Node, where layout effects can't run (and React warns about them).
const useLayoutFx = typeof window === "undefined" ? useEffect : useLayoutEffect;

// Share links carry the code in the URL hash (#code=…), so it never reaches a server.
const enc = (src: string) =>
  btoa(
    Array.from(new TextEncoder().encode(src), (b) =>
      String.fromCharCode(b),
    ).join(""),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const dec = (hash: string) => {
  const m = /^#code=([\w-]+)$/.exec(hash);
  if (!m) return null;
  try {
    return new TextDecoder().decode(
      Uint8Array.from(atob(m[1].replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0),
      ),
    );
  } catch {
    return null;
  }
};

// Panel titles are headings one level below the section holding the visualizer (H2 on home, H3 on topic pages).
const Level = createContext<"h2" | "h3">("h2");
function PanelTitle({ children }: { children: ReactNode }) {
  const H = useContext(Level);
  return <H className="ph">{children}</H>;
}

// Small "?" with a short explanation; opens on hover or keyboard focus, Escape closes it. `about` names it for screen readers.
function Tip({ about, children }: { about: string; children: ReactNode }) {
  const id = useId();
  const [dx, setDx] = useState(0);
  // Shift the popup sideways so it always stays on screen, even on a narrow phone.
  const place = (el: HTMLElement) => {
    const vw = document.documentElement.clientWidth,
      w = Math.min(260, vw - 24),
      x = el.getBoundingClientRect().left;
    setDx(Math.min(Math.max(x, 12), vw - 12 - w) - x);
  };
  return (
    <span
      className="tip"
      onPointerEnter={(e) => place(e.currentTarget)}
      onFocus={(e) => place(e.currentTarget)}
    >
      <button
        type="button"
        className="q"
        aria-label={`About ${about}`}
        aria-describedby={id}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.currentTarget.blur();
        }}
      >
        ?
      </button>
      <span role="tooltip" id={id} style={{ left: dx }}>
        {children}
      </span>
    </span>
  );
}

function List({
  title,
  tip,
  items,
  prev,
  cls,
  numbered,
}: {
  title: string;
  tip?: ReactNode;
  items: string[];
  prev: string[];
  cls: string;
  numbered?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null),
    last = useRef(new Map<string, [number, number]>());
  // Each chip keeps its identity across steps (label + how many times that label came before it),
  // so when the front of a queue is taken, the others slide forward instead of jumping.
  const seen = new Map<string, number>();
  const keyed = items.map((t) => {
    const n = seen.get(t) ?? 0;
    seen.set(t, n + 1);
    return [t + "#" + n, t] as const;
  });
  useLayoutFx(() => {
    const now = new Map<string, [number, number]>(),
      calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.current?.querySelectorAll<HTMLElement>("[data-k]").forEach((c) => {
      const at: [number, number] = [c.offsetLeft, c.offsetTop],
        from = last.current.get(c.dataset.k!); // layout position: ignores scrolling and running animations
      now.set(c.dataset.k!, at);
      if (calm || !from || (from[0] == at[0] && from[1] == at[1])) return;
      c.style.transition = "none";
      c.style.transform = `translate(${from[0] - at[0]}px, ${from[1] - at[1]}px)`;
      c.getBoundingClientRect(); // apply the old position, then let it glide to the new one
      c.style.transition = "transform .35s ease";
      c.style.transform = "";
    });
    last.current = now;
  });
  return (
    <div>
      <PanelTitle>
        {title}
        {tip && <Tip about={title.replace(/ \(.*\)$/, "")}>{tip}</Tip>}
      </PanelTitle>
      <div className="bx" ref={box}>
        {items.length ? (
          keyed.map(([key, t], k) => (
            <span
              key={key}
              data-k={key}
              className={`ch ${cls}${prev.includes(t) ? "" : " nw"}`}
            >
              {numbered ? `${k + 1}. ` : ""}
              {t}
            </span>
          ))
        ) : (
          <em>empty</em>
        )}
      </div>
    </div>
  );
}

/**
 * The visualizer. `initial` names the example it opens with and `init` is that example's precomputed trace
 * (a #code=… share link replaces both after load); `level` is the panel heading level.
 */
export default function App({
  initial,
  level = 2,
  init,
}: {
  initial?: string;
  level?: 2 | 3;
  init: TraceResult;
}) {
  // The first render must match the prerendered HTML, so it never reads the URL; the share-link effect below does.
  const [code, setCode] = useState(() => exampleCode(initial));
  const [res, setRes] = useState(init);
  const [editing, setEditing] = useState(false);
  const [ix, setIx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [predict, setPredict] = useState(false);
  const [guess, setGuess] = useState<{ at: number; pick: string } | null>(null);
  const [shared, setShared] = useState("");
  const S = res.steps,
    last = S.length - 1;
  const s = S[ix] ?? EMPTY,
    p = S[ix - 1] ?? EMPTY;

  // Predict mode asks before a step that prints, when there is more than one line left to choose from.
  const left = (i: number) =>
    [...new Set(S[last].out.slice(S[i].out.length))].sort();
  const asks = (i: number) =>
    predict &&
    i < last &&
    S[i + 1].out.length > S[i].out.length &&
    left(i).length > 1;
  const answer = ix < last ? S[ix + 1].out[s.out.length] : "";

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(
      () =>
        setIx((i) => {
          if (i >= last) {
            setPlaying(false);
            return i;
          }
          if (asks(i + 1)) setPlaying(false);
          return i + 1;
        }),
      1400 / speed,
    );
    return () => clearInterval(t);
  }, [playing, speed, last, predict, S]);
  // A guess belongs to one visit of a step: moving to any other step (Next, Back, Reset, timeline, a new run)
  // clears it, so coming back to a step asks again instead of showing the old answer.
  useEffect(() => setGuess(null), [ix, S]);

  const run = async (src: string): Promise<TraceResult> => {
    let r: TraceResult;
    try {
      r = (await loadEngine()).trace(src);
    } catch {
      r = {
        steps: [],
        err: "Could not load the interpreter. Check your connection and try again.",
      };
    }
    setRes(r);
    setIx(0);
    setPlaying(false);
    setGuess(null);
    setEditing(!r.steps.length);
    return r;
  };
  // The editor gets its own history entry, so the browser's Back button acts like Run instead of leaving the page.
  const edit = () => {
    setPlaying(false);
    setEditing(true);
    history.pushState({ [EDIT]: true }, "");
  };
  useEffect(() => {
    const onPop = () => {
      if (history.state?.[EDIT]) {
        setPlaying(false);
        setEditing(true);
      } // Forward returns to the editor
      else if (editing)
        void run(code).then((r) => {
          if (!r.steps.length) history.pushState({ [EDIT]: true }, "");
        }); // code didn't run: stay in the editor
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [editing, code]);
  useEffect(() => {
    const c = dec(location.hash);
    if (c !== null && c !== code) {
      setCode(c);
      void run(c);
    }
  }, []); // open a share link
  const next = () => {
    setPlaying(false);
    setIx((i) => Math.min(last, i + 1));
  };
  // The timeline is one slider for keyboards and screen readers: arrows move a step, Page keys 10, Home/End jump.
  const seek = (e: KeyboardEvent<HTMLDivElement>) => {
    const to = (
      {
        ArrowRight: ix + 1,
        ArrowUp: ix + 1,
        ArrowLeft: ix - 1,
        ArrowDown: ix - 1,
        PageUp: ix + 10,
        PageDown: ix - 10,
        Home: 0,
        End: last,
      } as Record<string, number>
    )[e.key];
    if (to === undefined) return;
    e.preventDefault();
    setPlaying(false);
    setIx(Math.max(0, Math.min(last, to)));
  };
  const share = async () => {
    const url = location.origin + location.pathname + "#code=" + enc(code);
    history.replaceState(history.state, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setShared("Link copied");
    } catch {
      setShared("Link is in the address bar");
    }
    setTimeout(() => setShared(""), 2000);
  };
  const prevVars = new Map(
    p.scope.flatMap(([n, v]) => v.map(([k, x]) => [n + "." + k, x] as const)),
  );
  const view = !editing && S.length > 0;
  const sample = SAMPLES.findIndex((x) => x[1] === code);

  return (
    <Level.Provider value={level === 3 ? "h3" : "h2"}>
      <div onPointerEnter={warm} onTouchStart={warm} onFocus={warm}>
        <div className="row">
          <Picker
            value={sample}
            onPick={(k) => {
              setCode(SAMPLES[k][1]);
              run(SAMPLES[k][1]);
            }}
          />
          <button
            onClick={() =>
              view ? edit() : history.state?.[EDIT] ? history.back() : run(code)
            }
          >
            {view ? "Edit code" : "Run"}
          </button>
          <button
            onClick={share}
            title="Copy a link that opens LoopLens with this code"
          >
            {shared || "Copy link"}
          </button>
          <span role="status" className="sr-only">
            {shared}
          </span>
        </div>
        {!view && (
          <textarea
            aria-label="JavaScript code to visualize"
            value={code}
            spellCheck={false}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
        {res.err && <div className="er">{res.err}</div>}
        {view && (
          <>
            <div className="row">
              <button
                onClick={() => {
                  setPlaying(false);
                  setIx(0);
                }}
              >
                Reset
              </button>
              <button
                aria-label="Back one step"
                onClick={() => {
                  setPlaying(false);
                  setIx((i) => Math.max(0, i - 1));
                }}
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (!playing && ix >= last) setIx(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? "Pause" : "Play"}
              </button>
              <button onClick={next}>Next step</button>
              <label style={{ fontSize: 13 }}>
                Speed{" "}
                <input
                  type="range"
                  min={0.5}
                  max={4}
                  step={0.5}
                  value={speed}
                  aria-valuetext={`${speed} times`}
                  onChange={(e) => setSpeed(+e.target.value)}
                />
              </label>
              <span>
                <label style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={predict}
                    onChange={(e) => setPredict(e.target.checked)}
                  />{" "}
                  Predict mode
                </label>
                {/* Outside the label, so clicking "?" opens the tip instead of toggling the checkbox. */}
                <Tip about="Predict mode">
                  Test yourself. When this is on, LoopLens pauses before every
                  step that prints to the console and asks what it will print.
                  Pick an answer to check it, or choose Just show me.
                </Tip>
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 13,
                  color: "var(--mut)",
                }}
              >
                Step {ix} of {last} · virtual clock {s.time} ms
              </span>
            </div>
            <div id="pl">
              <span className="lb">Event loop:</span>
              {(
                [
                  ["sync", "Script", "on"],
                  ["micro", "Microtasks", "on g"],
                  ["task", "Task", "on y"],
                ] as const
              ).map(([k, t, on], j) => (
                <span key={k} className="pw">
                  {j > 0 && <i aria-hidden="true">→</i>}
                  <span className={"pill" + (s.loop === k ? " " + on : "")}>
                    {t}
                    {s.loop === k && <span className="sr-only"> (now)</span>}
                  </span>
                </span>
              ))}
              <i title="The loop repeats" aria-hidden="true">
                ↺
              </i>
              <span className="sr-only">, then it repeats.</span>
              <Tip about="the event loop">
                The event loop runs the whole script first. Then it runs every
                microtask, then one task, and repeats.
              </Tip>
            </div>
            <div className="g2">
              <div>
                <PanelTitle>Code (current line highlighted)</PanelTitle>
                <div className="bx" style={{ padding: "6px 0" }}>
                  {code.split("\n").map((t, k) => (
                    <div
                      key={k}
                      className={"ln" + (k + 1 === s.line ? " on" : "")}
                      aria-current={k + 1 === s.line ? "step" : undefined}
                    >
                      <i>{k + 1}</i>
                      {k + 1 === s.line && (
                        <span className="sr-only">current line: </span>
                      )}
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
                <List
                  title="Call stack (top first)"
                  tip="The function running right now is on top. Calling a function adds a frame; returning removes it. Only one frame runs at a time."
                  items={[...s.stack].reverse()}
                  prev={p.stack}
                  cls="c1"
                />
                <List
                  title="Web APIs (timers waiting in the browser)"
                  tip="The browser counts timers outside JavaScript. When a timer finishes, its callback moves to the task queue."
                  items={s.web}
                  prev={p.web}
                  cls="c3"
                />
              </div>
            </div>
            <div id="note" aria-live={playing ? "off" : "polite"}>
              {s.note}
              {asks(ix) && (
                <div className="pq">
                  {guess?.at === ix ? (
                    <p>
                      <b className={guess.pick === answer ? "ok" : "no"}>
                        {guess.pick === answer ? "✓ Right." : "✗ Not quite."}
                      </b>{" "}
                      The next step prints <code>{answer}</code>. Press Next
                      step to see it happen.
                    </p>
                  ) : (
                    <>
                      <p>
                        <b>Predict:</b> the next step prints to the console.
                        What will it print?
                      </p>
                      <div className="row">
                        {left(ix).map((t) => (
                          <button
                            key={t}
                            onClick={() => setGuess({ at: ix, pick: t })}
                          >
                            {t}
                          </button>
                        ))}
                        <button className="lk" onClick={next}>
                          Just show me
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
              {predict && ix === 0 && !asks(0) && last > 0 && (
                <p className="hint">
                  Predict mode is on: before a step prints to the console,
                  you&apos;ll be asked to guess what it prints.
                </p>
              )}
            </div>
            <div className="g3">
              <List
                title="Microtask queue (next first)"
                tip="Promise callbacks (.then, code after await, queueMicrotask) wait here. Once the call stack is empty, all of them run before the next task."
                items={s.micro}
                prev={p.micro}
                cls="c2"
                numbered
              />
              <List
                title="Task queue (next first)"
                tip="Timer callbacks wait here. The event loop takes one task, runs it, then empties the microtask queue before taking the next."
                items={s.tasks}
                prev={p.tasks}
                cls="c3"
                numbered
              />
              <div>
                <PanelTitle>Console output</PanelTitle>
                <div className="bx">
                  {s.out.length ? (
                    s.out.map((t, k) => (
                      <div key={k}>
                        <span
                          className={"ch c4" + (k >= p.out.length ? " nw" : "")}
                        >
                          {t}
                        </span>
                      </div>
                    ))
                  ) : (
                    <em>nothing yet</em>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <PanelTitle>
                Scope and variables (yellow = changed this step)
              </PanelTitle>
              <div className="bx sc">
                {s.scope.length ? (
                  s.scope.map(([n, v]) => (
                    <div key={n}>
                      <b>{n}: </b>
                      {v.map(([k, x]) => (
                        <span
                          key={k}
                          className={
                            "ch c4" +
                            (prevVars.get(n + "." + k) !== x ? " ch2" : "")
                          }
                        >
                          {k} = {x}
                          {prevVars.get(n + "." + k) !== x && (
                            <span className="sr-only"> (changed)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  ))
                ) : (
                  <em>no variables yet</em>
                )}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <PanelTitle>
                Timeline (click a block or use the arrow keys)
                <Tip about="the timeline colors">
                  <span className="key">
                    <i className="a" />
                    Script, function calls and returns
                  </span>
                  <span className="key">
                    <i className="g" />
                    await and microtasks
                  </span>
                  <span className="key">
                    <i className="y" />
                    Timers and tasks
                  </span>
                  <span className="key">
                    <i className="b" />
                    Console output
                  </span>
                  <span className="key">
                    <i className="r" />
                    Errors
                  </span>
                </Tip>
              </PanelTitle>
              <div
                id="tl"
                role="slider"
                tabIndex={0}
                aria-label="Timeline"
                aria-valuemin={0}
                aria-valuemax={last}
                aria-valuenow={ix}
                aria-valuetext={`Step ${ix} of ${last}: ${KIND[s.k] ?? s.k}`}
                onKeyDown={seek}
              >
                {S.map((t, k) => (
                  <i
                    key={k}
                    title={`Step ${k}`}
                    className={KC[t.k] + (k === ix ? " cur" : "")}
                    onClick={() => {
                      setPlaying(false);
                      setIx(k);
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Level.Provider>
  );
}

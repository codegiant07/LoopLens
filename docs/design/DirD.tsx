// Direction D — Studio Dark: B's learning structure + the reference's spatial runtime map
// (stack / Web APIs on top, event loop hub in the middle, queues below), without neon borders.
import {
  Hl,
  Icon,
  Timeline,
  KIND,
  PHASES,
  GROUP,
  SAMPLES,
  isNew,
  type Lens,
} from "./shared";
import "./d.css";

const SI: Record<string, string> = {
  stack: "M12 3 3 8l9 5 9-5zM3 12.5l9 5 9-5M3 17l9 5 9-5",
  web: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  micro: "M13 2 4 14h7l-1 8 9-12h-7z",
  task: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  loop: "M20 12a8 8 0 0 1-14.3 4.9M4 12A8 8 0 0 1 18.3 7.1M18 3v4.5h-4.5M6 21v-4.5h4.5",
  term: "M4 5h16v14H4zM7.5 9.5 10 12l-2.5 2.5M12 15h4",
  vars: "M7 4C5 4 5 6 5 8s-1 3-2 4c1 1 2 2 2 4s0 4 2 4M17 4c2 0 2 2 2 4s1 3 2 4c-1 1-2 2-2 4s0 4-2 4",
};
const SIcon = ({ n }: { n: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={SI[n]} />
  </svg>
);

function Region({
  tone,
  icon,
  title,
  hint,
  items,
  prev,
  numbered,
  top,
  active,
}: {
  tone: string;
  icon: string;
  title: string;
  hint: string;
  items: string[];
  prev: string[];
  numbered?: boolean;
  top?: boolean;
  active?: boolean;
}) {
  return (
    <section className={"d-reg t-" + tone + (active ? " act" : "")}>
      <h3>
        <span className="d-ico">
          <SIcon n={icon} />
        </span>
        {title}
        <b>{items.length}</b>
      </h3>
      {items.length ? (
        <ul>
          {items.map((t, k) => (
            <li key={k + t} className={isNew(t, prev) ? "nw" : ""}>
              {numbered && <i>{k + 1}</i>}
              <span>{t}</span>
              {top && k === 0 && <em>top</em>}
            </li>
          ))}
        </ul>
      ) : (
        <p>{hint}</p>
      )}
    </section>
  );
}

export default function DirD({ L }: { L: Lens }) {
  const { s, p } = L;
  const g = GROUP[s.k] ?? "sync";
  const nVars = s.scope.reduce((n, [, v]) => n + v.length, 0);
  return (
    <div className="dD">
      <header className="d-top">
        <div className="d-brand">
          <span className="d-logo">
            <SIcon n="loop" />
          </span>
          LoopLens
        </div>
        <nav className="d-chips" aria-label="Examples">
          {SAMPLES.map((x, k) => (
            <button
              key={k}
              className={k === L.sample ? "on" : ""}
              onClick={() => L.pick(k)}
            >
              {x[0]}
            </button>
          ))}
        </nav>
        <button
          className="d-ghost"
          onClick={() => (L.view ? L.edit() : L.run(L.code))}
        >
          <Icon n={L.view ? "edit" : "play"} s={13} />
          {L.view ? "Edit code" : "Run"}
        </button>
      </header>

      <main className="d-main">
        <div className="d-left">
          <section className="d-card d-code">
            <h3>Code{s.line > 0 && <span>line {s.line}</span>}</h3>
            {L.res.err && <div className="d-err">{L.res.err}</div>}
            {!L.view ? (
              <textarea
                value={L.code}
                spellCheck={false}
                onChange={(e) => L.setCode(e.target.value)}
              />
            ) : (
              <div className="d-lines">
                {L.code.split("\n").map((t, k) => (
                  <div
                    key={k}
                    className={"d-ln" + (k + 1 === s.line ? " on" : "")}
                  >
                    <i>{k + 1}</i>
                    <code>
                      <Hl src={t} />
                    </code>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={"d-card d-explain g-" + g} aria-live="polite">
            <div className="d-explain-h">
              <span className="d-kind">{KIND[s.k] ?? s.k}</span>
              <span>
                Step {L.ix} / {L.last}
              </span>
            </div>
            <p>{s.note || "Press Play or → to start."}</p>
            <div className="d-ctl">
              <button className="d-r" title="Reset" onClick={L.reset}>
                <Icon n="reset" s={14} />
              </button>
              <button
                className="d-r"
                title="Back (←)"
                onClick={L.back}
                disabled={L.ix === 0}
              >
                <Icon n="back" s={14} />
              </button>
              <button className="d-play" onClick={L.toggle}>
                <Icon n={L.playing ? "pause" : "play"} s={15} />
                {L.playing ? "Pause" : L.ix >= L.last ? "Replay" : "Play"}
              </button>
              <button
                className="d-r"
                title="Next step (→)"
                onClick={L.next}
                disabled={L.ix >= L.last}
              >
                <Icon n="next" s={14} />
              </button>
              <label className="d-speed">
                Speed
                <input
                  type="range"
                  min={0.5}
                  max={4}
                  step={0.5}
                  value={L.speed}
                  onChange={(e) => L.setSpeed(+e.target.value)}
                />
                <b>{L.speed}×</b>
              </label>
            </div>
            <div className="d-tlw">
              <Timeline L={L} className="tl d-tl" />
              <div className="d-legend">
                <span data-g="sync">Script &amp; calls</span>
                <span data-g="micro">Microtasks</span>
                <span data-g="task">Timers &amp; tasks</span>
                <span data-g="log">Console</span>
                <span data-g="err">Error</span>
                <span className="d-keys">
                  <kbd>←</kbd>
                  <kbd>→</kbd> step · <kbd>Space</kbd> play
                </span>
              </div>
            </div>
          </section>

          <section className="d-card d-console">
            <h3>
              <span className="d-ico">
                <SIcon n="term" />
              </span>
              Console<b>{s.out.length}</b>
            </h3>
            {s.out.length ? (
              s.out.map((t, k) => (
                <div key={k} className={k >= p.out.length ? "nw" : ""}>
                  {t}
                </div>
              ))
            ) : (
              <p>console.log output appears here</p>
            )}
          </section>
        </div>

        <div className="d-right">
          <div className="d-pair">
            <Region
              tone="stack"
              icon="stack"
              title="Call stack"
              hint="Empty — nothing is running"
              items={[...s.stack].reverse()}
              prev={p.stack}
              top
              active={s.stack.length > 0}
            />
            <Region
              tone="web"
              icon="web"
              title="Web APIs"
              hint="No timers waiting in the browser"
              items={s.web}
              prev={p.web}
            />
          </div>

          <section className={"d-loop ph-" + s.loop}>
            <span className="d-ico">
              <SIcon n="loop" />
            </span>
            <div className="d-loop-b">
              <b>Event loop</b>
              <ol>
                {PHASES.map(([k, t], n) => (
                  <li key={k} className={s.loop === k ? "on" : ""}>
                    {n + 1} · {t}
                  </li>
                ))}
              </ol>
              <small>
                {s.loop === "done"
                  ? "Idle — everything has run."
                  : "Finish the script → run every microtask → take one task → repeat."}
              </small>
            </div>
            <span className="d-clock">
              {s.time}
              <small> ms</small>
            </span>
          </section>

          <div className="d-pair">
            <Region
              tone="micro"
              icon="micro"
              title="Microtask queue"
              hint="Promise callbacks, await, queueMicrotask"
              items={s.micro}
              prev={p.micro}
              numbered
              active={s.loop === "micro"}
            />
            <Region
              tone="task"
              icon="task"
              title="Task queue"
              hint="setTimeout callbacks, one per loop turn"
              items={s.tasks}
              prev={p.tasks}
              numbered
              active={s.loop === "task"}
            />
          </div>

          <section className="d-card d-vars">
            <h3>
              <span className="d-ico">
                <SIcon n="vars" />
              </span>
              Variables<b>{nVars}</b>
              <span className="d-chg-key">changed this step</span>
            </h3>
            {s.scope.length ? (
              s.scope.map(([n, v]) => (
                <div key={n} className="d-scope">
                  <small>{n}</small>
                  <div>
                    {v.map(([k, x]) => (
                      <code key={k} className={L.changed(n, k, x) ? "chg" : ""}>
                        {k} <i>=</i> {x}
                      </code>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p>No variables yet</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

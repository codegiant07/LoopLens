// Direction C — Premium Dark Workspace: one viewport, media-player dock (caption + scrubber) at the bottom.
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
import "./c.css";

function Q({
  title,
  items,
  prev,
  tone,
  numbered,
  top,
}: {
  title: string;
  items: string[];
  prev: string[];
  tone: string;
  numbered?: boolean;
  top?: boolean;
}) {
  return (
    <section className={"c-q " + tone}>
      <h3>
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
        <p>—</p>
      )}
    </section>
  );
}

export default function DirC({ L }: { L: Lens }) {
  const { s, p } = L;
  return (
    <div className="dC">
      <header className="c-top">
        <div className="c-brand">LoopLens</div>
        <select
          value={L.sample}
          onChange={(e) => L.pick(+e.target.value)}
          aria-label="Example"
        >
          {SAMPLES.map((x, k) => (
            <option key={k} value={k}>
              {x[0]}
            </option>
          ))}
        </select>
        <div className="c-phase" aria-label="Event loop phase">
          {PHASES.map(([k, t]) => (
            <span key={k} className={s.loop === k ? "on" : ""}>
              {t}
            </span>
          ))}
          <span className={"idle" + (s.loop === "done" ? " on" : "")}>
            Idle
          </span>
        </div>
        <span className="c-clock">
          {s.time}
          <small>ms</small>
        </span>
        <button
          className="c-btn"
          onClick={() => (L.view ? L.edit() : L.run(L.code))}
        >
          {L.view ? "Edit" : "Run"}
        </button>
      </header>

      <div className="c-body">
        <section className="c-editor">
          {L.res.err && <div className="c-err">{L.res.err}</div>}
          {!L.view ? (
            <textarea
              value={L.code}
              spellCheck={false}
              onChange={(e) => L.setCode(e.target.value)}
            />
          ) : (
            L.code.split("\n").map((t, k) => (
              <div key={k} className={"c-ln" + (k + 1 === s.line ? " on" : "")}>
                <i>{k + 1}</i>
                <code>
                  <Hl src={t} />
                </code>
              </div>
            ))
          )}
        </section>

        <aside className="c-right">
          <div className="c-label">Runtime</div>
          <div className="c-grid">
            <Q
              title="Call stack"
              items={[...s.stack].reverse()}
              prev={p.stack}
              tone="t-stack"
              top
            />
            <Q title="Web APIs" items={s.web} prev={p.web} tone="t-web" />
            <Q
              title="Microtasks"
              items={s.micro}
              prev={p.micro}
              tone="t-micro"
              numbered
            />
            <Q
              title="Tasks"
              items={s.tasks}
              prev={p.tasks}
              tone="t-task"
              numbered
            />
          </div>
          <div className="c-label">Console</div>
          <div className="c-console">
            {s.out.length ? (
              s.out.map((t, k) => (
                <div key={k} className={k >= p.out.length ? "nw" : ""}>
                  {t}
                </div>
              ))
            ) : (
              <p>—</p>
            )}
          </div>
          <div className="c-label">Scope</div>
          <div className="c-scope">
            {s.scope.length ? (
              s.scope.map(([n, v]) => (
                <div key={n}>
                  <small>{n}</small>
                  {v.map(([k, x]) => (
                    <div
                      key={k}
                      className={"c-var" + (L.changed(n, k, x) ? " chg" : "")}
                    >
                      <span>{k}</span>
                      <span>{x}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p>—</p>
            )}
          </div>
        </aside>
      </div>

      <footer className="c-dock">
        <div className={"c-caption g-" + (GROUP[s.k] ?? "sync")}>
          <span>{KIND[s.k] ?? s.k}</span>
          <p>{s.note}</p>
        </div>
        <div className="c-player">
          <div className="c-tx">
            <button title="Reset" onClick={L.reset}>
              <Icon n="reset" s={15} />
            </button>
            <button title="Back (←)" onClick={L.back} disabled={L.ix === 0}>
              <Icon n="back" s={15} />
            </button>
            <button
              title="Play / Pause (Space)"
              className="pri"
              onClick={L.toggle}
            >
              <Icon n={L.playing ? "pause" : "play"} s={16} />
            </button>
            <button
              title="Next step (→)"
              onClick={L.next}
              disabled={L.ix >= L.last}
            >
              <Icon n="next" s={15} />
            </button>
          </div>
          <Timeline L={L} className="tl c-tl" />
          <span className="c-step">
            {L.ix}
            <small>/{L.last}</small>
          </span>
          <select
            className="c-speed"
            value={L.speed}
            onChange={(e) => L.setSpeed(+e.target.value)}
            aria-label="Speed"
          >
            {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map((v) => (
              <option key={v} value={v}>
                {v}×
              </option>
            ))}
          </select>
        </div>
      </footer>
    </div>
  );
}

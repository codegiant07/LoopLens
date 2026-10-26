// Direction B — Interactive Learning Studio: explanation is the hero, runtime shown as a left-to-right flow.
import { Hl, Icon, Timeline, KIND, PHASES, GROUP, SAMPLES, isNew, type Lens } from './shared';
import './b.css';

function Station({ title, hint, items, prev, tone, numbered, top }: { title: string; hint: string; items: string[]; prev: string[]; tone: string; numbered?: boolean; top?: boolean }) {
  return (<div className={'b-st ' + tone}>
    <div className="b-st-h"><span className="dot" />{title}<b>{items.length || ''}</b></div>
    <p>{hint}</p>
    <div className="b-st-b">{items.length
      ? items.map((t, k) => <div key={k + t} className={'b-tok' + (isNew(t, prev) ? ' nw' : '')}>
        {numbered && <i>{k + 1}</i>}<span>{t}</span>{top && k === 0 && <em>top</em>}</div>)
      : <div className="b-none">empty</div>}</div>
  </div>);
}

export default function DirB({ L }: { L: Lens }) {
  const { s, p } = L;
  const g = GROUP[s.k] ?? 'sync';
  const pct = L.last ? (L.ix / L.last) * 100 : 0;
  return (<div className="dB">
    <header className="b-top">
      <div className="b-brand"><span className="b-logo">↻</span><div><b>LoopLens</b><small>See how JavaScript really runs</small></div></div>
      <nav className="b-chips" aria-label="Examples">{SAMPLES.map((x, k) =>
        <button key={k} className={k === L.sample ? 'on' : ''} onClick={() => L.pick(k)}>{x[0]}</button>)}</nav>
      <button className="b-ghost" onClick={() => L.view ? L.edit() : L.run(L.code)}><Icon n={L.view ? 'edit' : 'play'} s={14} />{L.view ? 'Edit code' : 'Run code'}</button>
    </header>

    <div className="b-main">
      <section className="b-card b-code">
        <div className="b-card-h">Your code{s.line > 0 && <span>line {s.line}</span>}</div>
        {L.res.err && <div className="b-err">{L.res.err}</div>}
        {!L.view
          ? <textarea value={L.code} spellCheck={false} onChange={e => L.setCode(e.target.value)} />
          : <div className="b-lines">{L.code.split('\n').map((t, k) =>
            <div key={k} className={'b-ln' + (k + 1 === s.line ? ' on' : '')}><i>{k + 1}</i><code><Hl src={t} /></code></div>)}</div>}
      </section>

      <section className="b-side">
        <div className={'b-card b-explain g-' + g}>
          <div className="b-explain-h"><span className="b-kind">{KIND[s.k] ?? s.k}</span><span className="b-count">Step {L.ix} of {L.last}</span></div>
          <p className="b-note">{s.note || 'Press Play or Next to start.'}</p>
          <div className="b-prog"><span style={{ width: pct + '%' }} /></div>
          <div className="b-ctl">
            <button className="b-round" title="Back (←)" onClick={L.back} disabled={L.ix === 0}><Icon n="back" /></button>
            <button className="b-play" onClick={L.toggle}><Icon n={L.playing ? 'pause' : 'play'} s={18} />{L.playing ? 'Pause' : L.ix >= L.last ? 'Replay' : 'Play'}</button>
            <button className="b-round" title="Next step (→)" onClick={L.next} disabled={L.ix >= L.last}><Icon n="next" /></button>
            <button className="b-link" onClick={L.reset}>Reset</button>
            <label className="b-speed">Speed <input type="range" min={0.5} max={4} step={0.5} value={L.speed} onChange={e => L.setSpeed(+e.target.value)} /><b>{L.speed}×</b></label>
          </div>
        </div>

        <div className="b-card b-loop">
          <div className="b-card-h">Event loop<span>{s.time} ms</span></div>
          <ol>{PHASES.map(([k, t], n) => <li key={k} className={s.loop === k ? 'on' : ''}><i>{n + 1}</i>{t}</li>)}</ol>
          <p>{s.loop === 'done' ? 'Everything has run. The loop is idle.' : 'Finish the script → empty every microtask → take one task → repeat.'}</p>
        </div>
      </section>
    </div>

    <section className="b-flow" aria-label="Runtime">
      <Station title="Call stack" hint="Running right now" items={[...s.stack].reverse()} prev={p.stack} tone="t-stack" top />
      <Station title="Web APIs" hint="Waiting in the browser" items={s.web} prev={p.web} tone="t-web" />
      <Station title="Microtask queue" hint="Runs next, all of them" items={s.micro} prev={p.micro} tone="t-micro" numbered />
      <Station title="Task queue" hint="Then one at a time" items={s.tasks} prev={p.tasks} tone="t-task" numbered />
    </section>

    <div className="b-bottom">
      <section className="b-card">
        <div className="b-card-h">Console</div>
        <div className="b-console">{s.out.length ? s.out.map((t, k) => <div key={k} className={k >= p.out.length ? 'nw' : ''}>{t}</div>) : <div className="b-none">Nothing printed yet</div>}</div>
      </section>
      <section className="b-card">
        <div className="b-card-h">Variables<span className="b-legend-chg">changed this step</span></div>
        <div className="b-vars">{s.scope.length ? s.scope.map(([n, v]) => <div key={n}><small>{n}</small>
          {v.map(([k, x]) => <code key={k} className={L.changed(n, k, x) ? 'chg' : ''}>{k} = {x}</code>)}</div>) : <div className="b-none">No variables yet</div>}</div>
      </section>
    </div>

    <section className="b-story">
      <div className="b-card-h">Timeline<span>click any step to jump there</span></div>
      <Timeline L={L} className="tl b-tl" />
      <div className="b-legend"><span data-g="sync">Script &amp; calls</span><span data-g="micro">Microtasks</span><span data-g="task">Timers &amp; tasks</span><span data-g="log">Console</span><span data-g="err">Error</span></div>
    </section>
  </div>);
}

// Direction A — Minimal Developer IDE: editor-first, debugger-style sidebar, bottom panel, status bar.
import { Hl, Icon, Timeline, KIND, PHASE_LABEL, GROUP, SAMPLES, isNew, type Lens } from './shared';
import './a.css';

const SPEEDS = [0.5, 1, 2, 4];
const file = (n: string) => n.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.js';

function Sec({ title, items, prev, tone, numbered, top }: { title: string; items: string[]; prev: string[]; tone: string; numbered?: boolean; top?: boolean }) {
  return (<section className={'a-sec' + (items.length ? '' : ' empty')}>
    <h3><span>{title}</span><b>{items.length}</b></h3>
    {items.length > 0 && <ul>{items.map((t, k) =>
      <li key={k + t} className={tone + (isNew(t, prev) ? ' nw' : '')}>
        <i>{numbered ? k + 1 : top && k === 0 ? '▸' : ''}</i>{t}</li>)}</ul>}
  </section>);
}

export default function DirA({ L }: { L: Lens }) {
  const { s, p } = L;
  const lens = <div className="a-lens"><span className={'a-kind g-' + (GROUP[s.k] ?? 'sync')}>{KIND[s.k] ?? s.k}</span>{s.note}</div>;
  const lines = L.code.split('\n');
  return (<div className="dA">
    <header className="a-top">
      <div className="a-brand"><span className="a-logo" />LoopLens</div>
      <select className="a-pick" value={L.sample} onChange={e => L.pick(+e.target.value)} aria-label="Example">
        {SAMPLES.map((x, k) => <option key={k} value={k}>{file(x[0])}</option>)}</select>
      <div className="a-tx">
        <button title="Reset" onClick={L.reset}><Icon n="reset" /></button>
        <button title="Back (←)" onClick={L.back} disabled={L.ix === 0}><Icon n="back" /></button>
        <button title="Play / Pause (Space)" className="pri" onClick={L.toggle}><Icon n={L.playing ? 'pause' : 'play'} /></button>
        <button title="Next step (→)" onClick={L.next} disabled={L.ix >= L.last}><Icon n="next" /></button>
      </div>
      <div className="a-seg" role="group" aria-label="Speed">{SPEEDS.map(v =>
        <button key={v} className={L.speed === v ? 'on' : ''} onClick={() => L.setSpeed(v)}>{v}×</button>)}</div>
      <button className="a-edit" onClick={() => L.view ? L.edit() : L.run(L.code)}>{L.view ? 'Edit' : 'Run ▸'}</button>
    </header>

    <div className="a-body">
      <section className="a-editor">
        <div className="a-tabs"><span className="on">{file(SAMPLES[L.sample][0])}</span></div>
        {L.res.err && <div className="a-err">{L.res.err}</div>}
        {!L.view
          ? <textarea className="a-ta" value={L.code} spellCheck={false} onChange={e => L.setCode(e.target.value)} />
          : <div className="a-code">
            {s.line === 0 && lens}
            {lines.map((t, k) => <div key={k}>
              <div className={'a-ln' + (k + 1 === s.line ? ' on' : '')}><i>{k + 1}</i><code><Hl src={t} /></code></div>
              {k + 1 === s.line && lens}
            </div>)}
          </div>}
      </section>

      <aside className="a-side">
        <div className="a-side-h">Runtime</div>
        <Sec title="Call stack" items={[...s.stack].reverse()} prev={p.stack} tone="t-stack" top />
        <Sec title="Web APIs" items={s.web} prev={p.web} tone="t-web" />
        <Sec title="Microtask queue" items={s.micro} prev={p.micro} tone="t-micro" numbered />
        <Sec title="Task queue" items={s.tasks} prev={p.tasks} tone="t-task" numbered />
        <section className={'a-sec' + (s.scope.length ? '' : ' empty')}>
          <h3><span>Variables</span><b>{s.scope.reduce((n, [, v]) => n + v.length, 0)}</b></h3>
          {s.scope.map(([n, v]) => <div key={n} className="a-scope"><span>{n}</span>
            {v.map(([k, x]) => <div key={k} className={'a-var' + (L.changed(n, k, x) ? ' chg' : '')}><code>{k}</code><code>{x}</code></div>)}</div>)}
        </section>
      </aside>
    </div>

    <section className="a-panel">
      <div className="a-panel-h">
        <span className="on">Console <b>{s.out.length}</b></span>
        <Timeline L={L} className="tl a-tl" />
      </div>
      <div className="a-panel-b">
        {s.out.length ? s.out.map((t, k) => <div key={k} className={'a-out' + (k >= p.out.length ? ' nw' : '')}><i>›</i>{t}</div>) : <em>Console is empty</em>}
      </div>
    </section>

    <footer className="a-status">
      <span className={'a-ph ph-' + s.loop}>{PHASE_LABEL[s.loop] ?? s.loop}</span>
      <span>Step {L.ix} / {L.last}</span>
      <span>{s.time} ms</span>
      <span className="a-keys"><kbd>←</kbd><kbd>→</kbd> step <kbd>Space</kbd> play</span>
    </footer>
  </div>);
}

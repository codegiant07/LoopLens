import { useEffect, useState } from 'react';
import { trace, SAMPLES } from './engine';
import type { Step } from './engine';
import './App.css';

const KC: Record<string, string> = { call: 'a', run: 'a', ret: 'a', start: 'a', done: 'a', await: 'g', enq: 'g', micro: 'g', task: 'y', timer: 'y', log: 'b', err: 'r' };
const EMPTY: Step = { k: 'start', note: '', line: 0, stack: [], web: [], tasks: [], micro: [], out: [], scope: [], loop: 'sync', time: 0 };

function List({ title, items, prev, cls, numbered }: { title: string; items: string[]; prev: string[]; cls: string; numbered?: boolean }) {
  return (<div><h2>{title}</h2><div className="bx">{items.length
    ? items.map((t, k) => <span key={k + t} className={`ch ${cls}${prev.includes(t) ? '' : ' nw'}`}>{numbered ? `${k + 1}. ` : ''}{t}</span>)
    : <em>empty</em>}</div></div>);
}

export default function App() {
  const [code, setCode] = useState(SAMPLES[0][1]);
  const [res, setRes] = useState(() => trace(SAMPLES[0][1]));
  const [editing, setEditing] = useState(false);
  const [ix, setIx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const S = res.steps, last = S.length - 1;
  const s = S[ix] ?? EMPTY, p = S[ix - 1] ?? EMPTY;

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIx(i => { if (i >= last) { setPlaying(false); return i; } return i + 1; }), 1400 / speed);
    return () => clearInterval(t);
  }, [playing, speed, last]);

  const run = (src: string) => { const r = trace(src); setRes(r); setIx(0); setPlaying(false); setEditing(!r.steps.length); };
  const prevVars = new Map(p.scope.flatMap(([n, v]) => v.map(([k, x]) => [n + '.' + k, x] as const)));
  const view = !editing && S.length > 0;

  return (<main>
    <h1>JavaScript execution visualizer</h1>
    <div className="row">
      <select onChange={e => { const c = SAMPLES[+e.target.value][1]; setCode(c); run(c); }}>{SAMPLES.map((x, k) => <option key={k} value={k}>{x[0]}</option>)}</select>
      <button onClick={() => view ? (setPlaying(false), setEditing(true)) : run(code)}>{view ? 'Edit code' : 'Run'}</button>
    </div>
    {!view && <textarea value={code} spellCheck={false} onChange={e => setCode(e.target.value)} />}
    {res.err && <div className="er">{res.err}</div>}
    {view && <>
      <div className="row">
        <button onClick={() => { setPlaying(false); setIx(0); }}>Reset</button>
        <button onClick={() => { setPlaying(false); setIx(i => Math.max(0, i - 1)); }}>Back</button>
        <button onClick={() => { if (!playing && ix >= last) setIx(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Play'}</button>
        <button onClick={() => { setPlaying(false); setIx(i => Math.min(last, i + 1)); }}>Next step</button>
        <label style={{ fontSize: 13 }}>Speed <input type="range" min={0.5} max={4} step={0.5} value={speed} onChange={e => setSpeed(+e.target.value)} /></label>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--mut)' }}>Step {ix} of {last} · virtual clock {s.time} ms</span>
      </div>
      <div id="pl"><span style={{ border: 0 }}>Event loop:</span>
        <span className={s.stack.length ? 'on' : ''}>Call stack running</span><span className={s.loop === 'micro' ? 'on' : ''}>Microtasks</span><span className={s.loop === 'task' ? 'on' : ''}>Tasks</span></div>
      <div className="g2">
        <div><h2>Code (current line highlighted)</h2><div className="bx" style={{ padding: '6px 0' }}>
          {code.split('\n').map((t, k) => <div key={k} className={'ln' + (k + 1 === s.line ? ' on' : '')}><i>{k + 1}</i><span>{t}</span></div>)}</div></div>
        <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
          <List title="Call stack (top first)" items={[...s.stack].reverse()} prev={p.stack} cls="c1" />
          <List title="Web APIs (timers waiting in the browser)" items={s.web} prev={p.web} cls="c3" />
        </div></div>
      <div id="note">{s.note}</div>
      <div className="g3">
        <List title="Microtask queue (next first)" items={s.micro} prev={p.micro} cls="c2" numbered />
        <List title="Task queue (next first)" items={s.tasks} prev={p.tasks} cls="c3" numbered />
        <div><h2>Console output</h2><div className="bx">{s.out.length ? s.out.map((t, k) => <div key={k}><span className={'ch c4' + (k >= p.out.length ? ' nw' : '')}>{t}</span></div>) : <em>nothing yet</em>}</div></div>
      </div>
      <div style={{ marginTop: 12 }}><h2>Scope and variables (yellow = changed this step)</h2><div className="bx sc">
        {s.scope.length ? s.scope.map(([n, v]) => <div key={n}><b>{n}: </b>{v.map(([k, x]) => <span key={k} className={'ch c4' + (prevVars.get(n + '.' + k) !== x ? ' ch2' : '')}>{k} = {x}</span>)}</div>) : <em>no variables yet</em>}</div></div>
      <div style={{ marginTop: 12 }}><h2>Timeline (click a block to jump)</h2><div id="tl">
        {S.map((t, k) => <i key={k} title={`Step ${k}`} className={KC[t.k] + (k === ix ? ' cur' : '')} onClick={() => { setPlaying(false); setIx(k); }} />)}</div></div>
    </>}
  </main>);
}

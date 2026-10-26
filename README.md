# JavaScript execution visualizer (phase 2)
`npm install`, then `npm run dev` (app), `npm test` (event-loop tests), `npm run build`.
- `src/engine/interpreter.ts`: acorn parser + generator-based interpreter that records step snapshots (no UI code).
- `src/engine/types.ts`: the typed snapshot contract the UI consumes.
- `src/App.tsx`: React UI that replays snapshots.
Real: parsing, scope, closures, promise ordering. Simulated: stack, Web APIs, queues, event loop, virtual clock.
Unsupported: classes, this, generators, destructuring, spread, switch, for-in, regex, Promise.all/race/finally, setInterval, modules, top-level await.

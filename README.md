# JavaScript execution visualizer (phase 5)
`npm install`, then `npm run dev` (app), `npm test` (event-loop tests), `npm run build`.
- `src/engine/interpreter.ts`: acorn parser + generator-based interpreter that records step snapshots (no UI code).
- `src/engine/types.ts`: the typed snapshot contract the UI consumes.
- `src/App.tsx`: React UI that replays snapshots.
Real: parsing, scope, closures, promise ordering. Simulated: stack, Web APIs, queues, event loop, virtual clock.
Fully strict TypeScript (`any` is explicit for dynamic JS values). Queue chips animate between positions (respects reduced motion). Unsupported: private #fields, super.property, class fields, generators, switch, for-in, regex, Promise.allSettled/any, modules, top-level await, var hoisting, do…while, optional chaining, labels, the comma operator, tagged templates, `arguments`, the `in` and bitwise operators, and array callbacks other than map/forEach/filter.

# LoopLens — documentation

LoopLens is a JavaScript execution visualizer. You pick an example (or paste your own code), then step through it one action at a time and watch the call stack, the Web APIs, the microtask and task queues, the console and the variables change. Every step comes with a plain-English explanation, so you can see _why_ `promise` prints before `timeout`, not just _that_ it does.

It runs entirely in the browser. Your code is never sent anywhere: LoopLens parses it and runs it in its own small interpreter.

Version 0.5.0 (phase 5).

---

## Contents

1. [Quick start](#quick-start)
2. [Using LoopLens](#using-looplens)
3. [What code it can run](#what-code-it-can-run)
4. [How it works](#how-it-works)
5. [Build, SEO and the production address](#build-seo-and-the-production-address)
6. [Project structure](#project-structure)
7. [Testing](#testing)
8. [Making changes](#making-changes)
9. [Known limitations](#known-limitations)

---

## Quick start

Requires Node.js 22 (see `.nvmrc`).

```bash
npm ci
npm run dev        # start the app at http://localhost:5173
npm test           # run all tests (engine, examples, language features)
npm run typecheck  # strict TypeScript check
npm run build      # type check, then build to dist/
```

---

## Using LoopLens

### The screen, top to bottom

| Area                                | What it shows                                                                                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Example picker**                  | 21 examples in 5 categories (see below). Shows "Your code" when you've edited the code or opened a shared link.                                                                           |
| **Edit code / Run**                 | Switches to a text editor. **Run** turns your code into steps. The browser's **Back** button in the editor does the same as Run.                                                          |
| **Copy link**                       | Copies a link that opens LoopLens with the current code. The code is stored after the `#` in the URL, so it is never sent to a server.                                                    |
| **Reset · Back · Play · Next step** | Move through the steps. Play advances one step every 1.4 s at 1× speed.                                                                                                                   |
| **Speed**                           | 0.5× to 4×.                                                                                                                                                                               |
| **Predict mode**                    | Off by default. When on, LoopLens asks "What will it print?" before each step that prints to the console (see below).                                                                     |
| **Step counter**                    | `Step 7 of 17 · virtual clock 0 ms`. Timers use a simulated clock, so a 1-second timer doesn't make you wait a second.                                                                    |
| **Event loop**                      | `Script → Microtasks → Task ↺`. The lit phase is what the event loop is doing right now.                                                                                                  |
| **Code**                            | Your code with the line being run highlighted.                                                                                                                                            |
| **Call stack**                      | Functions currently running, top first. `main script` is the whole program; `new Dog()` is a constructor.                                                                                 |
| **Web APIs**                        | Timers waiting in the browser, with the virtual time they're due.                                                                                                                         |
| **Explanation**                     | What just happened and why, in plain words.                                                                                                                                               |
| **Microtask queue**                 | Promise callbacks, code after `await`, `queueMicrotask`. All of them run before the next task.                                                                                            |
| **Task queue**                      | Timer callbacks. The event loop takes one at a time.                                                                                                                                      |
| **Console output**                  | Everything printed so far. New lines flash briefly.                                                                                                                                       |
| **Scope and variables**             | Every variable each scope can see. Yellow means it changed in this step. Inside methods, `this` is shown too.                                                                             |
| **Timeline**                        | One block per step. Click any block to jump there. Colors: gray = script, calls and returns; green = await and microtasks; amber = timers and tasks; blue = console output; red = errors. |

A small **?** next to a panel title explains the rule behind it (for example, why microtasks run before tasks). Hover it, or focus it with the keyboard; **Escape** closes it.

Queue items slide forward when the front one is taken. If your system asks for reduced motion, nothing animates.

### Examples

| Category                | Examples                                                                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basics                  | Call stack · Closures · Classes and this                                                                                                                   |
| Timers & the task queue | Timers run by delay · A loop blocks timers · var vs let in a loop · setInterval and clearInterval                                                          |
| Promises & microtasks   | setTimeout vs promise · Promise chain · Two chains take turns · queueMicrotask · Microtasks inside a task · Promise.all vs Promise.race · Promise .finally |
| async / await           | async/await order · async returns a promise · Sleep with a promise · await Promise.all                                                                     |
| Errors                  | async error handling · Promise .catch · try/catch and timers                                                                                               |

Every example is tested to print exactly what real JavaScript prints, in the same order (see [Testing](#testing)).

The picker works with the mouse or the keyboard: **↑ ↓ Home End** move, **Enter** picks, **Escape** closes. It always opens at the top of the list.

### Predict mode

It is off by default; tick **Predict mode** (the **?** next to it explains it), then press Play or Next step. Before any step that prints, the explanation box asks **"What will it print?"** and Play pauses. The choices are the lines this run hasn't printed yet, so they are always real outputs. Pick one to see if you were right, or choose **Just show me**. It only asks when there are at least two possible answers. Each visit to a step asks again, so after Reset, Back or a timeline jump you can try a question a second time.

This is the fastest way to test your understanding: in _async/await order_, it asks whether `C`, `D` or `E` prints next. The answer is `E`.

### Keyboard and screen readers

- **Skip to content** is the first Tab stop on every page.
- Every control is a real button, link or form field with a visible focus ring. The example picker opens with Enter, Space or the arrow keys.
- The **timeline** is a slider: focus it and use ←/→ (one step), Page Up/Page Down (ten steps), Home and End. Screen readers hear "Step 3 of 15: callback queued".
- The step explanation is announced politely after each step (not while Play is running, so it doesn't talk over itself). The current code line, the active event-loop phase and changed variables are spelled out in text, not only shown by color. "Link copied" is announced.
- Animations are turned off when the system asks for reduced motion.

### Light and dark

LoopLens follows your system's color scheme.

---

## What code it can run

### Supported

- **Variables:** `let`, `const`, `var` (function-scoped), block scope, closures, `let` in loops (each round gets its own copy).
- **Functions:** declarations (hoisted), expressions, arrow functions, recursion, default parameters, `...rest` parameters, `async` functions and `await`.
- **Destructuring and spread:** `const {a, b: {c}, ...rest} = obj`, `const [x, , y = 1] = arr`, swapping with `[a, b] = [b, a]`, destructuring in parameters, `for…of` and `catch`; `...spread` in arrays, calls and objects.
- **Objects and classes:** object literals with methods, getters and setters; `this`; classes with `constructor`, methods, getters, setters and `static` members; `extends` and `super(...)`, including extending `Error`; `new` on plain functions; `instanceof`.
- **Control flow:** `if`/`else`, `for`, `for…of`, `while`, `break`, `continue`, `try`/`catch`/`finally`, `throw`, the `?:`, `&&`, `||` and `??` operators.
- **Async:** `setTimeout`/`clearTimeout`, `setInterval`/`clearInterval`, `queueMicrotask`, `new Promise`, `Promise.resolve`/`reject`/`all`/`race`, and `.then`/`.catch`/`.finally`.
- **Built-ins:** `console.log`/`error`/`warn`, `Math`, `JSON`, `Object`, `Array`, `Number`, `String`, `Error`, `TypeError`, `parseInt`, `parseFloat`, `Map`, `Set`. Arrays run callbacks for `map`, `forEach` and `filter`.

### Not supported yet

Private `#fields`, `super.property`, class fields, generators, `switch`, `for…in`, regular expressions, `Promise.allSettled`/`any`, modules (`import`/`export`), top-level `await`, `var` hoisting, `do…while`, optional chaining (`?.`), labels, the comma operator, tagged templates, `arguments`, the `in` and bitwise operators, and array callbacks other than `map`/`forEach`/`filter` (such as `reduce`, `sort` and `find`).

LoopLens checks your code before running it and names the first unsupported thing it finds, with its line number.

### Real vs simulated

- **Real:** parsing, scope, closures, `this`, and the exact order in which promises, `await` and timers run, including subtle cases such as `.finally` and a `.then` that returns a promise both costing extra microtask turns.
- **Simulated:** the call stack, Web APIs, queues, the event loop and the clock. Time is virtual: when nothing else can run, the clock jumps straight to the next timer.

### Limits and rules

- A run stops after **3,000 steps** (to keep the page responsive) or **40,000 operations** (to catch infinite loops). A `setInterval` that is never cleared hits the step limit with a message telling you to call `clearInterval`.
- Functions follow **strict-mode** rules: a plain call like `f()` gets `this = undefined`.
- `this` outside any function or class is not supported (in a browser script it would be the `window` object).
- `setInterval` repeats at least every 1 ms.
- Getters are shown as `(...)` in the variables and console views (like Chrome's console) instead of being run.
- Uncaught errors are logged as `Uncaught …` and the event loop keeps going, as in a browser. Unhandled promise rejections are logged at the end as `Uncaught (in promise) …`.

---

## How it works

```
your code
   │  acorn.parse                       parse into a syntax tree (ES2022)
   ▼
syntax tree
   │  scan                              reject unsupported syntax, with line numbers
   ▼
interpreter (generators)                runs the program; after every action it records a Step
   │
   ▼
TraceResult { steps: Step[], err? }     the full recording
   │
   ▼
React UI                                replays steps[ix]; nothing is re-run while you step
```

The whole program runs **once**, up front, and every step is recorded. Stepping, going back and jumping on the timeline only change which recorded step is on screen. That is what makes **Back** possible.

### The engine (`src/engine/interpreter.ts`)

- **Scopes** are `Env` objects chained to their parent; `const` names are tracked so reassignment throws the real `TypeError`.
- **Functions** are `Fn` objects holding their syntax node and the scope they were created in (that's what closures are).
- **Statements and expressions** are evaluated by generator functions (`ex` and `ev`). An `await` is a `yield`, so an `async` function can pause mid-way and be resumed later.
- **Promises** are the engine's own `P` objects. Settling a promise queues its reactions as microtask jobs, following the ECMAScript rules, including the extra "adopt" job when a promise is resolved with another promise.
- **Timers** go into Web APIs with a due time on the virtual clock.
- **The event loop** (`loop()`) does what a browser does: run every microtask; when none are left, run **one** task; when there are no tasks, advance the clock to the next timer and move it to the task queue. A `setInterval` re-arms itself each time it fires.
- **Classes** are `Cls` objects with a prototype for methods and accessors and a separate object for static members. `new` runs constructors from child to parent; `super()` creates `this` in a subclass.

### The step contract (`src/engine/types.ts`)

This is the only thing the UI knows about the engine:

| Field                   | Meaning                                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `k`                     | Step kind: `start`, `run`, `call`, `ret`, `log`, `await`, `enq`, `micro`, `task`, `timer`, `err`, `done` |
| `note`                  | The plain-English explanation                                                                            |
| `line`                  | Line to highlight (0 = none)                                                                             |
| `stack`                 | Call stack, bottom first                                                                                 |
| `web`, `tasks`, `micro` | Web APIs, task queue and microtask queue labels                                                          |
| `out`                   | Console output so far                                                                                    |
| `scope`                 | `[scope name, [name, value][]][]`, innermost scope first                                                 |
| `loop`                  | Event loop phase: `sync`, `micro`, `task` or `done`                                                      |
| `time`                  | Virtual clock in ms                                                                                      |

---

## Build, SEO and the production address

`npm run build` typechecks, builds the browser bundle, builds a server bundle (`vite build --ssr`), then runs `scripts/prerender.mjs`, which writes `dist/index.html`, one `dist/<page>.html` per route, `dist/404.html`, `sitemap.xml`, `robots.txt` and Cloudflare's `_headers`. Page text and the visualizer's first step are real HTML, so search engines see them without running JavaScript. The browser then makes only the visualizer interactive.

The site is hosted on **Cloudflare Pages**; see [DEPLOYMENT.md](DEPLOYMENT.md) for the settings and launch checklist.

**The production address lives in one place: the `SITE_URL` environment variable** (for example `https://looplens.dev`, no trailing slash). Set it in Cloudflare → Workers & Pages → your project → Settings → Variables and Secrets, environment **Production**. Canonical URLs, Open Graph, JSON-LD, the sitemap, robots.txt and `_headers` all come from it.

| Build                                      | Result                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Production branch (`main`) with `SITE_URL` | Indexable: canonical URLs, sitemap, `robots.txt` with `Allow`                                              |
| Production branch **without** `SITE_URL`   | **Build fails**, so a placeholder can never go live                                                        |
| Any other branch (preview)                 | `noindex` on every page, `robots.txt` disallows everything (Cloudflare also sends `X-Robots-Tag: noindex`) |
| Local `npm run build`                      | Uses the placeholder `https://YOUR-DOMAIN.example`, `noindex`, no absolute URLs written                    |

Try a production build locally: `CF_PAGES=1 CF_PAGES_BRANCH=main SITE_URL=https://example.com npm run build`. (`src/site.ts` also understands Vercel's `VERCEL_ENV`, in case the site ever moves.)

**Performance.** Each page ships its example's steps precomputed (as JSON next to the visualizer), so stepping, Play and Predict mode work without the interpreter. The interpreter and acorn (about 41 KB gzipped) load on demand, starting as soon as the visualizer is hovered, touched or focused, and are needed only to run new code, pick another example or open a share link. Pages without a visualizer (404) load no JavaScript.

`npm run perf` measures the running preview (`npx vite preview --port 4173`) with Lighthouse's mobile lab settings (4× CPU slowdown, slow 4G, phone viewport, no cache) using the installed Chrome, and prints FCP, LCP, CLS, TBT, time until the visualizer responds, and bytes transferred (median of 3 runs). These are lab numbers for comparing builds; real-user Core Web Vitals (including INP) come from field data after launch.

URL policy: no trailing slash (`/javascript-event-loop`), unknown paths get `404.html` (always `noindex`), and `#code=…` share links stay in the URL fragment, which is never sent to servers or crawlers, so they create no duplicate pages.

**Add a topic page:** add an entry to `ROUTES` in `src/routes.ts` (with `kind: 'topic'`, `nav`, `sample`, `published`/`lastmod`), write its article in `src/content/<topic>.tsx` and register it in `src/content/index.ts`. Use `<Link to="/javascript-…">` for links to other topics (it renders plain text until that page exists) and show code with `<Code>`; take code from `SAMPLES` where possible so the text matches what the visualizer runs. Header navigation, breadcrumb, "Next" link, article JSON-LD and the sitemap entry are generated. The tests check its title (30–60 characters) and description (70–160) and that its sample exists; the build checks that it gets exactly one H1, a correct canonical URL and a sitemap entry.

---

## Project structure

| Path                                             | Purpose                                                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                                     | HTML template: shared head tags (icons, theme color) and the `<!--app-head-->` / `<!--app-html-->` markers the prerender fills   |
| `src/main.tsx`                                   | Browser entry: hydrates the prerendered visualizer (`#viz`); in `npm run dev` loads `src/dev.tsx`, which renders the whole page  |
| `src/entry-server.tsx`                           | Build-time entry: turns a route into static HTML                                                                                 |
| `src/Page.tsx`                                   | Page shell: header, H1, page text, the visualizer and footer                                                                     |
| `src/content/`                                   | Topic page articles (static HTML, never in the browser bundle) and the `Link` / `Code` helpers                                   |
| `src/routes.ts`                                  | **Route manifest**: every page's path, title, description, H1, sample and indexability                                           |
| `src/site.ts`                                    | **Site settings**: `SITE_URL` handling, site name, social image                                                                  |
| `src/seo.ts`                                     | Head tags, JSON-LD, `sitemap.xml` and `robots.txt`, all generated from the manifest                                              |
| `scripts/prerender.mjs`, `scripts/check-seo.mjs` | Last build step: writes one HTML file per route plus crawl files, then fails the build on SEO errors                             |
| `scripts/lab-perf.mjs`                           | `npm run perf`: lab performance check with the installed Chrome (see Build, SEO and the production address)                      |
| `scripts/make-icons.mjs`                         | Regenerates `public/` icons and `og-image.png` with the installed Chrome (run by hand)                                           |
| `public/`                                        | Favicons, app icons, `manifest.webmanifest`, social preview image                                                                |
| `src/App.tsx`                                    | The whole UI: controls, panels, Predict mode, Copy link, tooltips, timeline                                                      |
| `src/App.css`                                    | Styles, color tokens, light and dark themes                                                                                      |
| `src/Picker.tsx`                                 | The grouped example picker (a native `<select>` would let macOS draw its menu over the address bar)                              |
| `src/engine/interpreter.ts`                      | The interpreter (no UI code)                                                                                                     |
| `src/engine/types.ts`                            | The `Step` / `TraceResult` contract                                                                                              |
| `src/engine/samples.ts`                          | The 21 examples, grouped                                                                                                         |
| `src/engine/index.ts`                            | Public engine API: `trace`, `SAMPLES`, `GROUPS`                                                                                  |
| `src/engine/*.test.ts`                           | Tests (see below)                                                                                                                |
| `src/engine/realjs.ts`                           | Test helper that runs code as real JavaScript                                                                                    |
| `src/engine/node-vm.d.ts`                        | Types for the part of Node's `vm` module the tests use (so no `@types/node` is needed)                                           |
| `docs/design/`                                   | UI redesign mockups (A–D). Open `http://localhost:5173/docs/design/` while `npm run dev` runs. Not part of the production build. |

The project is fully strict TypeScript (`"strict": true`); values created by the user's program are typed as an explicit `any`.

---

## Testing

`npm test` runs 97 tests: 82 engine tests in three files, plus 15 SEO tests in `src/seo.test.ts` (site URL rules, manifest lengths and uniqueness, head tags, JSON-LD, sitemap, robots).

Engine test files:

| File                  | What it checks                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `interpreter.test.ts` | Hand-written expectations for tricky event-loop ordering, and the safety guards (unsupported syntax, infinite loops, syntax errors, `const` reassignment).                                                                                  |
| `samples.test.ts`     | Every example: no errors, every step has an explanation, under 120 steps, and **the console output matches real JavaScript exactly**.                                                                                                       |
| `features.test.ts`    | 48 tests for language features (destructuring, spread, classes, `this`, getters/setters, `Promise.all`/`race`/`finally`, `setInterval`), each **compared with real JavaScript**, plus checks that unsupported features give clear messages. |

**How the real-JavaScript comparison works:** `realjs.ts` runs the same code in Node's own engine (in a sandbox through the `vm` module), records `console.log` output, and waits until every timer has finished. The test fails if LoopLens's output differs in any way, including order. Errors thrown inside timers are recorded as `Uncaught <error>`, the way a browser logs them.

---

## Making changes

Code style is [Prettier](https://prettier.io) with its default settings (`.prettierrc.json`; `.prettierignore` skips installed and generated files). In VS Code the Prettier extension formats on save. To format everything at once with the extension's bundled Prettier: `node ~/.vscode/extensions/esbenp.prettier-vscode-*/node_modules/prettier/bin/prettier.cjs --write .`

### Add an example

1. Add `['Name', \`code\`]`to the right group in`src/engine/samples.ts`.
2. Run `npm test`. The example must match real JavaScript, have an explanation for every step and finish in under 120 steps.
3. Print plain values (or `JSON.stringify(...)`) so the comparison checks behavior, not console formatting.

### Support a new piece of syntax

1. Add the syntax tree node type to the `OK` list in `interpreter.ts`, so `scan` stops rejecting it.
2. Handle it in `ev` (expressions) or `ex` (statements). Statements that should show a "Line N: …" step need an entry in `NOTE`.
3. Add tests to `features.test.ts` with `same(name, code)`, which compares against real JavaScript.
4. Run `npm test` and `npm run typecheck`, and update the supported list in this file and in `README.md`.

Keep existing explanation texts and step kinds unchanged unless you mean to change them; the UI and tests depend on them.

### Change the UI

The UI only reads `Step` objects, so most UI work doesn't touch the engine. Colors are CSS variables at the top of `src/App.css`, with a dark-mode set under `prefers-color-scheme: dark`.

---

## Known limitations

- **`var` hoisting:** using a `var` before its declaration throws a `ReferenceError` instead of giving `undefined`.
- **Callbacks with a single-expression body** (like `() => console.log("x")`) run without a highlighted code line, because the engine has no statement line to report.
- **Array methods:** only `map`, `forEach` and `filter` can run callbacks; `reduce`, `sort`, `find` and others stop with a "not supported yet" message.
- **`this` in plain function calls** is `undefined` (strict mode), even in code that would run in sloppy mode in a browser.
- Everything listed under [Not supported yet](#not-supported-yet).

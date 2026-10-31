// Route manifest: the single list of pages. Page metadata, canonical URLs, the sitemap, JSON-LD, navigation
// links and the list of prerendered files are all generated from it. Add a page here and everything else follows.

export type RouteKind = "home" | "topic" | "notfound";

export interface Route {
  /** URL path without a trailing slash ('/' for the home page). */
  path: string;
  kind: RouteKind;
  /** <title>, 30–60 characters, "Topic – LoopLens". */
  title: string;
  /** Meta description, 70–160 characters, matching what the page actually shows. */
  description: string;
  h1: string;
  /** Short name used in navigation, breadcrumbs and related links (topic pages). */
  nav?: string;
  /** false keeps the page out of the sitemap and adds noindex. */
  indexable: boolean;
  /** Name of the engine example (SAMPLES) the visualizer opens with. No sample = no visualizer on the page. */
  sample?: string;
  /** Paths of related pages, linked at the bottom of the page (only pages that exist). */
  related?: string[];
  /** YYYY-MM-DD the page was first published (topic pages; used in article JSON-LD). */
  published?: string;
  /** YYYY-MM-DD. Only set when the page content really changed on that date (sitemap lastmod, dateModified). */
  lastmod?: string;
}

export const ROUTES: Route[] = [
  {
    path: "/",
    kind: "home",
    indexable: true,
    sample: "Call stack",
    title: "LoopLens – Interactive JavaScript Visualizer",
    description:
      "Understand JavaScript execution visually. Explore the call stack, execution context, closures, promises, microtasks, macrotasks and event loop step by step.",
    h1: "Interactive JavaScript visualizer",
  },
  {
    path: "/javascript-event-loop",
    kind: "topic",
    indexable: true,
    sample: "setTimeout vs promise",
    nav: "Event loop",
    title: "JavaScript Event Loop Explained Visually – LoopLens",
    description:
      "See how the JavaScript event loop runs your script, then every microtask, then one task at a time. Step through setTimeout and promises in a live visualizer.",
    h1: "How the JavaScript event loop works",
    related: [
      "/javascript-microtasks-macrotasks",
      "/javascript-call-stack",
      "/javascript-promises",
    ],
    published: "2026-10-31",
    lastmod: "2026-10-31",
  },
  {
    path: "/javascript-execution-context",
    kind: "topic",
    indexable: true,
    sample: "Hoisting and the TDZ",
    nav: "Execution context",
    title: "JavaScript Execution Context and Hoisting – LoopLens",
    description:
      "Learn what a JavaScript execution context is, how hoisting and the temporal dead zone work, and how this is set, with a step-by-step visual example.",
    h1: "JavaScript execution context, explained",
    related: ["/javascript-call-stack", "/javascript-closures"],
    published: "2026-10-31",
    lastmod: "2026-10-31",
  },
  {
    path: "/javascript-call-stack",
    kind: "topic",
    indexable: true,
    sample: "Call stack",
    nav: "Call stack",
    title: "JavaScript Call Stack Explained Step by Step – LoopLens",
    description:
      "See how the JavaScript call stack adds a frame for every function call and removes it on return. Learn recursion and stack overflow with a live visualizer.",
    h1: "How the JavaScript call stack works",
    related: ["/javascript-execution-context", "/javascript-event-loop"],
    published: "2026-10-31",
    lastmod: "2026-10-31",
  },
  {
    path: "/javascript-microtasks-macrotasks",
    kind: "topic",
    indexable: true,
    sample: "Microtasks inside a task",
    nav: "Microtasks & macrotasks",
    title: "Microtasks vs Macrotasks in JavaScript – LoopLens",
    description:
      "Learn which JavaScript callbacks go to the microtask queue and which go to the task queue, and why all microtasks run before the next task.",
    h1: "Microtasks vs macrotasks in JavaScript",
    related: ["/javascript-event-loop", "/javascript-promises"],
    published: "2026-10-31",
    lastmod: "2026-10-31",
  },
  {
    path: "/javascript-promises",
    kind: "topic",
    indexable: true,
    sample: "Promise chain",
    nav: "Promises",
    title: "JavaScript Promises: then, catch and finally – LoopLens",
    description:
      "Learn how JavaScript promises work: states, chaining with then, error handling with catch and finally, and Promise.all vs Promise.race, step by step.",
    h1: "How JavaScript promises work",
    related: ["/javascript-microtasks-macrotasks", "/javascript-event-loop"],
    published: "2026-10-31",
    lastmod: "2026-10-31",
  },
  {
    path: "/javascript-closures",
    kind: "topic",
    indexable: true,
    sample: "Closures",
    nav: "Closures",
    title: "JavaScript Closures Explained with Examples – LoopLens",
    description:
      "Understand JavaScript closures by watching a counter remember its variable after its outer function returns. Includes the classic var vs let loop bug.",
    h1: "JavaScript closures, explained",
    related: ["/javascript-execution-context", "/javascript-call-stack"],
    published: "2026-10-31",
    lastmod: "2026-10-31",
  },
  {
    path: "/404",
    kind: "notfound",
    indexable: false,
    title: "Page not found – LoopLens",
    description:
      "This page does not exist. Go back to LoopLens to step through JavaScript and watch the call stack, queues and event loop.",
    h1: "Page not found",
  },
];

/**
 * Suggested reading order. Pages listed here that don't exist yet are skipped, so the path can be written
 * once and fills in as pages are added.
 */
const LEARNING_PATH = [
  "/javascript-execution-context",
  "/javascript-call-stack",
  "/javascript-event-loop",
  "/javascript-microtasks-macrotasks",
  "/javascript-promises",
  "/javascript-closures",
];

export const NOT_FOUND = ROUTES.find((r) => r.kind === "notfound")!;

/** The page for a URL path; unknown paths get the 404 page. */
export const routeFor = (path: string): Route =>
  ROUTES.find(
    (r) =>
      r.kind !== "notfound" && r.path === (path.replace(/\/+$/, "") || "/"),
  ) ?? NOT_FOUND;

/** The route at a path, if that page exists. */
export const pageAt = (path: string): Route | undefined =>
  ROUTES.find((r) => r.kind !== "notfound" && r.path === path);

/** Topic pages in reading order (for the header navigation). */
export const topics = (): Route[] =>
  LEARNING_PATH.map(pageAt).filter((r): r is Route => r?.kind === "topic");

/** The next existing topic after this one in the reading order. */
export function nextTopic(r: Route): Route | undefined {
  const list = topics(),
    i = list.findIndex((t) => t.path === r.path);
  return i >= 0 ? list[i + 1] : undefined;
}

/** Heading level of the visualizer's panel titles: under the page H1 on home, under "Try it" (H2) on topics. */
export const panelLevel = (r: Route): 2 | 3 => (r.kind === "topic" ? 3 : 2);

/** File the prerender step writes for a route (Cloudflare Pages serves /a-b from a-b.html). */
export const outputFile = (r: Route): string =>
  r.kind === "notfound"
    ? "404.html"
    : r.path === "/"
      ? "index.html"
      : r.path.slice(1) + ".html";

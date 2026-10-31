import { hydrateRoot } from "react-dom/client";
import App from "./App";
import type { TraceResult } from "./engine";

// On narrow screens the topic links scroll sideways: bring the current page's link into view.
const nav = document.querySelector<HTMLElement>("header.site nav"),
  here = nav?.querySelector<HTMLElement>("[aria-current=page]");
if (nav && here && nav.scrollWidth > nav.clientWidth)
  nav.scrollLeft = here.offsetLeft - (nav.clientWidth - here.offsetWidth) / 2;

// Built pages arrive as prerendered HTML plus the example's precomputed steps: only the visualizer becomes
// interactive, and the interpreter loads later, when it is needed.
// In `npm run dev` there is no prerendered HTML, so the whole page is rendered in the browser instead.
const viz = document.getElementById("viz"),
  data = document.getElementById("viz-data");
if (viz && data)
  hydrateRoot(
    viz,
    <App
      initial={viz.dataset.sample}
      level={viz.dataset.level === "3" ? 3 : 2}
      init={JSON.parse(data.textContent!) as TraceResult}
    />,
  );
else if (import.meta.env.DEV) void import("./dev");

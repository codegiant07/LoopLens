// Build-time entry (vite build --ssr): turns a route into static HTML. Used only by scripts/prerender.mjs.
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import App from "./App";
import { trace } from "./engine";
import { exampleCode } from "./examples";
import Page from "./Page";
import { panelLevel, type Route } from "./routes";

export { ROUTES, outputFile } from "./routes";
export { resolveSite } from "./site";
export {
  headTags,
  sitemapXml,
  robotsTxt,
  headersFile,
  canonicalUrl,
  isIndexed,
} from "./seo";

/**
 * Body HTML for a route. The visualizer is rendered on its own (hydratable) so it matches what main.tsx hydrates,
 * and its example's steps are computed here and shipped as JSON, so the browser needs no interpreter to show them.
 */
export function render(route: Route): string {
  if (route.sample === undefined)
    return renderToStaticMarkup(<Page route={route} />);
  const init = trace(exampleCode(route.sample));
  const viz = renderToString(
    <App initial={route.sample} level={panelLevel(route)} init={init} />,
  );
  return renderToStaticMarkup(
    <Page route={route} viz={viz} data={JSON.stringify(init)} />,
  );
}

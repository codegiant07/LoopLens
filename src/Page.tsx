// Page shell shared by every route. Prerendered to static HTML; only the visualizer inside #viz runs React
// in the browser, so page text never waits for (or depends on) JavaScript.
import type { ReactNode } from "react";
import { CONTENT } from "./content";
import { REPO_URL, SITE_NAME } from "./site";
import { nextTopic, pageAt, panelLevel, topics, type Route } from "./routes";

/**
 * `viz` is the visualizer: prerendered HTML (a string) at build time, or a live element in `npm run dev`.
 * It is rendered separately so its HTML matches exactly what the browser hydrates. `data` is the example's
 * precomputed trace (JSON) that main.tsx hydrates it with.
 */
export default function Page({
  route,
  viz,
  data,
}: {
  route: Route;
  viz?: string | ReactNode;
  data?: string;
}) {
  const attrs = {
    id: "viz",
    "data-sample": route.sample,
    "data-level": panelLevel(route),
  };
  const island =
    route.sample === undefined ? null : typeof viz === "string" ? (
      <>
        <div {...attrs} dangerouslySetInnerHTML={{ __html: viz }} />
        {data && (
          <script
            type="application/json"
            id="viz-data"
            dangerouslySetInnerHTML={{ __html: data.replace(/</g, "\\u003c") }}
          />
        )}
      </>
    ) : (
      <div {...attrs}>{viz}</div>
    );
  const Body = CONTENT[route.path];
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="site wrap">
        <a className="brand" href="/">
          {SITE_NAME}
        </a>
        {topics().length > 0 && (
          <nav aria-label="Topics">
            <ul>
              {topics().map((t) => (
                <li key={t.path}>
                  <a
                    href={t.path}
                    aria-current={t.path === route.path ? "page" : undefined}
                  >
                    {t.nav}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1}>
        {route.kind === "topic" && (
          <nav aria-label="Breadcrumb" className="crumbs">
            <ol>
              <li>
                <a href="/">Home</a>
              </li>
              <li aria-current="page">{route.nav}</li>
            </ol>
          </nav>
        )}
        <h1>{route.h1}</h1>
        {route.kind === "home" && (
          <p className="lede">
            Paste JavaScript or pick an example, then step through it line by
            line. LoopLens shows the call stack, scope and closures, Web APIs,
            the microtask and task (macrotask) queues, and how the event loop
            moves promises and timers between them.
          </p>
        )}
        {route.kind === "notfound" && (
          <p>
            There is no page at this address.{" "}
            <a href="/">Go to the LoopLens visualizer</a>.
          </p>
        )}
        {Body ? <Body viz={island} /> : island}
        {route.kind === "topic" && <TopicFooter route={route} />}
      </main>
      <footer className="site wrap">
        {SITE_NAME} is free and open source under the MIT license.{" "}
        <a href={REPO_URL}>Source code on GitHub</a>.
      </footer>
    </>
  );
}

function TopicFooter({ route }: { route: Route }) {
  const related = (route.related ?? [])
    .map(pageAt)
    .filter((r): r is Route => r !== undefined);
  const next = nextTopic(route);
  return (
    <>
      {related.length > 0 && (
        <section aria-labelledby="related">
          <h2 id="related">Related topics</h2>
          <ul>
            {related.map((r) => (
              <li key={r.path}>
                <a href={r.path}>{r.h1}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
      {next && (
        <p className="next">
          Next: <a href={next.path}>{next.h1}</a> →
        </p>
      )}
      <p className="next">
        <a href="/">Open the visualizer with your own code</a>
      </p>
    </>
  );
}

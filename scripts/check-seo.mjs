// Checks the prerendered pages before a build is allowed to finish. Errors fail the build (and so a Cloudflare Pages
// deploy); warnings are printed only. The HTML is our own generated output, so simple pattern checks suffice.

const one = (html, re) => (html.match(re) ?? [])[1];
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

/** @returns {{ errors: string[], warnings: string[] }} */
export function checkSeo({
  ssr,
  site,
  pages,
  sitemap,
  robots,
  headers,
  redirects,
  vercel,
}) {
  const errors = [],
    warnings = [];
  const err = (f, m) => errors.push(`${f}: ${m}`),
    warn = (f, m) => warnings.push(`${f}: ${m}`);
  const seen = { title: new Map(), description: new Map() };

  for (const route of ssr.ROUTES) {
    const f = ssr.outputFile(route),
      html = pages[f];
    const head = html.slice(0, html.indexOf("</head>"));
    const indexed = ssr.isIndexed(route, site);

    const h1s = (html.match(/<h1[\s>]/g) ?? []).length;
    if (h1s !== 1) err(f, `expected exactly one <h1>, found ${h1s}`);
    const titles = all(head, /<title>(.*?)<\/title>/g);
    if (titles.length !== 1)
      err(f, `expected one <title>, found ${titles.length}`);
    const title = titles[0] ?? "",
      desc = one(head, /<meta name="description" content="([^"]*)"/) ?? "";
    if (!desc) err(f, "missing meta description");
    const robotsMeta = one(head, /<meta name="robots" content="([^"]*)"/);
    if (robotsMeta !== (indexed ? "index, follow" : "noindex, follow"))
      err(f, `robots meta is "${robotsMeta}"`);
    if (/localhost|127\.0\.0\.1/.test(head) && site.indexable)
      err(f, "development URL in <head>");
    for (const u of all(head, /(?:href|content)="(https?:\/\/[^"]+)"/g))
      if (!u.startsWith(site.url + "/"))
        err(f, `URL "${u}" is not on ${site.url}`);
    if (!site.real && /YOUR-DOMAIN|your-domain/.test(head))
      err(f, "placeholder domain written into <head>");

    const canonical = one(head, /<link rel="canonical" href="([^"]*)"/);
    if (route.indexable && site.real) {
      if (canonical !== ssr.canonicalUrl(route, site))
        err(
          f,
          `canonical is "${canonical}", expected "${ssr.canonicalUrl(route, site)}"`,
        );
      if (one(head, /<meta property="og:url" content="([^"]*)"/) !== canonical)
        err(f, "og:url does not match canonical");
    } else if (canonical)
      err(f, "non-indexable page must not have a canonical URL");

    for (const json of all(
      html,
      /<script type="application\/ld\+json">(.*?)<\/script>/gs,
    )) {
      try {
        JSON.parse(json);
      } catch (e) {
        err(f, `JSON-LD does not parse: ${e.message}`);
      }
    }
    if (
      route.sample !== undefined &&
      !/<div id="viz" data-sample="[^"]+" data-level="[23]">\s*<div/.test(html)
    )
      err(f, "visualizer was not prerendered");
    if (route.sample !== undefined) {
      const data = one(
        html,
        /<script type="application\/json" id="viz-data">(.*?)<\/script>/s,
      );
      try {
        if (!JSON.parse(data ?? "").steps?.length)
          err(f, "precomputed visualizer steps are empty");
      } catch {
        err(f, "precomputed visualizer steps are missing or invalid");
      }
    }

    if (route.indexable) {
      if (title.length < 30 || title.length > 60)
        warn(f, `title is ${title.length} characters (aim for 30–60)`);
      if (desc.length < 70 || desc.length > 160)
        warn(f, `description is ${desc.length} characters (aim for 70–160)`);
      for (const [k, v] of [
        ["title", title],
        ["description", desc],
      ]) {
        if (seen[k].has(v)) err(f, `same ${k} as ${seen[k].get(v)}`);
        else seen[k].set(v, f);
      }
    }
  }

  // Internal links: every link to a LoopLens page must point at a page that exists, and every indexable page
  // must be linked from at least one other page (no orphans).
  const paths = new Set(
      ssr.ROUTES.filter((r) => r.kind !== "notfound").map((r) => r.path),
    ),
    linked = new Set();
  for (const route of ssr.ROUTES) {
    const f = ssr.outputFile(route),
      body = pages[f].slice(pages[f].indexOf("<body"));
    for (const href of all(body, /<a [^>]*href="([^"]*)"/g)) {
      if (/^https?:|^mailto:|^#/.test(href)) continue;
      if (!paths.has(href)) err(f, `broken internal link "${href}"`);
      else if (href !== route.path) linked.add(href);
    }
    if (route.kind === "topic" && !/<nav aria-label="Breadcrumb"/.test(body))
      err(f, "missing breadcrumb");
  }
  for (const r of ssr.ROUTES)
    if (r.indexable && r.path !== "/" && !linked.has(r.path))
      err(ssr.outputFile(r), "orphan page: no other page links to it");

  const locs = all(sitemap, /<loc>(.*?)<\/loc>/g);
  const expected = ssr.ROUTES.filter((r) => ssr.isIndexed(r, site)).map((r) =>
    ssr.canonicalUrl(r, site),
  );
  if (locs.join() !== expected.join())
    err(
      "sitemap.xml",
      `URLs ${JSON.stringify(locs)} do not match indexable pages ${JSON.stringify(expected)}`,
    );
  if (locs.some((u) => /[?#]/.test(u) || !u.startsWith(site.url)))
    err("sitemap.xml", "contains a query, fragment or foreign URL");
  if (site.indexable !== robots.includes("Allow: /"))
    err("robots.txt", "does not match the build's indexability");

  // Hosting rules the URLs depend on (Cloudflare Pages). Pages serves /page from page.html by itself, and uses
  // 404.html for unknown URLs only when it exists: without it, Pages treats the site as a single-page app and
  // answers every unknown URL with the home page and status 200. A catch-all redirect would do the same.
  if (!pages["404.html"])
    err(
      "404.html",
      "missing: Cloudflare Pages would serve the home page for unknown URLs",
    );
  if (
    !/^\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable$/m.test(
      headers ?? "",
    )
  )
    err("_headers", "missing the long-lived cache rule for /assets/*");
  if (redirects && /^\/\*\s/m.test(redirects))
    err(
      "_redirects",
      "a catch-all /* rule would hide the 404 page; pages are prerendered and need none",
    );
  if (
    site.real &&
    !new URL(site.url).hostname.endsWith(".pages.dev") &&
    !(headers ?? "").includes("https://:project.pages.dev/*")
  )
    err(
      "_headers",
      "the *.pages.dev address must be noindex when the site has its own domain",
    );

  // Only if a vercel.json is present (an alternative host): same URL policy there.
  if (vercel) {
    if (vercel.cleanUrls !== true)
      err(
        "vercel.json",
        "cleanUrls must be true (pages are written as /page.html and served at /page)",
      );
    if (vercel.trailingSlash !== false)
      err(
        "vercel.json",
        "trailingSlash must be false (canonical URLs have no trailing slash)",
      );
    if (vercel.rewrites?.length || vercel.routes?.length)
      err("vercel.json", "rewrites/routes would hide the 404 page");
  }
  return { errors, warnings };
}

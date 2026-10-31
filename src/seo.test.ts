import { describe, expect, it } from "vitest";
import { SAMPLES } from "./engine";
import { PAGE_EXAMPLES } from "./examples";
import { ROUTES, outputFile, routeFor } from "./routes";
import { headTags, jsonLd, robotsTxt, sitemapXml, headersFile } from "./seo";
import { PLACEHOLDER_URL, deployment, resolveSite } from "./site";

const prod = resolveSite({
  SITE_URL: "https://looplens.example.com/",
  VERCEL_ENV: "production",
});
const home = routeFor("/");

describe("resolveSite", () => {
  it("uses the placeholder and noindex when SITE_URL is not set", () => {
    expect(resolveSite({})).toEqual({
      url: new URL(PLACEHOLDER_URL).origin,
      real: false,
      indexable: false,
    });
  });
  it("fails a Vercel production build without a real SITE_URL", () => {
    expect(() => resolveSite({ VERCEL_ENV: "production" })).toThrow(/SITE_URL/);
    expect(() =>
      resolveSite({ VERCEL_ENV: "production", SITE_URL: PLACEHOLDER_URL }),
    ).toThrow(/SITE_URL/);
  });
  it("strips the trailing slash and indexes production", () => {
    expect(prod).toEqual({
      url: "https://looplens.example.com",
      real: true,
      indexable: true,
    });
  });
  it("never indexes previews, development builds or localhost", () => {
    expect(
      resolveSite({
        SITE_URL: "https://looplens.example.com",
        VERCEL_ENV: "preview",
      }).indexable,
    ).toBe(false);
    expect(
      resolveSite({
        SITE_URL: "https://looplens.example.com",
        VERCEL_ENV: "development",
      }).indexable,
    ).toBe(false);
    expect(resolveSite({ SITE_URL: "http://localhost:4173" }).indexable).toBe(
      false,
    );
  });
  it("rejects addresses that are not a plain https origin", () => {
    expect(() => resolveSite({ SITE_URL: "looplens.dev" })).toThrow();
    expect(() => resolveSite({ SITE_URL: "http://looplens.dev" })).toThrow(
      /https/,
    );
    expect(() => resolveSite({ SITE_URL: "https://looplens.dev/app" })).toThrow(
      /origin/,
    );
  });
});

describe("route manifest", () => {
  it("has unique paths, files, titles and descriptions", () => {
    for (const key of ["path", "title", "description"] as const)
      expect(new Set(ROUTES.map((r) => r[key])).size).toBe(ROUTES.length);
    expect(new Set(ROUTES.map(outputFile)).size).toBe(ROUTES.length);
  });
  it("keeps indexable metadata within the length guidelines", () => {
    for (const r of ROUTES.filter((r) => r.indexable)) {
      expect(r.title.length, r.title).toBeGreaterThanOrEqual(30);
      expect(r.title.length, r.title).toBeLessThanOrEqual(60);
      expect(r.description.length, r.description).toBeGreaterThanOrEqual(70);
      expect(r.description.length, r.description).toBeLessThanOrEqual(160);
    }
  });
  it("uses paths without trailing slashes and only real samples and related pages", () => {
    for (const r of ROUTES) {
      expect(r.path === "/" || !r.path.endsWith("/")).toBe(true);
      if (r.sample !== undefined)
        expect([...SAMPLES, ...PAGE_EXAMPLES].map((s) => s[0])).toContain(
          r.sample,
        );
      for (const p of r.related ?? []) expect(routeFor(p).path).toBe(p);
    }
  });
  it("sends unknown and trailing-slash paths to the right page", () => {
    expect(routeFor("/nope").kind).toBe("notfound");
    expect(routeFor("").kind).toBe("home");
  });
});

describe("head tags", () => {
  it("writes canonical, og:url and absolute image URLs for production", () => {
    const h = headTags(home, prod);
    expect(h).toContain(
      '<link rel="canonical" href="https://looplens.example.com/">',
    );
    expect(h).toContain(
      '<meta property="og:url" content="https://looplens.example.com/">',
    );
    expect(h).toContain(
      '<meta property="og:image" content="https://looplens.example.com/og-image.png">',
    );
    expect(h).toContain('<meta name="robots" content="index, follow">');
  });
  it("writes no absolute URL and noindex while the address is a placeholder", () => {
    const h = headTags(home, resolveSite({}));
    expect(h).not.toMatch(/https?:\/\/(?!schema)/);
    expect(h).toContain("noindex");
  });
  it("keeps the 404 page out of the index with no canonical", () => {
    const h = headTags(routeFor("/missing"), prod);
    expect(h).toContain('<meta name="robots" content="noindex, follow">');
    expect(h).not.toContain('rel="canonical"');
  });
  it("writes JSON-LD that parses and makes no claims beyond the license and price", () => {
    const m = /<script type="application\/ld\+json">(.*)<\/script>/.exec(
      headTags(home, prod),
    );
    const ld = JSON.parse(m![1]);
    expect(ld["@graph"].map((x: { "@type": string }) => x["@type"])).toEqual([
      "WebSite",
      "SoftwareApplication",
    ]);
    expect(JSON.stringify(ld)).not.toMatch(
      /aggregateRating|review|author|SearchAction/,
    );
    expect(jsonLd(routeFor("/missing"), prod)).toBeNull();
  });
});

describe("crawl files", () => {
  it("lists only indexable pages in the sitemap", () => {
    expect(sitemapXml(ROUTES, prod)).toContain(
      "<loc>https://looplens.example.com/</loc>",
    );
    expect(sitemapXml(ROUTES, prod)).not.toContain("404");
    expect(sitemapXml(ROUTES, resolveSite({}))).not.toContain("<url>");
  });
  it("opens robots.txt only for production", () => {
    expect(robotsTxt(prod)).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://looplens.example.com/sitemap.xml\n",
    );
    expect(robotsTxt(resolveSite({}))).toBe("User-agent: *\nDisallow: /\n");
  });
});

describe("topic pages", () => {
  const topicRoutes = ROUTES.filter((r) => r.kind === "topic");
  it("every topic has article content, a nav label and a sample, and every content entry has a route", async () => {
    const { CONTENT } = await import("./content");
    expect(Object.keys(CONTENT).sort()).toEqual(
      topicRoutes.map((r) => r.path).sort(),
    );
    for (const r of topicRoutes) {
      expect(r.nav).toBeTruthy();
      expect(r.sample).toBeTruthy();
    }
  });
  it("uses YYYY-MM-DD dates, with lastmod not before published", () => {
    for (const r of ROUTES)
      for (const d of [r.published, r.lastmod])
        if (d) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const r of topicRoutes)
      if (r.published && r.lastmod) expect(r.lastmod >= r.published).toBe(true);
  });
  it("writes TechArticle and BreadcrumbList JSON-LD that matches the page", () => {
    const r = topicRoutes[0];
    const ld = jsonLd(r, prod) as { "@graph": Record<string, unknown>[] };
    const [article, crumbs] = ld["@graph"];
    expect(article).toMatchObject({
      "@type": "TechArticle",
      headline: r.h1,
      url: `https://looplens.example.com${r.path}`,
    });
    expect(crumbs["@type"]).toBe("BreadcrumbList");
    expect(JSON.stringify(ld)).not.toMatch(/author|aggregateRating|review/);
    expect(headTags(r, prod)).toContain(
      '<meta property="og:type" content="article">',
    );
  });
});

describe("article text", () => {
  it("has no words glued to inline tags (JSX drops the space at a line break)", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { CONTENT } = await import("./content");
    const glued = Object.entries(CONTENT).flatMap(([path, Body]) => {
      const html = renderToStaticMarkup(
        createElement(() => Body({ viz: null })),
      );
      return (
        html.match(
          /.{12}(?:[A-Za-z0-9,.;:)]<(?:code|strong|em|samp|a)[ >]|<\/(?:code|strong|em|samp|a)>[A-Za-z0-9(]).{12}/g,
        ) ?? []
      ).map((m) => `${path}: ${m}`);
    });
    expect(glued).toEqual([]);
  });
});

describe("Cloudflare Pages", () => {
  const cf = (branch: string, extra: Record<string, string> = {}) => ({
    CF_PAGES: "1",
    CF_PAGES_BRANCH: branch,
    ...extra,
  });
  it("indexes the production branch (main) and never a preview branch", () => {
    expect(
      resolveSite(cf("main", { SITE_URL: "https://looplens.example.com" }))
        .indexable,
    ).toBe(true);
    expect(
      resolveSite(cf("feature/x", { SITE_URL: "https://looplens.example.com" }))
        .indexable,
    ).toBe(false);
  });
  it("fails a production build without a real SITE_URL", () => {
    expect(() => resolveSite(cf("main"))).toThrow(/SITE_URL/);
    expect(() => resolveSite(cf("feature/x"))).not.toThrow();
  });
  it("honours a different production branch", () => {
    const env = cf("release", {
      PRODUCTION_BRANCH: "release",
      SITE_URL: "https://looplens.example.com",
    });
    expect(resolveSite(env).indexable).toBe(true);
    expect(deployment(cf("main", { PRODUCTION_BRANCH: "release" }))).toEqual({
      production: false,
      preview: true,
    });
  });
  it("writes _headers with immutable assets and a noindex *.pages.dev rule for a custom domain", () => {
    const h = headersFile(prod);
    expect(h).toMatch(
      /^\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable$/m,
    );
    expect(h).toContain(
      "https://:project.pages.dev/*\n  X-Robots-Tag: noindex",
    );
  });
  it("does not noindex *.pages.dev when it is the real address", () => {
    const site = resolveSite(
      cf("main", { SITE_URL: "https://looplens.pages.dev" }),
    );
    expect(site.indexable).toBe(true);
    expect(headersFile(site)).not.toContain("X-Robots-Tag");
  });
});

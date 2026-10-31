// Builds everything search engines and social sites read: per-page <head> tags, JSON-LD, sitemap.xml and
// robots.txt. Pure functions of the route manifest and the resolved Site, so they are unit-tested.
import { OG_IMAGE, SITE_NAME, type Site } from "./site";
import type { Route } from "./routes";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Absolute canonical URL of a route: https://site/ for home, https://site/javascript-event-loop otherwise. */
export const canonicalUrl = (r: Route, site: Site) => site.url + r.path;

/** Whether this page in this build may be indexed. */
export const isIndexed = (r: Route, site: Site) =>
  site.indexable && r.indexable;

/** JSON-LD for a page, or null when there is nothing true and useful to say. */
export function jsonLd(r: Route, site: Site): object | null {
  if (!site.real || !r.indexable) return null;
  const url = canonicalUrl(r, site);
  if (r.kind === "home")
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": `${url}#website`,
          name: SITE_NAME,
          url,
          description: r.description,
          inLanguage: "en",
        },
        {
          "@type": "SoftwareApplication",
          "@id": `${url}#app`,
          name: SITE_NAME,
          url,
          description: r.description,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript",
          isAccessibleForFree: true,
          license: "https://opensource.org/license/mit",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        },
      ],
    };
  if (r.kind === "topic")
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "TechArticle",
          "@id": `${url}#article`,
          headline: r.h1,
          description: r.description,
          url,
          inLanguage: "en",
          ...(r.published && { datePublished: r.published }),
          ...(r.lastmod && { dateModified: r.lastmod }),
          isPartOf: {
            "@type": "WebSite",
            name: SITE_NAME,
            url: `${site.url}/`,
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${site.url}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: r.nav ?? r.h1,
              item: url,
            },
          ],
        },
      ],
    };
  return null;
}

/** <head> tags for one page (the shared tags such as charset and icons live in index.html). */
export function headTags(r: Route, site: Site): string {
  const t = [
    `<title>${esc(r.title)}</title>`,
    `<meta name="description" content="${esc(r.description)}">`,
    `<meta name="robots" content="${isIndexed(r, site) ? "index, follow" : "noindex, follow"}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:type" content="${r.kind === "topic" ? "article" : "website"}">`,
    `<meta property="og:title" content="${esc(r.title)}">`,
    `<meta property="og:description" content="${esc(r.description)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(r.title)}">`,
    `<meta name="twitter:description" content="${esc(r.description)}">`,
  ];
  // Absolute URLs only when the real address is known; a placeholder or preview URL must never be published.
  if (site.real) {
    const img = site.url + OG_IMAGE.path;
    t.push(
      `<meta property="og:image" content="${esc(img)}">`,
      `<meta property="og:image:width" content="${OG_IMAGE.width}">`,
      `<meta property="og:image:height" content="${OG_IMAGE.height}">`,
      `<meta property="og:image:alt" content="${esc(OG_IMAGE.alt)}">`,
      `<meta name="twitter:image" content="${esc(img)}">`,
      `<meta name="twitter:image:alt" content="${esc(OG_IMAGE.alt)}">`,
    );
    if (r.indexable) {
      const url = canonicalUrl(r, site);
      t.push(
        `<link rel="canonical" href="${esc(url)}">`,
        `<meta property="og:url" content="${esc(url)}">`,
      );
    }
  }
  const ld = jsonLd(r, site);
  // "<" is escaped so page text can never close the <script> element early.
  if (ld)
    t.push(
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
    );
  return t.join("\n    ");
}

/** sitemap.xml: only canonical, indexable pages of a real, indexable build (empty otherwise). */
export function sitemapXml(routes: Route[], site: Site): string {
  const urls = routes
    .filter((r) => isIndexed(r, site))
    .map(
      (r) =>
        `  <url><loc>${esc(canonicalUrl(r, site))}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ""}</url>`,
    );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

/** robots.txt: open with a sitemap link for production, closed for everything else. */
export const robotsTxt = (site: Site): string =>
  site.indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";

/** Icons and the social image: not content-hashed, so cached for a day and then revalidated. */
const STATIC_FILES = [
  "/favicon.ico",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/og-image.png",
  "/manifest.webmanifest",
];

/**
 * Cloudflare Pages `_headers` file (written to dist/ by the prerender step). HTML, sitemap.xml and robots.txt keep
 * Cloudflare's default (always revalidated), so new deploys show up at once.
 */
export function headersFile(site: Site): string {
  const rule = (path: string, ...headers: string[]) => [
    path,
    ...headers.map((h) => `  ${h}`),
    "",
  ];
  const lines = [
    "# Generated by scripts/prerender.mjs from src/seo.ts. Edit headersFile() there, not this file.",
    ...rule(
      "/*",
      "X-Content-Type-Options: nosniff",
      "Referrer-Policy: strict-origin-when-cross-origin",
    ),
    // Vite puts a content hash in every file name under /assets/, so these never change.
    ...rule("/assets/*", "Cache-Control: public, max-age=31536000, immutable"),
    ...STATIC_FILES.flatMap((f) =>
      rule(f, "Cache-Control: public, max-age=86400, must-revalidate"),
    ),
  ];
  // The project's *.pages.dev address serves the same pages as the real domain; keep it out of search results,
  // unless *.pages.dev is the real domain. (Preview URLs already get X-Robots-Tag: noindex from Cloudflare.)
  if (!new URL(site.url).hostname.endsWith(".pages.dev"))
    lines.push(
      ...rule("https://:project.pages.dev/*", "X-Robots-Tag: noindex"),
      ...rule("https://:version.:project.pages.dev/*", "X-Robots-Tag: noindex"),
    );
  return lines.join("\n");
}

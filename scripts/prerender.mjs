// Last build step (see package.json "build"): writes one static HTML file per route in the manifest, plus
// sitemap.xml and robots.txt, then checks the result. Reads the server bundle made by `vite build --ssr`.
import { readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { checkSeo } from "./check-seo.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = root + "dist/",
  ssrDir = root + "dist-ssr/";
const ssr = await import(ssrDir + "entry-server.js");

const site = ssr.resolveSite(process.env); // throws (fails the build) on a production build without SITE_URL
const template = await readFile(dist + "index.html", "utf8");
if (
  !template.includes("<!--app-head-->") ||
  !template.includes("<!--app-html-->")
)
  throw new Error(
    "index.html is missing the <!--app-head--> / <!--app-html--> markers",
  );

const pages = {};
for (const route of ssr.ROUTES) {
  // Pages without a visualizer (the 404 page) need no JavaScript at all.
  const tpl =
    route.sample === undefined
      ? template
          .replace(/\s*<script type="module"[^>]*><\/script>/g, "")
          .replace(/\s*<link rel="modulepreload"[^>]*>/g, "")
      : template;
  const html = tpl
    .replace(/<title>.*?<\/title>\s*/s, "") // the dev title; each page gets its own from headTags
    .replace("<!--app-head-->", ssr.headTags(route, site))
    .replace("<!--app-html-->", ssr.render(route));
  pages[ssr.outputFile(route)] = html;
  await writeFile(dist + ssr.outputFile(route), html);
}
const sitemap = ssr.sitemapXml(ssr.ROUTES, site),
  robots = ssr.robotsTxt(site),
  headers = ssr.headersFile(site);
await writeFile(dist + "sitemap.xml", sitemap);
await writeFile(dist + "robots.txt", robots);
await writeFile(dist + "_headers", headers); // Cloudflare Pages response headers
await rm(ssrDir, { recursive: true, force: true });

// Hosting files that could change which URLs exist (checked below).
const optional = (file) => readFile(file, "utf8").catch(() => null);
const redirects = await optional(dist + "_redirects");
const vercel = JSON.parse((await optional(root + "vercel.json")) ?? "null");
const { errors, warnings } = checkSeo({
  ssr,
  site,
  pages,
  sitemap,
  robots,
  headers,
  redirects,
  vercel,
});
for (const w of warnings) console.warn("  SEO warning: " + w);
console.log(
  `Prerendered ${Object.keys(pages).length} pages for ${site.url} (${site.indexable ? "indexable" : "noindex"}).`,
);
if (errors.length) {
  for (const e of errors) console.error("  SEO error: " + e);
  process.exit(1);
}

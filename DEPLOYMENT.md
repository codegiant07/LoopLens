# Deploying LoopLens (GitHub + Cloudflare Pages)

LoopLens is a static site: `npm run build` writes every page as ready-made HTML into `dist/`, plus `sitemap.xml`,
`robots.txt` and Cloudflare's `_headers` file. Cloudflare Pages only serves those files; there is no server code.

## Project settings (Cloudflare dashboard)

Workers & Pages → Create → Pages → **Connect to Git** → `codegiant07/LoopLens`.

| Setting                | Value                                          |
| ---------------------- | ---------------------------------------------- |
| Production branch      | `main`                                         |
| Framework preset       | None (or Vite; the commands below override it) |
| Build command          | `npm ci && npm run build`                      |
| Build output directory | `dist`                                         |
| Root directory         | (leave empty)                                  |

Environment variables (Settings → Variables and Secrets):

| Variable                  | Environment            | Value                                                                |
| ------------------------- | ---------------------- | -------------------------------------------------------------------- |
| `SITE_URL`                | **Production**         | `https://<your-domain>` (origin only, `https`, no trailing slash)    |
| `SKIP_DEPENDENCY_INSTALL` | Production and Preview | `1`, so the build installs exactly the locked versions with `npm ci` |
| `PRODUCTION_BRANCH`       | (only if not `main`)   | the production branch name                                           |

Node.js 22 comes from `.nvmrc` (Cloudflare's build image reads it).

## How the build knows what it is

Cloudflare sets `CF_PAGES=1` and `CF_PAGES_BRANCH` during builds. `src/site.ts` uses them:

| Build                                      | Result                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Production branch (`main`) with `SITE_URL` | Indexable: canonical URLs, sitemap, `robots.txt` with `Allow`                                                             |
| Production branch **without** `SITE_URL`   | **Build fails** ("SITE_URL is not set…"), so a placeholder can never go live                                              |
| Any other branch (preview)                 | `noindex` on every page, `robots.txt` disallows everything; Cloudflare also sends `X-Robots-Tag: noindex` on preview URLs |
| Local `npm run build`                      | Placeholder address, `noindex`, no absolute URLs                                                                          |

Try them locally:

```bash
CF_PAGES=1 CF_PAGES_BRANCH=main SITE_URL=https://example.com npm run build
```

```bash
CF_PAGES=1 CF_PAGES_BRANCH=feature/x SITE_URL=https://example.com npm run build
```

## URLs, 404 and headers

- **Clean URLs:** Cloudflare serves `/javascript-event-loop` from `javascript-event-loop.html` and redirects
  `/javascript-event-loop.html` to `/javascript-event-loop`. Canonical URLs have no trailing slash.
- **404:** unknown URLs get `404.html` (noindex). Without that file Cloudflare would treat the site as a single-page
  app and answer every unknown URL with the home page, so the build **fails** if it is missing or if a catch-all
  `/*` rule is added to `_redirects`.
- **Headers** (`dist/_headers`, generated from `headersFile()` in `src/seo.ts`; do not add one to `public/`):
  - `/assets/*` (content-hashed file names): cached for a year, `immutable`.
  - Icons and the social image: cached for a day.
  - HTML, `sitemap.xml`, `robots.txt`: Cloudflare's default (always revalidated), so a new deploy shows at once.
  - Every response: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - `https://<project>.pages.dev` serves the same pages as your domain, so it gets `X-Robots-Tag: noindex`.
    This rule is left out automatically if `SITE_URL` itself is a `*.pages.dev` address.

## Domain

Use the domain **without `www`** as the canonical address:

1. Project → **Custom domains** → add `looplens.example` (your domain). If the domain's DNS is on Cloudflare this is
   one click; otherwise add the CNAME record Cloudflare shows.
2. Add `www.looplens.example` as well, then redirect it to the apex: in the domain's Cloudflare dashboard,
   **Rules → Redirect Rules** → "Redirect from WWW to root" template (301).
3. Set `SITE_URL` (Production) to `https://looplens.example` and **retry the latest production deployment**
   (environment variables apply to new builds only).

## Launch checklist

1. **Merge to `main`.** Cloudflare deploys production from `main`, which today only has the first commit. Merge the
   feature branches through a reviewed pull request.
2. **Create the Pages project** with the settings above.
3. **Add the domain** and **set `SITE_URL`**, then redeploy.
4. **Check the live site** (replace the domain):
   ```bash
   curl -sI https://<your-domain>/javascript-event-loop | head -1            # 200
   ```
   ```bash
   curl -sI https://<your-domain>/javascript-event-loop.html | grep -i location # → /javascript-event-loop
   ```
   ```bash
   curl -sI https://<your-domain>/javascript-event-loop/ | head -3             # should redirect to no slash
   ```
   ```bash
   curl -sI https://<your-domain>/does-not-exist | head -1                   # must be 404, not 200
   ```
   ```bash
   curl -s https://<your-domain>/sitemap.xml | grep -c '<loc>'               # 7
   ```
   ```bash
   curl -sI https://<your-domain>/assets/ | grep -i cache-control            # pick any file under /assets/
   ```
   ```bash
   curl -sI https://<project>.pages.dev/ | grep -i x-robots-tag              # noindex
   ```
   The trailing-slash behaviour is the one rule Cloudflare's docs don't spell out. If `/page/` does not redirect,
   it still serves the same page with the right canonical URL, which is fine for search engines.
5. **Google Search Console** (search.google.com/search-console): add a **Domain** property, verify it with the DNS
   TXT record it shows (one click when DNS is on Cloudflare), then Sitemaps → submit
   `https://<your-domain>/sitemap.xml`. Use URL Inspection on one topic page and "Request indexing".
6. **Bing Webmaster Tools** (optional): import the site from Search Console and submit the same sitemap.
7. **Social previews:** paste a page URL into a link preview checker (or a chat app) and check the image and title.

## After launch

- **Core Web Vitals:** real-user data (LCP, INP, CLS) appears in Search Console → Core Web Vitals once there is
  enough traffic. Cloudflare Web Analytics can also report it, but it is a tracking script: add it only if you
  decide you want analytics. Lab numbers (`npm run perf`) are only for comparing builds.
- **New pages:** add them to `src/routes.ts` (see DOCUMENTATION.md). The sitemap, navigation and checks update
  automatically.
- **Rankings:** none of this guarantees search traffic. Indexing usually takes days to weeks; ranking depends on
  content quality and on other sites linking to LoopLens.

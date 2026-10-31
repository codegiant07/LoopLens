// Production site settings. This is the ONLY place that knows the site's address.
// The real address comes from the SITE_URL environment variable at build time (Cloudflare Pages: Workers & Pages →
// your project → Settings → Variables and Secrets → Production). Everything else (canonical, Open Graph, JSON-LD,
// sitemap, robots.txt, _headers) is built from the value returned here.

export const SITE_NAME = "LoopLens";
export const PLACEHOLDER_URL = "https://YOUR-DOMAIN.example";
export const REPO_URL = "https://github.com/codegiant07/LoopLens";

/** Social preview image in public/, shared by every page. */
export const OG_IMAGE = {
  path: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "LoopLens, an interactive JavaScript visualizer showing the call stack, task queue, microtask queue and event loop",
};

export interface Site {
  /** Origin without a trailing slash, e.g. https://looplens.dev */
  url: string;
  /** false while SITE_URL is still the placeholder: no canonical, og:url, og:image or JSON-LD is written. */
  real: boolean;
  /** Whether search engines may index this build. Off for placeholders, localhost and preview deployments. */
  indexable: boolean;
}

/**
 * Reads SITE_URL and the host's build variables and decides what this build may tell search engines.
 * - A production build with no real SITE_URL fails, so a placeholder can never go live.
 * - Preview builds are always noindex (Cloudflare Pages and Vercel also send X-Robots-Tag: noindex on previews).
 * - Local builds without SITE_URL use the placeholder and are noindex.
 */
export function resolveSite(env: Record<string, string | undefined>): Site {
  const raw =
    (env.SITE_URL ?? "").trim().replace(/\/+$/, "") || PLACEHOLDER_URL;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`SITE_URL is not a valid URL: "${raw}"`);
  }
  if (u.pathname !== "/" || u.search || u.hash)
    throw new Error(
      `SITE_URL must be an origin only (no path, query or hash): "${raw}"`,
    );
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname);
  if (u.protocol !== "https:" && !local)
    throw new Error(`SITE_URL must use https: "${raw}"`);
  const url = u.origin;
  const real = url !== new URL(PLACEHOLDER_URL).origin;
  const { production, preview } = deployment(env);
  if (production && !real)
    throw new Error(
      "SITE_URL is not set for this production build. Add it to the Production environment variables " +
        "(Cloudflare: Workers & Pages → your project → Settings → Variables and Secrets).",
    );
  return { url, real, indexable: real && !local && !preview };
}

/**
 * Which kind of hosted build this is.
 * - Cloudflare Pages sets CF_PAGES=1 and CF_PAGES_BRANCH; the production branch is PRODUCTION_BRANCH (default "main").
 * - Vercel sets VERCEL_ENV to "production", "preview" or "development".
 * A local build is neither production nor preview.
 */
export function deployment(env: Record<string, string | undefined>): {
  production: boolean;
  preview: boolean;
} {
  if (env.CF_PAGES === "1") {
    const isProd = env.CF_PAGES_BRANCH === (env.PRODUCTION_BRANCH || "main");
    return { production: isProd, preview: !isProd };
  }
  if (env.VERCEL_ENV !== undefined) {
    const isProd = env.VERCEL_ENV === "production";
    return { production: isProd, preview: !isProd };
  }
  return { production: false, preview: false };
}

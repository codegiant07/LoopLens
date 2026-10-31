// Regenerates the icons and the social preview image in public/ (run by hand: `node scripts/make-icons.mjs`).
// Not part of the build: the outputs are committed. Uses the installed Google Chrome to turn SVG/HTML into
// PNGs, so the project needs no image dependencies. Override the browser path with CHROME=/path/to/chrome.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pub = fileURLToPath(new URL("../public/", import.meta.url));
const chrome =
  process.env.CHROME ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const tmp = mkdtempSync(join(tmpdir(), "looplens-icons-"));

// The mark: a loop arrow (the event loop) around a dot (the step you are looking at), in the app's dark theme colors.
const mark = (
  tile,
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${tile ? 0 : 14}" fill="#1c1c1a"/>
  <path d="M40 18.1A16 16 0 1 0 48 32" fill="none" stroke="#B5D4F4" stroke-width="5.5" stroke-linecap="round"/>
  <path d="M48 21.5 54.6 33.5H41.4Z" fill="#B5D4F4"/>
  <circle cx="32" cy="32" r="6.5" fill="#FAC775"/>
</svg>
`;

function shoot(html, w, h, out) {
  const page = join(tmp, out + ".html");
  writeFileSync(page, html);
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "--default-background-color=00000000",
      `--window-size=${w},${h}`,
      `--screenshot=${join(tmp, out)}`,
      "file://" + page,
    ],
    { stdio: "ignore" },
  );
  return readFileSync(join(tmp, out));
}
const icon = (size, tile, out) =>
  shoot(
    `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${mark(tile)}`,
    size,
    size,
    out,
  );

writeFileSync(pub + "favicon.svg", mark(false));
writeFileSync(pub + "icon-192.png", icon(192, false, "i192.png"));
writeFileSync(pub + "icon-512.png", icon(512, false, "i512.png"));
writeFileSync(pub + "apple-touch-icon.png", icon(180, true, "i180.png")); // iOS rounds the corners itself

// favicon.ico: a 16 and a 32 px PNG inside the ICO container (supported by every current browser).
const pngs = [icon(16, false, "i16.png"), icon(32, false, "i32.png")],
  sizes = [16, 32];
const head = Buffer.alloc(6 + 16 * pngs.length);
head.writeUInt16LE(0, 0);
head.writeUInt16LE(1, 2);
head.writeUInt16LE(pngs.length, 4);
let at = head.length;
pngs.forEach((p, i) => {
  const e = 6 + 16 * i;
  head.writeUInt8(sizes[i], e);
  head.writeUInt8(sizes[i], e + 1);
  head.writeUInt16LE(1, e + 4);
  head.writeUInt16LE(32, e + 6);
  head.writeUInt32LE(p.length, e + 8);
  head.writeUInt32LE(at, e + 12);
  at += p.length;
});
writeFileSync(pub + "favicon.ico", Buffer.concat([head, ...pngs]));

// Social preview (1200x630): what LoopLens shows, drawn with the app's own colors. No claims, just the product.
const chip = (t, bg, fg) =>
  `<span style="display:inline-block;font:24px ui-monospace,Menlo,monospace;padding:6px 14px;margin:0 10px 10px 0;border-radius:6px;background:${bg};color:${fg}">${t}</span>`;
const box = (title, body) =>
  `<div><div style="font-size:20px;color:#a3a197;margin-bottom:8px">${title}</div><div style="background:#262624;border-radius:12px;padding:14px 16px 4px;min-height:58px">${body}</div></div>`;
const pill = (t, on) =>
  `<span style="padding:6px 18px;border-radius:999px;font-size:22px;${on ? "background:#0C447C;color:#B5D4F4;border:1.5px solid #B5D4F4" : "color:#a3a197;border:1.5px solid #3d3d3a"}">${t}</span>`;
writeFileSync(
  pub + "og-image.png",
  shoot(
    `<!doctype html><style>html,body{margin:0}body{width:1200px;height:630px;box-sizing:border-box;padding:64px 72px;background:#1c1c1a;color:#ece9df;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;display:grid;grid-template-columns:1fr 470px;gap:56px;align-items:center}</style>
<div>
  <div style="display:flex;align-items:center;gap:22px">${mark(false).replace("<svg ", '<svg width="96" height="96" ')}<div style="font-size:76px;font-weight:700;letter-spacing:-1.5px">LoopLens</div></div>
  <div style="font-size:40px;font-weight:600;margin:34px 0 18px;line-height:1.2">Interactive JavaScript visualizer</div>
  <div style="font-size:28px;color:#a3a197;line-height:1.4">Step through code and watch the call stack, the task and microtask queues and the event loop.</div>
  <div style="display:flex;align-items:center;gap:12px;margin-top:40px;color:#a3a197;font-size:22px">${pill("Script", false)}→${pill("Microtasks", true)}→${pill("Task", false)}<span style="font-size:28px">↺</span></div>
</div>
<div style="display:grid;gap:22px">
  ${box("Call stack", chip("greet", "#0C447C", "#B5D4F4") + chip("main script", "#0C447C", "#B5D4F4"))}
  ${box("Microtask queue", chip("1. then callback", "#27500A", "#C0DD97"))}
  ${box("Task queue", chip("1. timer callback", "#633806", "#FAC775"))}
</div>`,
    1200,
    630,
    "og.png",
  ),
);

console.log(
  "Wrote favicon.svg, favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png and og-image.png to public/",
);

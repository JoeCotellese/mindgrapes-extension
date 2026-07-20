// ABOUTME: Renders the grapes emoji into the transparent PNG icons Chrome shows for the extension.
// ABOUTME: Run with `npm run icons` after changing GLYPH; commit the regenerated icons/.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const GLYPH = "🍇";
// Chrome asks for these four: toolbar (16), retina toolbar (32), extension
// management page (48), and the Web Store listing / install dialog (128).
const SIZES = [16, 32, 48, 128];

const outDir = new URL("../icons/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

for (const size of SIZES) {
  // The glyph is inset slightly because Chrome draws the toolbar icon with no
  // padding of its own, and a bled-to-edge emoji reads as clipped at 16px.
  await page.setContent(
    `<body style="margin:0"><div style="width:${size}px;height:${size}px;
       display:flex;align-items:center;justify-content:center;
       font-size:${Math.round(size * 0.86)}px;line-height:1;
       font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;
     ">${GLYPH}</div></body>`,
  );
  await page.setViewportSize({ width: size, height: size });
  await page.screenshot({
    path: fileURLToPath(new URL(`icon${size}.png`, outDir)),
    omitBackground: true,
  });
  console.log(`icons/icon${size}.png`);
}

await browser.close();

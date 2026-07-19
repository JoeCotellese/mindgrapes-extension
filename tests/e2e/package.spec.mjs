// ABOUTME: Build check — packs the extension, unzips it, and loads that zip's
// ABOUTME: contents in Chromium to prove the archive is a working extension.
//
// Needs no server: it only asserts the packed bundle registers its MV3 service
// worker and renders the popup. Run: npx playwright test tests/e2e/package.spec.mjs

import { test, expect, chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

test("the packed zip loads as an extension in Chromium", async () => {
  const zipPath = execFileSync("scripts/package.sh", { cwd: ROOT })
    .toString()
    .trim();
  expect(existsSync(join(ROOT, zipPath))).toBeTruthy();

  const unpacked = mkdtempSync(join(tmpdir(), "mg-pkg-"));
  execFileSync("unzip", ["-q", join(ROOT, zipPath), "-d", unpacked]);

  // manifest.json must sit at the archive root or the Web Store rejects it.
  expect(readdirSync(unpacked)).toContain("manifest.json");

  const userDataDir = mkdtempSync(join(tmpdir(), "mg-pkg-profile-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: "chromium",
    args: [
      "--headless=new",
      `--disable-extensions-except=${unpacked}`,
      `--load-extension=${unpacked}`,
    ],
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;

    // A worker that failed to parse its imports would not answer this.
    expect(await worker.evaluate(() => chrome.runtime.getManifest().name)).toBe(
      "Mind Grapes",
    );

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator("#status")).toBeVisible();
  } finally {
    await context.close();
  }
});

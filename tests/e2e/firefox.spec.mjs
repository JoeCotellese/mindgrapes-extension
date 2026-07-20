// ABOUTME: Build check — packs the extension and installs that zip's contents
// ABOUTME: in Firefox to prove the same bundle is accepted outside Chromium.
//
// Playwright cannot load extensions in Firefox on its own, so this installs the
// unpacked bundle as a temporary add-on over Firefox's remote debugging
// protocol. Run: npx playwright test tests/e2e/firefox.spec.mjs
//
// Scope, measured rather than assumed. Removing background.scripts from the
// manifest makes installTemporaryAddon fail, so this does catch a bundle that
// regressed to Chrome-only. Replacing background.js with invalid JavaScript
// does NOT fail — Firefox installs the add-on either way, and Playwright cannot
// reach a Firefox background page or moz-extension:// URL to check further.
// Runtime behaviour in Firefox is therefore still unverified by automation.

import { test, expect, firefox } from "@playwright/test";
import { withExtension } from "playwright-webextext";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

test("the packed zip installs as a temporary add-on in Firefox", async () => {
  const zipPath = execFileSync("scripts/package.sh", { cwd: ROOT })
    .toString()
    .trim();
  const unpacked = mkdtempSync(join(tmpdir(), "mg-ff-"));
  execFileSync("unzip", ["-q", join(ROOT, zipPath), "-d", unpacked]);

  // Asserted directly as well as via the install below, because the install
  // error says only "could not install add-on" and names no missing key.
  const manifest = JSON.parse(
    readFileSync(join(unpacked, "manifest.json"), "utf8"),
  );
  expect(manifest.background.scripts).toContain("background.js");
  expect(manifest.browser_specific_settings?.gecko?.id).toBeTruthy();

  // launch() rather than launchPersistentContext(): the persistent path
  // pre-approves MV3 content-script permissions, and playwright-webextext
  // crashes there on any manifest without optional_permissions. This extension
  // declares no content scripts, so it needs nothing that path provides.
  //
  // The launch itself is the assertion — playwright-webextext installs the
  // add-on during launch and rejects if Firefox refuses the bundle.
  const browser = await withExtension(firefox, unpacked).launch({
    headless: true,
  });
  await browser.close();
});

// ABOUTME: E2E stop condition — loads the unpacked extension, seeds a dev token,
// ABOUTME: clicks Save on the SPEC article, and asserts a non-empty summary.
//
// PREREQUISITES for a GREEN run (this test asserts real behavior; it does not
// mock the server, so it fails loudly without them):
//
//   1. The openbrain dev stack is UP and reachable at MG_BASE_URL
//      (default http://localhost:8080), with OPENROUTER_API_KEY set there so
//      POST /capture can summarize (otherwise /capture returns 502).
//   2. MG_DEV_TOKEN is a valid, unexpired JWT:
//        docker compose -f docker-compose.dev.yml exec mcp \
//          python manage.py mint_access_token you@example.com
//   3. The environment can launch Chromium with --load-extension. MV3 service
//      workers load under the new headless mode; some CI/sandboxes cannot do
//      this, in which case the test cannot run here (see the skip below).
//
// Run:  MG_DEV_TOKEN=<jwt> npx playwright test

import { test, expect, chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = resolve(__dirname, "..", "..");

const BASE_URL = process.env.MG_BASE_URL || "http://localhost:8080";
const DEV_TOKEN = process.env.MG_DEV_TOKEN || "";
const ARTICLE_URL = "https://claude.com/blog/getting-started-with-loops";

test("bookmarks the SPEC article and shows a summary", async () => {
  test.skip(
    !DEV_TOKEN,
    "Set MG_DEV_TOKEN to a minted dev JWT (see file header) to run the e2e.",
  );

  const userDataDir = mkdtempSync(join(tmpdir(), "mg-e2e-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: "chromium",
    args: [
      "--headless=new",
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  try {
    // Wait for the extension's service worker so we can read its ID + seed storage.
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent("serviceworker");
    const extensionId = new URL(worker.url()).host;

    // Seed base URL + dev token into chrome.storage (the fast-loop auth path).
    await worker.evaluate(
      async ([baseUrl, devToken]) => {
        await chrome.storage.local.set({ baseUrl, devToken });
      },
      [BASE_URL, DEV_TOKEN],
    );

    // Open the article and make it the active/most-recent http(s) tab.
    const article = await context.newPage();
    await article.goto(ARTICLE_URL, { waitUntil: "domcontentloaded" });

    // Open the popup as its own page and click Save.
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    const saveButton = popup.getByRole("button", { name: /save this page/i });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Stop condition: the popup shows "Saved" and a non-empty summary.
    await expect(popup.locator("#status")).toHaveText(/Saved/i, {
      timeout: 45_000,
    });
    const summary = (await popup.locator("#summary").textContent())?.trim();
    expect(summary && summary.length > 0).toBeTruthy();

    // The "View in brain" deep link should point at the stored experience.
    await expect(popup.locator("#view")).toBeVisible();
    const href = await popup.locator("#view").getAttribute("href");
    expect(href).toMatch(/\/experience\/[0-9a-f-]{36}$/);
  } finally {
    await context.close();
  }
});

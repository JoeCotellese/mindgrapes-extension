// ABOUTME: Headed launcher for manual OAuth testing — loads the unpacked
// ABOUTME: extension with a persistent profile and stays open for Connect.
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = resolve(__dirname, "..");
const BASE_URL = process.env.MG_BASE_URL || "http://localhost:8080";
const ARTICLE_URL = "https://claude.com/blog/getting-started-with-loops";
const userDataDir =
  process.env.MG_PROFILE ||
  "/private/tmp/claude-501/-Users-joec-git-openbrain/9e4c6890-309c-4475-ac8b-d1c1440dea3e/scratchpad/mg-oauth-profile";

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  channel: "chromium",
  args: [
    `--disable-extensions-except=${EXTENSION_PATH}`,
    `--load-extension=${EXTENSION_PATH}`,
  ],
});

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent("serviceworker");
const extensionId = new URL(worker.url()).host;

// Seed only the base URL. Deliberately do NOT set a dev token, so the popup
// starts in the not-authed state and the Connect button drives the real
// OAuth 2.1 PKCE + DCR flow.
await worker.evaluate(async (baseUrl) => {
  await chrome.storage.local.set({ baseUrl });
  await chrome.storage.local.remove("devToken");
}, BASE_URL);

const article = await context.newPage();
await article
  .goto(ARTICLE_URL, { waitUntil: "domcontentloaded" })
  .catch(() => {});

const popup = await context.newPage();
await popup.goto(`chrome-extension://${extensionId}/popup.html`);

console.log("EXTENSION_ID=" + extensionId);
console.log("POPUP_URL=chrome-extension://" + extensionId + "/popup.html");
console.log(
  "OAUTH_REDIRECT_URI=https://" + extensionId + ".chromiumapp.org/",
);
console.log("BASE_URL=" + BASE_URL);
console.log(
  "Browser is open. In the popup, click Connect to start OAuth. " +
    "Leave this process running; stop it to close the browser.",
);

await new Promise(() => {}); // keep the browser alive until the process is killed

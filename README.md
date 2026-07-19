# Mind Grapes browser extension

Chrome MV3 extension that bookmarks the current page into
[Mind Grapes](https://github.com/JoeCotellese/mindgrapes-server). Click the
toolbar action, click **Save**, and the extension extracts the readable page
text, sends `{url, title, text}` to the server's `POST /capture` endpoint, and
shows the returned summary with a link to view the stored experience.

See `SPEC.md` for the full scope, UX, and stop condition.

## Files

```
manifest.json     MV3 manifest (action popup, identity/activeTab/scripting/storage)
background.js     service worker: content extraction, POST /capture, OAuth 2.1 PKCE + DCR
popup.html        3-state popup UI (not-authed / saving / saved)
popup.js          popup controller (talks to the worker via chrome.runtime messages)
options.html      dev-token + base-URL settings
options.js        options controller
readability.js    vendored Mozilla Readability (standalone, no build step)
tests/e2e/        Playwright end-to-end test (the SPEC stop condition)
```

## Load unpacked (Chrome / Chromium)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this repo directory.
4. Pin the **Mind Grapes** action to the toolbar.

## Configure

Open the extension's **Options** page (right-click the action → Options, or from
`chrome://extensions` → Details → Extension options). Two settings:

- **Base URL** — the Mind Grapes server. Defaults to `http://localhost:8080`
  (the dev docker stack). If you point this at a non-localhost host, add that
  host to `host_permissions` in `manifest.json` (an `https://*/*` entry is
  already present to cover remote brains).
- **Dev bearer token** — paste a JWT here to skip the interactive OAuth flow.
  This is the fast build-loop path used by the e2e test.

### Mint a dev token

From the `openbrain` (mindgrapes-server) repo, with the dev stack up:

```bash
docker compose -f docker-compose.dev.yml exec mcp \
  python manage.py mint_access_token you@example.com
```

Paste the printed JWT into the Options page's **Dev bearer token** field.

## Auth: dev token vs. real OAuth

The worker picks a bearer token in this order:

1. **OAuth access token** cached in `chrome.storage` (from the **Connect** flow).
2. **Dev bearer token** from the Options page.

The **Connect** button runs the real OAuth 2.1 PKCE public-client flow:
discovery → Dynamic Client Registration (redirect URI =
`chrome.identity.getRedirectURL()`, an `https://<id>.chromiumapp.org/` URL) →
`chrome.identity.launchWebAuthFlow` with an S256 code challenge → token
exchange. The token is cached and refreshed (or re-authed) on a 401.

For the fast build loop, set a dev token and skip Connect entirely.

## Run the checks

Two runnable checks ship with the extension:

### 1. PKCE unit check (no browser, no server)

Verifies the S256 code-challenge derivation and base64url encoding against the
RFC 7636 test vector:

```bash
node tests/pkce.test.mjs
```

### 2. End-to-end (the SPEC stop condition)

Loads the unpacked extension into Chromium via Playwright's persistent context,
seeds a dev bearer token, opens the popup on
`https://claude.com/blog/getting-started-with-loops`, clicks **Save**, and
asserts the popup shows a non-empty summary.

```bash
npm install          # first time: installs @playwright/test
npx playwright install chromium
MG_DEV_TOKEN="<paste a minted JWT>" \
MG_BASE_URL="http://localhost:8080" \
npx playwright test
```

**Prerequisites for a green run** (documented here and in the test file):

- The `openbrain` dev stack must be **up** (`make dev-up` in that repo) so
  `POST /capture` answers, and `OPENROUTER_API_KEY` must be set there so the
  summarizer works (otherwise `/capture` returns 502 and the test fails loudly,
  by design — no silent drop).
- `MG_DEV_TOKEN` must be a **valid, unexpired** JWT minted as above.
- Headless Chromium loads MV3 extensions only with the `--headless=new`
  channel, which the test configures. If your environment can't launch a
  headed/`headless=new` Chromium with `--load-extension`, the test cannot run;
  see the top-of-file notes in `tests/e2e/capture.spec.mjs`.

## Done vs. deferred

**Done / working:**

- MV3 manifest, popup 3-state UI, options page.
- Readability extraction via `chrome.scripting`, with a `document.title` +
  `innerText` fallback.
- `POST /capture` with bearer auth; 401 / 502 / network errors surfaced in the
  popup (never silently dropped).
- Dev-token mode.
- Full OAuth 2.1 PKCE + DCR flow implemented in `background.js`.
- PKCE unit check passing (`node tests/pkce.test.mjs`).

**Deferred / needs a live environment to verify green:**

- The e2e stop-condition assertion needs the dev stack up + a minted dev JWT +
  an environment that can drive Chromium-with-extension. The test is written
  and self-documents its prerequisites.
- The interactive OAuth **Connect** flow is implemented but exercised manually
  (it needs a passkey session at the consent screen); it is not part of the
  per-iteration e2e loop, per SPEC.

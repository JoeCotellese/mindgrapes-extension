# Framework evaluation log

Running record of feature requests and whether they push the extension toward
needing a build framework (WXT). See `CLAUDE.md` for the evaluation step and the
switch triggers. Newest entries at the top.

Trigger legend: `ui-framework`, `content-scripts`, `typescript`,
`dual-store`, `build-step`.

---

## 2026-08-22 — Scripted Firefox unlisted signing + data-collection manifest key

- Request: install the Firefox build permanently for personal use without
  re-loading local source each restart. Solution: `web-ext sign --channel=unlisted`
  as an `npm run sign:firefox` script, plus the newly required
  `browser_specific_settings.gecko.data_collection_permissions` manifest key.
- Triggers touched: `dual-store` (one). AMO signing enters the workflow, but as
  a single scripted command reusing the existing hand-built manifest — no second
  packaging pipeline, no Chrome-side change. `web-ext` is a dev-only CLI; it does
  not bundle or transpile shipping code, so `build-step` did **not** fire.
- Call: **stay vanilla.** One minor trigger active. Reassess if AMO submission
  grows into a recurring multi-step chore or a second trigger lands.

---

## 2026-08-13 — Baseline evaluation (no feature request)

- Triggers active: none.
- Authored surface: ~430 lines across `background.js` (293), `popup.js` (91),
  `options.js` (28), `pkce.js` (22). `readability.js` is 2,800 lines of vendored
  Mozilla Readability, untouched by any framework.
- Cross-browser already solved by hand in `manifest.json` (dual
  `service_worker`/`scripts` + gecko block), with a Firefox e2e test.
- Call: **stay vanilla.** Nothing yet justifies WXT/Plasmo overhead. Reassess
  per the trigger rules as features land.

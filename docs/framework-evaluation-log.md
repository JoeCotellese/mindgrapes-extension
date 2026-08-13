# Framework evaluation log

Running record of feature requests and whether they push the extension toward
needing a build framework (WXT). See `CLAUDE.md` for the evaluation step and the
switch triggers. Newest entries at the top.

Trigger legend: `ui-framework`, `content-scripts`, `typescript`,
`dual-store`, `build-step`.

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

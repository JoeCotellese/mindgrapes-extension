# Mind Grapes extension — project instructions

## Architecture baseline

This is a **zero-build, vanilla-JS MV3 extension**. No framework (WXT, Plasmo),
no bundler (Vite, webpack, esbuild). Source files are loaded directly by
`manifest.json` as native ES modules (`"type": "module"`). Cross-browser
(Chrome + Firefox) is handled by hand in the manifest, not by tooling.

"Load unpacked → it runs, no compile step" is a deliberate feature. Preserve it
unless a framework switch is explicitly decided (see below).

## Feature-request evaluation step (REQUIRED)

When a new feature request comes in, before implementing, run a **framework-fit
check** and record the result. The point is to notice, incrementally, when the
project has outgrown zero-build vanilla JS instead of discovering it too late.

1. Ask: does this request push on any of the switch triggers?
   - Adds or needs a **UI framework** (React/Svelte/Vue) for popup or options.
   - **Content scripts multiply**: injected UI, multiple match patterns, or
     shared modules across scripts.
   - Wants **TypeScript** across the codebase (note: `tslib` is currently a
     vestigial dep with no TS wired up).
   - **Dual-store packaging** (Chrome Web Store + AMO) becomes a recurring chore.
   - A build/transpile step becomes unavoidable for any other reason.

2. Append one dated entry to `docs/framework-evaluation-log.md` recording the
   request, which trigger(s) it touched (if any), and the running call.

3. Apply the decision rule:
   - **Stay vanilla** while zero or one trigger is active and each is minor.
   - **Recommend switching to WXT** (not Plasmo — lighter, Vite-based, its
     cross-browser model matches what we already built by hand) when the
     **UI-framework trigger fires**, OR when **two or more triggers are active**
     at once. Surface the recommendation to Joe; do not switch unilaterally.

A request that touches no trigger still gets a one-line log entry ("no trigger")
so the log doubles as a history of what we've built.

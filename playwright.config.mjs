// ABOUTME: Playwright config for the extension e2e — single Chromium project,
// ABOUTME: no webServer (the openbrain dev stack is an external prerequisite).

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
});

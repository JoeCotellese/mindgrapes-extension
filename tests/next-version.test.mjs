// ABOUTME: Checks the calendar version bump restarts each month and increments within one.
// ABOUTME: Run with `npm run test:version`.
import assert from "node:assert/strict";
import { nextVersion } from "../scripts/next-version.mjs";

const july = new Date(2026, 6, 20);

assert.equal(nextVersion("2026.7.1", july), "2026.7.2", "same month increments");
assert.equal(nextVersion("2026.6.9", july), "2026.7.1", "new month restarts");
assert.equal(nextVersion("2025.7.4", july), "2026.7.1", "new year restarts");
assert.equal(nextVersion("0.1.0", july), "2026.7.1", "pre-calver version restarts");

console.log("next-version: ok");

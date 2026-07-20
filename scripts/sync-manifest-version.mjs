// ABOUTME: Copies package.json's version into manifest.json, keeping the two in sync.
// ABOUTME: Run by the npm `version` lifecycle hook so `npm version` bumps both at once.
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("..", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, root), "utf8"));

const { version } = read("package.json");

// Chrome accepts 1-4 dot-separated integers only, so a semver prerelease like
// 0.1.1-0 (what `npm version prepatch` produces) yields a manifest the Web
// Store rejects — long after the tag is pushed.
if (!/^\d+(\.\d+){0,3}$/.test(version)) {
  console.error(`sync-manifest-version: Chrome rejects version "${version}"`);
  process.exit(1);
}

const manifest = read("manifest.json");
manifest.version = version;
writeFileSync(
  new URL("manifest.json", root),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(`manifest.json version -> ${version}`);

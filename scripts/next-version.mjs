// ABOUTME: Computes the next calendar version, YYYY.M.N, for `npm run release` to consume.
// ABOUTME: N restarts at 1 each new month and increments within the current month.
import { readFileSync } from "node:fs";

// Unpadded parts: npm normalizes "2026.07.01" to "2026.7.1" anyway, and Chrome
// rejects leading zeros in manifest version parts, so there is no padded form
// either tool would keep.
export function nextVersion(current, now) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [prevYear, prevMonth, prevBuild] = current.split(".").map(Number);
  const sameMonth = prevYear === year && prevMonth === month;
  return `${year}.${month}.${sameMonth ? prevBuild + 1 : 1}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { version } = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  console.log(nextVersion(version, new Date()));
}

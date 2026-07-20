// ABOUTME: Options controller — persists baseUrl + devToken to chrome.storage.
// ABOUTME: Read back by the service worker when choosing a bearer token.

// Firefox exposes promise-based APIs on `browser` and callback-based ones
// on `chrome`; Chrome MV3 has only `chrome`, which is promise-based. Every
// call below is awaited, so the promise-bearing namespace has to win.
const api = globalThis.browser ?? globalThis.chrome;

const baseUrl = document.getElementById("baseUrl");
const devToken = document.getElementById("devToken");
const saved = document.getElementById("saved");

async function load() {
  const s = await api.storage.local.get(["baseUrl", "devToken"]);
  baseUrl.value = s.baseUrl || "http://localhost:8080";
  devToken.value = s.devToken || "";
}

document.getElementById("save").addEventListener("click", async () => {
  await api.storage.local.set({
    baseUrl: baseUrl.value.trim() || "http://localhost:8080",
    devToken: devToken.value.trim(),
  });
  saved.textContent = "Saved ✓";
  setTimeout(() => (saved.textContent = ""), 1500);
});

load();

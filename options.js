// ABOUTME: Options controller — persists baseUrl + devToken to chrome.storage.
// ABOUTME: Read back by the service worker when choosing a bearer token.

const baseUrl = document.getElementById("baseUrl");
const devToken = document.getElementById("devToken");
const saved = document.getElementById("saved");

async function load() {
  const s = await chrome.storage.local.get(["baseUrl", "devToken"]);
  baseUrl.value = s.baseUrl || "http://localhost:8080";
  devToken.value = s.devToken || "";
}

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    baseUrl: baseUrl.value.trim() || "http://localhost:8080",
    devToken: devToken.value.trim(),
  });
  saved.textContent = "Saved ✓";
  setTimeout(() => (saved.textContent = ""), 1500);
});

load();

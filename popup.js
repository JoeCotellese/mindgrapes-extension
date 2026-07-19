// ABOUTME: Popup controller — drives the 3 states and relays Save/Connect
// ABOUTME: intents to the service worker, surfacing every failure visibly.

const $ = (id) => document.getElementById(id);
const els = {
  status: $("status"),
  summary: $("summary"),
  error: $("error"),
  connect: $("connect"),
  save: $("save"),
  view: $("view"),
  hint: $("hint"),
  optionsLink: $("options-link"),
};

function send(message) {
  return chrome.runtime.sendMessage(message);
}

function reset() {
  els.error.textContent = "";
  els.summary.textContent = "";
  els.status.textContent = "";
  els.view.hidden = true;
  els.hint.hidden = true;
}

// State: not-authed -> show Connect + hint. authed -> show Save.
async function render() {
  reset();
  const state = await send({ type: "getAuthState" });
  if (state && state.authed) {
    els.connect.hidden = true;
    els.save.hidden = false;
    els.status.textContent =
      state.mode === "dev" ? "Ready (dev token)." : "Ready.";
  } else {
    els.save.hidden = true;
    els.connect.hidden = false;
    els.hint.hidden = false;
    els.status.textContent = "Not connected.";
  }
}

els.connect.addEventListener("click", async () => {
  reset();
  els.connect.disabled = true;
  els.status.textContent = "Connecting…";
  const res = await send({ type: "connect" });
  els.connect.disabled = false;
  if (res && res.ok) {
    await render();
  } else {
    els.error.textContent = (res && res.error) || "Connect failed.";
  }
});

els.save.addEventListener("click", async () => {
  reset();
  els.save.disabled = true;
  els.status.textContent = "Saving… (summarizing page)";
  const res = await send({ type: "save" });
  els.save.disabled = false;
  if (res && res.ok) {
    els.status.textContent = "Saved ✓";
    els.summary.textContent = res.summary || "(no summary returned)";
    if (res.viewUrl) {
      els.view.href = res.viewUrl;
      els.view.hidden = false;
    }
  } else {
    els.status.textContent = "";
    els.error.textContent = (res && res.error) || "Save failed.";
  }
});

els.optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

render();

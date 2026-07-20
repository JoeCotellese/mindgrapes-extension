// ABOUTME: Popup controller — drives the 3 states and relays Save/Connect
// ABOUTME: intents to the service worker, surfacing every failure visibly.

// Firefox exposes promise-based APIs on `browser` and callback-based ones
// on `chrome`; Chrome MV3 has only `chrome`, which is promise-based. Every
// call below is awaited, so the promise-bearing namespace has to win.
const api = globalThis.browser ?? globalThis.chrome;

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
  return api.runtime.sendMessage(message);
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
  if (res && res.ok) {
    // Retire the button rather than re-enabling it: a still-live Save reads as
    // "that didn't take" and a second press stores a duplicate. Reopening the
    // popup runs render() again, so the ready state is one click away.
    els.save.hidden = true;
    els.status.textContent = "Saved ✓";
    els.summary.textContent = res.summary || "(no summary returned)";
    if (res.viewUrl) {
      els.view.href = res.viewUrl;
      els.view.hidden = false;
    }
  } else {
    els.save.disabled = false;
    els.status.textContent = "";
    els.error.textContent = (res && res.error) || "Save failed.";
  }
});

els.optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  api.runtime.openOptionsPage();
});

render();

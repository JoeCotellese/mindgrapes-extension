// ABOUTME: MV3 service worker for Mind Grapes — extracts page text, POSTs to
// ABOUTME: /capture with a bearer token, and runs the OAuth 2.1 PKCE + DCR flow.

import { randomVerifier, s256Challenge } from "./pkce.js";

const DEFAULT_BASE_URL = "http://localhost:8080";
const REQUESTED_SCOPE = "brain:read brain:write";

// ---------------------------------------------------------------------------
// Config + token storage (chrome.storage.local)
// ---------------------------------------------------------------------------

async function getConfig() {
  const s = await chrome.storage.local.get([
    "baseUrl",
    "devToken",
    "oauth", // { accessToken, refreshToken, clientId, expiresAt }
  ]);
  return {
    baseUrl: (s.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    devToken: s.devToken || "",
    oauth: s.oauth || null,
  };
}

// Choose the bearer token: a live OAuth access token wins, else the dev token.
// Returns { token, mode } or null when neither is set.
async function currentToken() {
  const cfg = await getConfig();
  if (cfg.oauth && cfg.oauth.accessToken) {
    return { token: cfg.oauth.accessToken, mode: "oauth" };
  }
  if (cfg.devToken) {
    return { token: cfg.devToken, mode: "dev" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// OAuth 2.1 PKCE public-client flow: discovery -> DCR -> authorize -> token
// ---------------------------------------------------------------------------

async function discover(baseUrl) {
  const res = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
  if (!res.ok) throw new Error(`discovery failed (${res.status})`);
  return res.json();
}

async function registerClient(meta, redirectUri) {
  const res = await fetch(meta.registration_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_name: "Mind Grapes browser extension",
      redirect_uris: [redirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
  });
  if (!res.ok) throw new Error(`client registration failed (${res.status})`);
  return (await res.json()).client_id;
}

async function exchangeToken(meta, params) {
  const res = await fetch(meta.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `token exchange failed (${res.status}): ${data.error || "unknown"}`,
    );
  }
  return data;
}

async function storeTokens(clientId, data) {
  const oauth = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    clientId,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
  };
  await chrome.storage.local.set({ oauth });
  return oauth;
}

// Interactive Connect: runs the full PKCE authorization-code flow.
async function connect() {
  const cfg = await getConfig();
  const redirectUri = chrome.identity.getRedirectURL();
  const meta = await discover(cfg.baseUrl);
  const clientId = await registerClient(meta, redirectUri);

  const verifier = randomVerifier();
  const challenge = await s256Challenge(verifier);
  const state = randomVerifier();

  const authUrl = new URL(meta.authorization_endpoint);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", REQUESTED_SCOPE);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const redirectResponse = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });
  const returned = new URL(redirectResponse);
  const err = returned.searchParams.get("error");
  if (err) throw new Error(`authorization denied: ${err}`);
  if (returned.searchParams.get("state") !== state) {
    throw new Error("state mismatch — aborting");
  }
  const code = returned.searchParams.get("code");
  if (!code) throw new Error("no authorization code returned");

  const data = await exchangeToken(meta, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });
  await storeTokens(clientId, data);
}

// Refresh the OAuth access token; returns the new access token or null.
async function refreshAccessToken() {
  const cfg = await getConfig();
  if (!cfg.oauth || !cfg.oauth.refreshToken || !cfg.oauth.clientId) return null;
  try {
    const meta = await discover(cfg.baseUrl);
    const data = await exchangeToken(meta, {
      grant_type: "refresh_token",
      refresh_token: cfg.oauth.refreshToken,
      client_id: cfg.oauth.clientId,
    });
    const oauth = await storeTokens(cfg.oauth.clientId, data);
    return oauth.accessToken;
  } catch (_e) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Content extraction (Readability, injected into the active tab)
// ---------------------------------------------------------------------------

async function extractContent(tabId) {
  // Inject the vendored Readability first so its `Readability` global exists.
  await chrome.scripting.executeScript({ target: { tabId }, files: ["readability.js"] });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      try {
        const article = new Readability(document.cloneNode(true)).parse();
        if (article && article.textContent && article.textContent.trim()) {
          return {
            title: article.title || document.title || "",
            text: article.textContent.trim(),
          };
        }
      } catch (_e) {
        // fall through to the DOM fallback below
      }
      return {
        title: document.title || "",
        text: document.body ? document.body.innerText : "",
      };
    },
  });
  return result;
}

// ---------------------------------------------------------------------------
// Capture: POST the page to /capture, retrying once after an OAuth refresh.
// ---------------------------------------------------------------------------

async function postCapture(baseUrl, token, body) {
  return fetch(`${baseUrl}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

async function save() {
  const cfg = await getConfig();
  const auth = await currentToken();
  if (!auth) {
    return { ok: false, error: "Not connected. Set a dev token or click Connect." };
  }

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // In the real toolbar popup the active tab is the page being viewed. When the
  // popup is opened as its own page (e.g. the e2e harness) or the active tab is
  // a chrome:// surface, fall back to the most recently accessed http(s) tab.
  if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
    const tabs = await chrome.tabs.query({});
    tab = tabs
      .filter((t) => t.url && /^https?:/.test(t.url))
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0))[0];
  }
  if (!tab || !tab.id) {
    return { ok: false, error: "No capturable page in the active tab." };
  }

  let extracted;
  try {
    extracted = await extractContent(tab.id);
  } catch (e) {
    return { ok: false, error: `Could not read the page: ${e.message}` };
  }

  const body = {
    url: tab.url,
    title: extracted.title || tab.title || "",
    text: extracted.text || "",
  };

  let res;
  try {
    res = await postCapture(cfg.baseUrl, auth.token, body);
    // On 401 with an OAuth token, try one silent refresh, then retry once.
    if (res.status === 401 && auth.mode === "oauth") {
      const fresh = await refreshAccessToken();
      if (fresh) res = await postCapture(cfg.baseUrl, fresh, body);
    }
  } catch (e) {
    return { ok: false, error: `Network error reaching ${cfg.baseUrl}: ${e.message}` };
  }

  if (res.status === 401) {
    // Force a re-auth by clearing the stale OAuth token.
    if (auth.mode === "oauth") await chrome.storage.local.remove("oauth");
    return { ok: false, error: "Unauthorized (401). Reconnect and try again." };
  }
  if (res.status === 502) {
    return { ok: false, error: "Summary service unavailable (502). Try again shortly." };
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: `Capture failed (${res.status}): ${data.error || "error"}` };
  }

  const data = await res.json();
  return {
    ok: true,
    summary: data.summary || "",
    experienceId: data.experience_id,
    viewUrl: `${cfg.baseUrl}/experience/${data.experience_id}`,
  };
}

// ---------------------------------------------------------------------------
// Message router (popup <-> worker)
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg.type === "getAuthState") {
        const auth = await currentToken();
        sendResponse({ authed: !!auth, mode: auth ? auth.mode : null });
      } else if (msg.type === "connect") {
        await connect();
        sendResponse({ ok: true });
      } else if (msg.type === "save") {
        sendResponse(await save());
      } else {
        sendResponse({ ok: false, error: `unknown message: ${msg.type}` });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true; // keep the message channel open for the async response
});

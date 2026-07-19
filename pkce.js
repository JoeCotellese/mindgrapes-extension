// ABOUTME: PKCE (RFC 7636) helpers — base64url, code verifier, S256 challenge.
// ABOUTME: Shared by the service worker and the node PKCE check; no chrome deps.

export function base64urlFromBytes(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomVerifier() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64urlFromBytes(bytes);
}

export async function s256Challenge(verifier) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64urlFromBytes(new Uint8Array(digest));
}

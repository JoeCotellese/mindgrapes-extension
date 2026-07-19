// ABOUTME: Runnable check for the PKCE helpers against the RFC 7636 vector.
// ABOUTME: Run with `node tests/pkce.test.mjs`; exits non-zero on failure.

import assert from "node:assert/strict";
import { base64urlFromBytes, s256Challenge } from "../pkce.js";

// RFC 7636 Appendix B: the canonical code_verifier -> code_challenge vector.
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const EXPECTED_CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

const challenge = await s256Challenge(VERIFIER);
assert.equal(challenge, EXPECTED_CHALLENGE, "S256 challenge must match RFC 7636");

// base64url must be URL-safe and unpadded.
const enc = base64urlFromBytes(new Uint8Array([251, 255, 191]));
assert.ok(!/[+/=]/.test(enc), "base64url output must not contain + / =");

console.log("PKCE check passed:", challenge);

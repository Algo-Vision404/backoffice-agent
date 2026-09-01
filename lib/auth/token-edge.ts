/**
 * Edge-compatible HMAC verification for Next.js middleware.
 */

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-session-secret-change-me";
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function verifySignedPayloadEdge(token: string): Promise<string | null> {
  const idx = token.lastIndexOf(".");
  if (idx === -1) return null;

  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const secret = getSessionSecret();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const expected = base64UrlEncode(new Uint8Array(signature));

  if (expected.length !== sig.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return mismatch === 0 ? payload : null;
}

import { createHmac, timingSafeEqual } from "crypto";

// HMAC-SHA256 cut to 128 bits of hex, same as the plugin
export function sign(token: string, payload: string): string {
  return createHmac("sha256", token).update(payload).digest("hex").slice(0, 32);
}

export function verify(
  token: string,
  payload: string,
  signature: string,
): boolean {
  const expected = Buffer.from(sign(token, payload));
  const actual = Buffer.from(signature.toLowerCase());
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

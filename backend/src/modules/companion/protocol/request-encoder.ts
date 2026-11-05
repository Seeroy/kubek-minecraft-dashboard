import { randomBytes } from "crypto";
import { sign } from "./signature";

export const REQUEST_PREFIX = "kubekc ";

// Echo of a request line, a PTY without JLine prints it back
export const REQUEST_ECHO = /^kubekc [0-9a-f]{32} [A-Za-z0-9_-]+$/;

export interface EncodedRequest {
  id: string;
  line: string;
}

/** Console line the plugin picks up and swallows */
export function encodeRequest(
  token: string,
  type: string,
  fields: Record<string, unknown> = {},
): EncodedRequest {
  const id = randomBytes(6).toString("hex");
  const body = { ...fields, id, ts: Date.now(), t: type };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return { id, line: `${REQUEST_PREFIX}${sign(token, encoded)} ${encoded}` };
}

export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

import { createHash } from "crypto";

/** 32 hex digits to the dashed form, dashed input passes through */
export function formatUuid(raw: string): string {
  const hex = raw.replace(/-/g, "").toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** UUID an offline mode server assigns, UUID.nameUUIDFromBytes("OfflinePlayer:" + name) */
export function offlineUuid(name: string): string {
  const bytes = createHash("md5")
    .update(`OfflinePlayer:${name}`, "utf8")
    .digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x30;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes.toString("hex"));
}

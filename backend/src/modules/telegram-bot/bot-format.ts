import type { IServer } from "@shared/types/server/server.types";
import { t, type TelegramLang } from "./i18n";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const KNOWN_STATUSES = ["running", "stopped", "starting", "stopping", "error"];

/** Human-readable label for blueprint */
function blueprintLabel(server: IServer): string {
  const suffix = server.blueprintId.split(".").pop() ?? server.blueprintId;
  return suffix.charAt(0).toUpperCase() + suffix.slice(1);
}

/** Chosen game version, taken from the blueprint's GAME_VERSION variable */
function gameVersion(server: IServer): string | undefined {
  const value = server.variables?.GAME_VERSION;
  return value != null ? String(value) : undefined;
}

/** Localized label for a raw server status */
export function statusLabel(lang: TelegramLang, status: string): string {
  const key = KNOWN_STATUSES.includes((status || "").toLowerCase())
    ? status.toLowerCase()
    : "unknown";
  return t(lang, `statusValues.${key}`);
}

/** A single page of the servers list (HTML) */
export function renderServersList(
  lang: TelegramLang,
  pageServers: IServer[],
  page: number,
  totalPages: number,
): string {
  let message = `${t(lang, "servers.title", { page: page + 1, total: totalPages })}\n\n`;
  for (const server of pageServers) {
    message += `<b>${escapeHtml(server.name)}</b>\n`;
    message += `${statusLabel(lang, server.status)}`;
    const version = gameVersion(server);
    if (version) message += ` · ${escapeHtml(version)}`;
    message += `\n📊 <code>/status ${server.id}</code>\n\n`;
  }
  return message;
}

/** Detailed status card for a single server (HTML) */
export function renderServerStatus(
  lang: TelegramLang,
  server: IServer,
): string {
  const l = (k: string) => t(lang, `status.labels.${k}`);
  let message = `<b>${escapeHtml(server.name)}</b>\n\n`;
  message += `${l("status")}: ${statusLabel(lang, server.status)}\n`;
  message += `${l("type")}: ${escapeHtml(blueprintLabel(server))}\n`;
  const version = gameVersion(server);
  if (version) message += `${l("version")}: ${escapeHtml(version)}\n`;
  return message;
}

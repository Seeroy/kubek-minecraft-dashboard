import type { IServer } from "@shared/types/server/server.types";
import type { RichView } from "./bot-reply";
import { t, type TelegramLang } from "./i18n";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const KNOWN_STATUSES = [
  "running",
  "stopped",
  "starting",
  "stopping",
  "crashed",
  "error",
];

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

/** Date in the reader's timezone, UTC text for old clients */
function tgTime(at: number): string {
  const unix = Math.floor(at / 1000);
  const fallback = new Date(at).toISOString().slice(0, 16).replace("T", " ");
  return `<tg-time unix="${unix}" format="wDT">${fallback} UTC</tg-time>`;
}

/** Two-column key/value table */
function richTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(([key, value]) => `<tr><td><b>${key}</b></td><td>${value}</td></tr>`)
    .join("");
  return `<table bordered striped>${body}</table>`;
}

/** One page of the servers list, a row per server with an open button */
export function renderServersList(
  lang: TelegramLang,
  pageServers: IServer[],
  page: number,
  totalPages: number,
): RichView {
  const title = t(lang, "servers.title", { page: page + 1, total: totalPages });
  const col = (k: string) => t(lang, `servers.columns.${k}`);
  const open = escapeHtml(t(lang, "buttons.open"));

  const rows = pageServers
    .map((server) => {
      const button = `<tg-button type="callback_data" style="primary" data="srv:status:${server.id}">${open}</tg-button>`;
      return (
        `<tr><td><b>${escapeHtml(server.name)}</b></td>` +
        `<td>${statusLabel(lang, server.status)}</td>` +
        `<td>${escapeHtml(gameVersion(server) ?? "-")}</td>` +
        `<td>${button}</td></tr>`
      );
    })
    .join("");
  const html =
    `<h3>${title}</h3>` +
    `<table bordered striped><tr><th>${col("name")}</th><th>${col("status")}</th><th>${col("version")}</th><th></th></tr>${rows}</table>`;

  let fallback = `${title}\n\n`;
  for (const server of pageServers) {
    fallback += `<b>${escapeHtml(server.name)}</b>\n`;
    fallback += statusLabel(lang, server.status);
    const version = gameVersion(server);
    if (version) fallback += ` · ${escapeHtml(version)}`;
    fallback += "\n\n";
  }
  return { html, fallback };
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

export interface TaskCardInfo {
  status: "success" | "failed" | "cancelled";
  type: string;
  duration: string;
  finishedAt: number;
  serverName?: string;
  pluginName?: string;
  errorMessage?: string;
}

/** Task result card */
export function renderTaskNotification(
  lang: TelegramLang,
  info: TaskCardInfo,
): RichView {
  const emoji =
    info.status === "success" ? "✅" : info.status === "failed" ? "❌" : "⏹️";
  const statusKey =
    info.status === "success"
      ? "done"
      : info.status === "failed"
        ? "failed"
        : "cancelled";
  const title = t(lang, "taskNotify.title", {
    emoji,
    type: escapeHtml(info.type),
    status: t(lang, `taskNotify.${statusKey}`),
  });
  const l = (k: string) => t(lang, `taskNotify.labels.${k}`);

  const rows: Array<[string, string]> = [];
  if (info.serverName) rows.push([l("server"), escapeHtml(info.serverName)]);
  if (info.pluginName) rows.push([l("plugin"), escapeHtml(info.pluginName)]);
  rows.push([l("duration"), info.duration]);
  rows.push([l("finishedAt"), tgTime(info.finishedAt)]);

  const error = info.errorMessage ? escapeHtml(info.errorMessage) : null;
  const html =
    `<h4>${title}</h4>${richTable(rows)}` +
    (error ? `<blockquote expandable>${error}</blockquote>` : "");

  const lines = [title, ...rows.slice(0, -1).map(([k, v]) => `${k}: ${v}`)];
  if (error) lines.push(`<blockquote expandable>${error}</blockquote>`);
  return { html, fallback: lines.join("\n") };
}

/** Login approval request card */
export function renderTwofaRequest(
  lang: TelegramLang,
  meta: { username: string; ip: string | null; userAgent: string | null },
  requestedAt: number,
): RichView {
  const username = escapeHtml(meta.username);
  const ip = escapeHtml(meta.ip ?? "?");
  const ua = escapeHtml((meta.userAgent ?? "?").slice(0, 120));
  const l = (k: string) => t(lang, `twofa.labels.${k}`);

  const html =
    `<h4>${t(lang, "twofa.title")}</h4>` +
    richTable([
      [l("account"), username],
      [l("ip"), `<code>${ip}</code>`],
      [l("browser"), ua],
      [l("time"), tgTime(requestedAt)],
    ]) +
    `<p>${t(lang, "twofa.hint")}</p>`;
  return {
    html,
    fallback: t(lang, "twofa.request", { username, ip, ua }),
  };
}

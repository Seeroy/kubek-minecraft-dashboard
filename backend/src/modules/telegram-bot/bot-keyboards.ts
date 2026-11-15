import { ServerStatus } from "@shared/types/server/server.types";
import { InlineKeyboard } from "grammy";
import type { ForceReply } from "grammy/types";
import { t, type TelegramLang } from "./i18n";

export type ControlAction = "start" | "stop" | "restart";

/** Which power buttons make sense now, the rest are shown grayed out */
export function controlStates(
  status: string,
  canControl: boolean,
): Record<ControlAction, boolean> {
  if (!canControl) return { start: false, stop: false, restart: false };
  const current = status as ServerStatus;
  const stopped =
    current === ServerStatus.STOPPED || current === ServerStatus.CRASHED;
  const running = current === ServerStatus.RUNNING;
  // While starting a stop still makes sense, a stuck start is common
  return {
    start: stopped,
    stop: running || current === ServerStatus.STARTING,
    restart: running,
  };
}

const CONTROL_STYLE: Record<ControlAction, "success" | "danger" | "primary"> =
  {
    start: "success",
    stop: "danger",
    restart: "primary",
  };

/** A blueprint offered in the wizard picker */
export interface WizardBlueprintOption {
  id: string;
  label: string;
}

export function mainMenuKeyboard(
  lang: TelegramLang,
  canCreate: boolean,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (canCreate) kb.text(t(lang, "buttons.createServer"), "wiz:start").row();
  kb.text(t(lang, "buttons.serverList"), "srv:page:0").row();
  kb.text(t(lang, "buttons.language"), "menu:lang");
  return kb;
}

export function serversNavKeyboard(
  lang: TelegramLang,
  page: number,
  totalPages: number,
  servers: Array<{ id: string; name: string }> = [],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  // Only for the HTML list, the rich one has buttons inside the table
  servers.forEach((server) =>
    kb.text(server.name, `srv:status:${server.id}`).row(),
  );
  const nav: Array<[string, string]> = [];
  if (page > 0) nav.push([t(lang, "buttons.prev"), `srv:page:${page - 1}`]);
  if (page < totalPages - 1)
    nav.push([t(lang, "buttons.next"), `srv:page:${page + 1}`]);
  nav.forEach(([label, data]) => kb.text(label, data));
  if (nav.length) kb.row();
  kb.text(t(lang, "buttons.refresh"), `srv:page:${page}`);
  kb.text(t(lang, "buttons.mainMenu"), "menu");
  return kb;
}

export function statusKeyboard(
  lang: TelegramLang,
  server: { id: string; status: string },
  canControl: boolean,
  address?: string | null,
): InlineKeyboard {
  const serverId = server.id;
  const kb = new InlineKeyboard();
  const states = controlStates(server.status, canControl);
  for (const action of ["start", "stop", "restart"] as const) {
    const label = t(lang, `buttons.${action}`);
    if (states[action]) {
      kb.text(label, `srv:${action}:${serverId}`).style(CONTROL_STYLE[action]);
    } else {
      kb.disabled(label);
    }
  }
  kb.row();
  if (address) kb.copyText(t(lang, "buttons.copyAddress"), address);
  kb.copyText(t(lang, "buttons.copyId"), serverId).row();
  kb.text(t(lang, "buttons.serverList"), "srv:page:0");
  kb.text(t(lang, "buttons.mainMenu"), "menu");
  return kb;
}

export function languageKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🇬🇧 English", "lang:en")
    .text("🇷🇺 Русский", "lang:ru");
}

export function wizardBlueprintKeyboard(
  lang: TelegramLang,
  blueprints: WizardBlueprintOption[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  blueprints.forEach((bp, idx) => {
    kb.text(bp.label, `wiz:bp:${bp.id}`);
    if (idx % 2 === 1) kb.row();
  });
  kb.row().text(t(lang, "buttons.cancel"), "wiz:cancel");
  return kb;
}

export function wizardVersionKeyboard(
  lang: TelegramLang,
  versions: string[],
): InlineKeyboard {
  const kb = new InlineKeyboard();
  versions.forEach((version, idx) => {
    kb.text(version, `wiz:ver:${idx}`);
    if (idx % 3 === 2) kb.row();
  });
  kb.row().text(t(lang, "buttons.cancel"), "wiz:cancel");
  return kb;
}

export function wizardConfirmKeyboard(lang: TelegramLang): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "buttons.confirm"), "wiz:confirm")
    .success()
    .text(t(lang, "buttons.cancel"), "wiz:cancel");
}

export function twofaKeyboard(
  lang: TelegramLang,
  challengeId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "twofa.approve"), `2fa:approve:${challengeId}`)
    .success()
    .text(t(lang, "twofa.deny"), `2fa:deny:${challengeId}`)
    .danger();
}

/** Under a crash alert, the restart reuses the regular power route and its checks */
export function crashKeyboard(
  lang: TelegramLang,
  serverId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "buttons.restart"), `srv:restart:${serverId}`)
    .success()
    .text(t(lang, "buttons.openStatus"), `srv:status:${serverId}`);
}

/** Under a login alert, the account id lets the handler refuse anyone but its owner */
export function loginAlertKeyboard(
  lang: TelegramLang,
  userId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "security.notMe"), `sec:notme:${userId}`)
    .danger();
}

export function loginConfirmKeyboard(
  lang: TelegramLang,
  userId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "security.confirmRevoke"), `sec:revoke:${userId}`)
    .danger()
    .text(t(lang, "buttons.cancel"), `sec:keep:${userId}`);
}

export function backupRetryKeyboard(
  lang: TelegramLang,
  backupId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(lang, "buttons.retry"), `bk:retry:${backupId}`)
    .primary();
}

/** Opens the reply field right away, the wizard reads the next text as before */
export function nameReply(lang: TelegramLang): ForceReply {
  return {
    force_reply: true,
    input_field_placeholder: t(lang, "wizard.namePlaceholder"),
  };
}

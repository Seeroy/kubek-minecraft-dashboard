import { InlineKeyboard } from "grammy";
import { t, type TelegramLang } from "./i18n";

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
): InlineKeyboard {
  const kb = new InlineKeyboard();
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
  serverId: string,
  canControl: boolean,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (canControl) {
    kb.text(t(lang, "buttons.start"), `srv:start:${serverId}`)
      .text(t(lang, "buttons.stop"), `srv:stop:${serverId}`)
      .text(t(lang, "buttons.restart"), `srv:restart:${serverId}`)
      .row();
  }
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
    .text(t(lang, "buttons.cancel"), "wiz:cancel");
}

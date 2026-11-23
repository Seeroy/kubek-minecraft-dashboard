"use client";
import { useExtensionCommands, useRunExtensionCommandMutation } from "@/modules/extensions/api/extensions.queries";
import { loadIcons } from "@/modules/extensions/runtime/icons";
import { resolveIcon } from "@/modules/extensions/runtime/useExtensionSidebarItems";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { CommandAction } from "../types/command.types";

/** Commands registered by extensions, fetched when the palette opens */
export function useExtensionCommandActions(open: boolean): CommandAction[] {
  const { data: commands } = useExtensionCommands({ enabled: open });
  const hasIcons = !!commands?.some((command) => command.icon);
  const { data: icons } = useQuery({
    queryKey: qk.extensions.icons(),
    queryFn: loadIcons,
    enabled: hasIcons,
    staleTime: Infinity,
    structuralSharing: false,
  });
  const run = useRunExtensionCommandMutation();
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.commandPalette");
  // Titles may be keys from the extension locales
  const { t: tRoot } = useTranslation();
  const { mutateAsync } = run;

  return useMemo<CommandAction[]>(() => {
    const text = (value: string) => {
      const translated = tRoot(value);
      return translated.startsWith("NOT TRANSLATED") ? value : translated;
    };
    // One header per extension, so commands of an extension stay together
    const sorted = [...(commands ?? [])].sort((a, b) => a.extName.localeCompare(b.extName));
    return sorted.map((command) => {
      const title = text(command.title);
      return {
        id: `ext:${command.extId}:${command.id}`,
        group: "extension",
        groupLabel: command.extName,
        label: title,
        icon: resolveIcon(icons, command.icon),
        keywords: command.extName,
        perform: async () => {
          try {
            await mutateAsync({ extId: command.extId, commandId: command.id });
            notify({ type: "success", title: t("extensionCommand.done", title) });
          } catch (err) {
            const message = err instanceof Error && err.message ? err.message : t("extensionCommand.failed", title);
            notify({ type: "error", title: message });
          }
        },
      };
    });
  }, [commands, icons, mutateAsync, notify, t, tRoot]);
}

"use client";
import { useReadFileMutation, useWriteFileMutation } from "@/modules/files/api/files.queries";
import { FILE_EDITOR_MODAL_ID } from "@/modules/files/modals";
import { useNotifications } from "@/modules/notifications";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { ApiError } from "@/shared/lib/http";
import type { ConfigFileSpec } from "@/shared/types/server-types.types";
import { useState } from "react";
import { findSyntaxProblem } from "../lib/configSyntax";

export const configFileName = (path: string) => path.split(/[/\\]/).pop() ?? path;

/** Opens a blueprint config file in the files editor and saves it back once it parses */
export function useConfigFileEditor(serverId: string) {
  const { t } = useTranslation("modules.serverSettings.configFiles");
  const { notify } = useNotifications();
  const { open: openModal } = useModal();
  const { mutateAsync: readFile } = useReadFileMutation(serverId);
  const { mutateAsync: writeFile } = useWriteFileMutation(serverId);
  const [busy, setBusy] = useState<{ path: string; step: "opening" | "saving" } | null>(null);

  const edit = async (file: ConfigFileSpec) => {
    const name = configFileName(file.path);
    setBusy({ path: file.path, step: "opening" });
    let text: string;
    try {
      text = await readFile(file.path);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) {
        notify({ type: "error", title: t("readFailed", name), message: getApiErrorMessage(error) || undefined });
        return;
      }
      notify({ type: "info", title: t("notCreated", name) });
      text = "";
    } finally {
      setBusy(null);
    }

    // A broken file or a failed save brings the editor back with the user's text
    for (;;) {
      const next = await openModal(FILE_EDITOR_MODAL_ID, { filename: name, initialValue: text });
      if (next == null) return;
      text = next;

      const problem = findSyntaxProblem(file.parser, next);
      if (problem) {
        notify({
          type: "error",
          title: t("invalid.title", t(`formats.${file.parser}`)),
          message: problem.empty
            ? t("invalid.empty")
            : problem.line
              ? t("invalid.at", problem.line, problem.column ?? 1, problem.details)
              : t("invalid.details", problem.details),
        });
        continue;
      }

      setBusy({ path: file.path, step: "saving" });
      try {
        await writeFile({ path: file.path, data: next });
        notify({ type: "success", title: t("saved", name) });
        return;
      } catch (error) {
        notify({ type: "error", title: t("saveFailed", name), message: getApiErrorMessage(error) || undefined });
      } finally {
        setBusy(null);
      }
    }
  };

  return { edit, busy };
}

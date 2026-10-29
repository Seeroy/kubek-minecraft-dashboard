"use client";
import type { ModpackPreview } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { FileDropZone } from "@/shared/ui/file-drop-zone";
import { AlertCircle, Package } from "lucide-react";
import { useState } from "react";
import { modpackErrorMessage } from "./errors";
import { useInspectModpackMutation } from "./modpacks.queries";

/** A .mrpack picked from disk, read on the server into a preview */
export function MrpackSource({ onPreview }: { onPreview: (preview: ModpackPreview) => void }) {
  const { t } = useTranslation("modules.modpacks");
  const inspect = useInspectModpackMutation();
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File) => {
    if (!/\.mrpack$/i.test(file.name)) {
      setError(t("mrpack.invalid"));
      return;
    }
    setError(null);
    try {
      onPreview(await inspect.mutateAsync({ file }));
    } catch (cause) {
      setError(modpackErrorMessage(cause, t));
    }
  };

  return (
    <div className="grid gap-3">
      <FileDropZone
        icon={<Package />}
        tone="green"
        title={t("mrpack.title")}
        hint={t("mrpack.hint")}
        accept=".mrpack"
        buttonLabel={t("mrpack.button")}
        busyLabel={t("mrpack.busy")}
        busy={inspect.isPending}
        onFile={(file) => void pick(file)}
      />
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

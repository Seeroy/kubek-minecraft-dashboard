"use client";
import { useNotifications } from "@/modules/notifications";
import { useImportServerMutation } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import { Button } from "@/shared/ui/button";
import { FileDropZone } from "@/shared/ui/file-drop-zone";
import { Input } from "@/shared/ui/input";
import { AlertCircle, FileArchive, TriangleAlert, Upload } from "lucide-react";
import { useState } from "react";

/** Kubek export archive, imported as is */
export function ArchiveSource({ onImported }: { onImported: (serverId: string) => void }) {
  const { t: tRoot } = useTranslation("modules.sidebar.serversList");
  const t = (key: string, ...args: unknown[]) => tRoot(`dialogs.import.${key}`, ...args);
  const { t: tm } = useTranslation("modules.modpacks");
  const { notify } = useNotifications();
  const mutation = useImportServerMutation();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const acceptFile = (next: File) => {
    if (!/\.zip$/i.test(next.name)) {
      setError(t("invalidArchive"));
      return;
    }
    setError(null);
    setFile(next);
  };

  const submit = async () => {
    if (!file) return;
    setError(null);
    try {
      const { server } = await mutation.mutateAsync({ archive: file, name: name.trim() || undefined });
      notify({ type: "success", title: t("successTitle"), message: t("successMessage", server.name), icon: FileArchive, duration: 5000 });
      onImported(server.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (e instanceof ApiError && /NAME_TAKEN/.test(message)) setError(t("nameTaken"));
      else if (/manifest|archive|unpack/i.test(message)) setError(t("invalidArchive"));
      else notify({ type: "error", title: t("errorTitle"), message, icon: TriangleAlert });
    }
  };

  return (
    <div className="grid gap-4">
      <FileDropZone
        icon={<FileArchive />}
        tone="orange"
        title={file ? t("selected", file.name) : t("description")}
        hint={t("dropzone")}
        accept=".zip"
        buttonLabel={tm("mrpack.button")}
        busyLabel={tm("mrpack.button")}
        busy={false}
        onFile={acceptFile}
      />

      <div className="grid gap-1.5">
        <label htmlFor="import-archive-name" className="font-medium">
          {t("optionalNameLabel")}
        </label>
        <Input id="import-archive-name" value={name} onChange={(event) => setName(event.target.value)} />
        <p className="text-xs text-muted-foreground">{t("optionalNameHelp")}</p>
      </div>

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}

      <Button className="justify-self-end" disabled={!file || mutation.isPending} onClick={() => void submit()}>
        <Upload />
        {mutation.isPending ? t("submitting") : t("submit")}
      </Button>
    </div>
  );
}

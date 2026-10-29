"use client";
import { api, type ModpackPreview } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { CreationView } from "@/modules/server/modals/CreateServerModal/wizard/CreationView";
import { useServerCreationStore } from "@/modules/server/store/server-creation.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { ModalProps } from "@/shared/types/modal.types";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Plate } from "@/shared/ui/plate";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { TaskStatus, TaskType } from "@shared/types/task.types";
import { Check, FileArchive, Globe, Package, Terminal, TriangleAlert, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { ArchiveSource } from "./import-server/ArchiveSource";
import { modpackErrorMessage } from "./import-server/errors";
import { MODPACK_FORM_ID, ModpackSetup } from "./import-server/ModpackSetup";
import { useInstallModpackMutation } from "./import-server/modpacks.queries";
import { ModrinthSource } from "./import-server/ModrinthSource";
import { MrpackSource } from "./import-server/MrpackSource";

export type ImportServerProps = { source?: ImportSource };

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "sidebar/import-server": {
      props: ImportServerProps;
      result: string | null;
    };
  }
}

export type ImportSource = "archive" | "mrpack" | "modrinth";
type Source = ImportSource;

const SOURCES: { key: Source; icon: typeof Upload }[] = [
  { key: "archive", icon: FileArchive },
  { key: "mrpack", icon: Package },
  { key: "modrinth", icon: Globe },
];

const ImportServerDialog: React.FC<ModalProps<string | null> & ImportServerProps> = ({ isOpen, onClose, source: initialSource }) => {
  const { t: tSidebar } = useTranslation("modules.sidebar.serversList");
  const { t } = useTranslation("modules.modpacks");
  const { notify } = useNotifications();
  const { selectServer } = useServerStore();
  const router = useRouter();
  const install = useInstallModpackMutation();

  const [source, setSource] = useState<Source>(initialSource ?? "archive");
  const [preview, setPreview] = useState<ModpackPreview | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const creation = useServerCreationStore((s) => (taskId ? s.creations[taskId] : undefined));

  const stage = taskId ? "progress" : preview ? "setup" : "source";
  const succeeded = creation?.status === TaskStatus.SUCCESS;
  const running = !!creation && !succeeded && creation.status !== TaskStatus.FAILED && creation.status !== TaskStatus.CANCELLED;

  // A staged pack nobody installs would sit on the server until it expires
  const dropPreview = () => {
    if (preview) void api.modpacks.discard(preview.packId).catch(() => undefined);
    setPreview(null);
  };

  const close = (serverId: string | null = null) => {
    if (stage === "setup") dropPreview();
    onClose(serverId ?? creation?.serverId ?? null);
  };

  const create = async (values: Parameters<React.ComponentProps<typeof ModpackSetup>["onSubmit"]>[0]) => {
    if (!preview) return;
    try {
      const response = await install.mutateAsync({ ...values, packId: preview.packId });
      // Seed the progress view so it renders before the first socket event lands
      const now = Date.now();
      useServerCreationStore.getState().upsertFromTask({
        id: response.taskId,
        type: TaskType.SERVER_CREATE_MODPACK,
        status: TaskStatus.PENDING,
        progress: 0,
        meta: { serverId: response.server.id, serverName: response.server.name },
        createdAt: now,
        updatedAt: now,
      });
      setTaskId(response.taskId);
    } catch (error) {
      notify({ type: "error", title: t("actions.create"), message: modpackErrorMessage(error, t), icon: TriangleAlert, duration: 8000 });
    }
  };

  const openConsole = () => {
    if (creation?.serverId) selectServer(creation.serverId);
    close();
    router.push("/console");
  };

  const hint = stage === "source" ? t(`hints.${source}`) : t(`hints.${stage === "setup" ? "preview" : "progress"}`);
  const meta = preview ? `Fabric ${preview.minecraftVersion}, ${preview.name} ${preview.version}` : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="h-[min(680px,90vh)] max-h-none max-sm:h-dvh max-sm:max-w-full max-sm:rounded-none sm:max-w-[640px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="primary">
            <Upload />
          </Plate>
          <div className="min-w-0">
            <DialogTitle>{tSidebar("dialogs.import.title")}</DialogTitle>
            <DialogDescription>{hint}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="p-5">
          <div key={stage} className="min-w-0 animate-enter">
            {stage === "progress" && creation ? (
              <CreationView creation={creation} meta={meta} autostart={false} />
            ) : stage === "setup" && preview ? (
              <ModpackSetup preview={preview} onSubmit={(values) => void create(values)} />
            ) : (
              <div className="grid min-w-0 grid-cols-1 gap-4">
                <ToggleGroup
                  variant="segmented"
                  value={[source]}
                  onValueChange={(next) => next[0] && setSource(next[0] as Source)}
                  aria-label={t("sources.label")}
                  className="w-full"
                >
                  {SOURCES.map(({ key, icon: Icon }) => (
                    <Toggle key={key} variant="segmented" value={key} className="flex-1">
                      <Icon />
                      {t(`sources.${key}`)}
                    </Toggle>
                  ))}
                </ToggleGroup>
                {source === "archive" ? (
                  <ArchiveSource onImported={(serverId) => onClose(serverId)} />
                ) : source === "mrpack" ? (
                  <MrpackSource onPreview={setPreview} />
                ) : (
                  <ModrinthSource onPreview={setPreview} />
                )}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="flex-row items-center justify-end">
          {stage === "source" && (
            <Button variant="ghost" onClick={() => close()}>
              {tSidebar("bulk.cancel")}
            </Button>
          )}
          {stage === "setup" && (
            <>
              <Button variant="ghost" disabled={install.isPending} onClick={dropPreview}>
                {t("actions.back")}
              </Button>
              <Button type="submit" form={MODPACK_FORM_ID} disabled={install.isPending}>
                <Check />
                {install.isPending ? t("actions.creating") : t("actions.create")}
              </Button>
            </>
          )}
          {stage === "progress" && (
            <>
              {running && <span className="mr-auto text-[12.5px] text-muted-foreground max-sm:hidden">{t("hints.progress")}</span>}
              <Button variant="outline" onClick={() => close()}>
                {succeeded ? t("actions.done") : t("actions.close")}
              </Button>
              {succeeded && (
                <Button onClick={openConsole}>
                  <Terminal />
                  {t("actions.openConsole")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportServerDialog;

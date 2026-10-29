"use client";

import type { ContentKind } from "@/api";
import { useNotifications } from "@/modules/notifications";
import type { Server } from "@/modules/server";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useThisModal } from "@/shared/hooks/useThisModal";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { cn } from "@/shared/lib/cn";
import {
  useContentProject,
  useContentProjects,
  useContentVersions,
  useInstallContentMutation,
  useInstalledContent,
  useUpdateContentMutation,
} from "@/shared/queries";
import type { ModalProps } from "@/shared/types/modal.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Plate } from "@/shared/ui/plate";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { AccessArea } from "@shared/access/areas";
import type { InstalledPluginView, ModrinthVersion } from "@shared/types/plugins";
import { AlertTriangle, Check, Download, ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getContentKind } from "../content-kind";
import { primaryCategory } from "../lib/installed";
import { ProjectIcon } from "../ui/ProjectIcon";
import { getInstallableDependencies, getMissingDependencies } from "../utils/resolveDependencies";

const VISIBLE_VERSIONS = 5;
const dateFormat = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" });

export interface InstallPluginProps {
  kind: ContentKind;
  server: Server;
  projectId: string;
  initialVersionId?: string;
  // Present when updating or reinstalling an installed project
  record?: InstalledPluginView;
}

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "plugins/install": { props: InstallPluginProps; result: void };
  }
}

type InstallPluginModalProps = ModalProps & InstallPluginProps;

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-2 max-sm:grid-cols-[minmax(0,1fr)]">
      <div className="label-caps">{title}</div>
      {children}
    </section>
  );
}

function pickVersion(versions: ModrinthVersion[], initial: string | undefined, gameVersion: string | undefined) {
  if (initial && versions.some((v) => v.id === initial)) return initial;
  return (versions.find((v) => gameVersion && v.game_versions.includes(gameVersion)) ?? versions[0])?.id;
}

function InstallPluginModalComponent({ isOpen, onClose, kind, server, projectId, initialVersionId, record }: InstallPluginModalProps) {
  const config = getContentKind(kind);
  const { t } = useTranslation("modules.content.install");
  const { t: tk } = useTranslation(config.i18nNs);
  const { notify } = useNotifications();
  const blueprint = useBlueprint(server.blueprintId);
  const gameVersion = server.variables?.GAME_VERSION != null ? String(server.variables.GAME_VERSION) : undefined;

  const project = useContentProject(kind, projectId);
  const versionsQuery = useContentVersions(kind, projectId);
  const { data: installed } = useInstalledContent(kind, server.id);
  const versions = versionsQuery.data ?? [];

  const [chosen, setChosen] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const [withDependencies, setWithDependencies] = useState(true);
  const selectedId = chosen ?? pickVersion(versions, initialVersionId, gameVersion);
  const selected = versions.find((v) => v.id === selectedId);

  const dependencies = getInstallableDependencies(selected);
  const missing = getMissingDependencies(selected);
  const dependencyProjects = useContentProjects(
    kind,
    dependencies.map((d) => d.projectId)
  );
  const installedIds = new Set(installed?.map((item) => item.projectId));

  const install = useInstallContentMutation(kind, server.id);
  const update = useUpdateContentMutation(kind, server.id);
  const pending = install.isPending || update.isPending;
  const canInstall = useAccess([AccessArea.CONTENT, "write"], server.id);

  const submit = async () => {
    if (!selectedId) return;
    const payload = withDependencies ? dependencies : [];
    if (record) {
      await update.mutateAsync({
        recordId: record.id,
        payload: { versionId: selectedId, dependencies: payload, reinstall: withDependencies },
      });
      notify({ type: "success", title: tk("install.updateScheduled") });
    } else {
      await install.mutateAsync({
        serverId: server.id,
        projectId,
        versionId: selectedId,
        dependencies: payload,
        installDependencies: withDependencies,
      });
      notify({ type: "success", title: tk("install.scheduled") });
    }
    onClose();
  };

  // The selected version always stays in view, even when it is past the fold
  const shown = showAll ? versions : versions.slice(0, VISIBLE_VERSIONS);
  const visible = selected && !shown.includes(selected) ? [...shown, selected] : shown;
  const compatible = !gameVersion || !selected || selected.game_versions.includes(gameVersion);
  const coreLabel = [blueprint?.shortName ?? blueprint?.name, gameVersion].filter(Boolean).join(" ");
  const data = project.data;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader className="flex-row items-center gap-3">
          {data ? (
            <ProjectIcon title={data.title} iconUrl={data.icon_url} category={primaryCategory(data.categories)} size="lg" />
          ) : (
            <Skeleton className="size-9 rounded-[10px]" />
          )}
          <div className="min-w-0">
            <DialogTitle className="truncate">
              {record ? tk("install.update") : tk("install.title")}
              {data && `: ${data.title}`}
            </DialogTitle>
            <DialogDescription className="truncate">{selected ? `${data?.title ?? ""} ${selected.version_number}` : " "}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="grid gap-5">
          {project.isError || versionsQuery.isError ? (
            <p className="text-danger">{t("loadFailed")}</p>
          ) : versionsQuery.isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <>
              <Section title={t("versions")}>
                {versions.length === 0 ? (
                  <p className="text-muted-foreground">{t("noVersions")}</p>
                ) : (
                  <RadioGroup
                    value={selectedId}
                    onValueChange={(value) => setChosen(value as string)}
                    className="flex scrollbar-thin max-h-72 flex-col gap-0 overflow-y-auto rounded-lg border border-border"
                  >
                    {visible.map((version) => (
                      <label
                        key={version.id}
                        className={cn(
                          "flex min-h-10 shrink-0 cursor-pointer items-center gap-2.5 px-3 py-2 text-[12.5px] not-first:border-t not-first:border-border hover:bg-hover",
                          version.id === selectedId && "bg-primary/8 hover:bg-primary/8"
                        )}
                      >
                        <RadioGroupItem value={version.id} />
                        <span className="grid min-w-0 flex-1 gap-1 sm:flex sm:items-center sm:gap-2">
                          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="min-w-0 truncate font-mono font-semibold">{version.version_number}</span>
                            <Badge variant={version.version_type === "release" ? "success" : "warning"}>{version.version_type}</Badge>
                            {version.game_versions.length > 0 && (
                              <Badge variant="secondary" className="font-mono">
                                MC {version.game_versions.at(-1)}
                              </Badge>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums sm:ml-auto sm:shrink-0">
                            {dateFormat.format(new Date(version.date_published))} · {t("versionDownloads", version.downloads)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
                {!showAll && versions.length > VISIBLE_VERSIONS && (
                  <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setShowAll(true)}>
                    {t("showAllVersions", versions.length)}
                  </Button>
                )}
              </Section>

              {selected && (
                <Section title={t("compatibility")}>
                  <div className={cn("flex items-center gap-2.5 rounded-md bg-tone/9 px-3 py-2.5", compatible ? "tone-green" : "tone-amber")}>
                    <Plate tone={compatible ? "green" : "amber"} size="sm">
                      {compatible ? <Check /> : <AlertTriangle />}
                    </Plate>
                    <span>{compatible ? t("compatible", coreLabel, server.name) : t("incompatible", selected.game_versions.at(-1) ?? "?", gameVersion)}</span>
                  </div>
                </Section>
              )}

              {selected && (
                <Section title={t("dependencies")}>
                  {dependencies.length > 0 ? (
                    <>
                      <label className="flex cursor-pointer items-center gap-2.5">
                        <Switch checked={withDependencies} onCheckedChange={setWithDependencies} disabled={pending} />
                        {t("installDependencies", dependencies.length)}
                      </label>
                      <div className="flex flex-wrap gap-1.5 pl-11 max-sm:pl-0">
                        {dependencies.map((dependency, index) => {
                          const dep = dependencyProjects[index]?.data;
                          const title = dep?.title ?? dependency.projectId;
                          return (
                            <Badge key={dependency.projectId} variant="outline" className="h-6 max-w-full gap-1.5">
                              <ProjectIcon title={title} iconUrl={dep?.icon_url} category={primaryCategory(dep?.categories)} size="sm" />
                              <span className="truncate">{title}</span>
                              {installedIds.has(dependency.projectId) && <span className="text-success">· {t("alreadyInstalled")}</span>}
                            </Badge>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">{t("noDependencies")}</p>
                  )}
                  {missing.length > 0 && (
                    <p className="flex items-center gap-1.5 text-warn">
                      <AlertTriangle className="size-3.5" />
                      {t("manualDependencies")}: {missing.map((d) => d.projectId ?? t("unknownProject")).join(", ")}
                    </p>
                  )}
                </Section>
              )}

              {selected?.changelog && (
                <Section title={t("changelog", selected.version_number)}>
                  <pre className="scrollbar-thin max-h-48 overflow-y-auto font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {selected.changelog.trim()}
                  </pre>
                </Section>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter className="sm:justify-between">
          {data ? (
            <Button variant="ghost" size="sm" render={<a href={`https://modrinth.com/${config.modrinthType}/${data.slug}`} target="_blank" rel="noreferrer" />}>
              <ExternalLink />
              {t("viewOnModrinth")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              {t("cancel")}
            </Button>
            {canInstall && (
              <Button onClick={() => void submit()} disabled={pending || !selected}>
                {pending ? <Spinner /> : <Download />}
                {pending ? (record ? t("updating") : t("installing")) : record ? tk("install.update") : tk("install.title")}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const INSTALL_PLUGIN_MODAL_ID = "plugins/install";

export function InstallPluginModalRegistration() {
  useThisModal({
    id: INSTALL_PLUGIN_MODAL_ID,
    component: InstallPluginModalComponent,
    module: "plugins",
  });

  return null;
}

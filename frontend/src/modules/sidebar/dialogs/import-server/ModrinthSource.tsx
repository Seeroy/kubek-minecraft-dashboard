"use client";
import type { ModpackPreview } from "@/api";
import { ProjectIcon } from "@/modules/plugins/ui/ProjectIcon";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTaskWaiter, useWatchedTask } from "@/shared/hooks/useWatchedTask";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { TaskStageList } from "@/shared/ui/task-stages";
import type { ModrinthSearchHit } from "@shared/types/plugins";
import { TaskStatus } from "@shared/types/task.types";
import { AlertCircle, Download, PackageOpen, Search } from "lucide-react";
import { useState } from "react";
import { modpackErrorMessage, modpackTaskErrorMessage } from "./errors";
import { useModpackSearch, useModpackVersions, useStartModrinthInspect } from "./modpacks.queries";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/** Modrinth catalog of server-ready Fabric packs with a version choice */
export function ModrinthSource({ onPreview }: { onPreview: (preview: ModpackPreview) => void }) {
  const { t } = useTranslation("modules.modpacks");
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 350);
  const search = useModpackSearch(debounced, true);
  const [picked, setPicked] = useState<ModrinthSearchHit | null>(null);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3">
      <InputGroup>
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("modrinth.searchPlaceholder")}
          aria-label={t("modrinth.searchLabel")}
        />
      </InputGroup>

      {search.isPending ? (
        <div className="grid gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[58px] rounded-lg" />
          ))}
        </div>
      ) : search.isError ? (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {t("modrinth.error")}
        </p>
      ) : search.data.hits.length === 0 ? (
        <Empty className="py-8">
          <EmptyHeader>
            <PackageOpen className="size-6 text-muted-foreground" />
            <EmptyDescription>{t("modrinth.empty")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul
          aria-label={t("modrinth.searchLabel")}
          className="grid min-w-0 grid-cols-1 gap-1.5 data-[state=loading]:opacity-70"
          data-state={search.isFetching ? "loading" : "idle"}
        >
          {search.data.hits.map((hit) => (
            <li key={hit.project_id} className="grid min-w-0 grid-cols-1">
              <HitRow hit={hit} selected={picked?.project_id === hit.project_id} onSelect={() => setPicked(hit)} />
              {picked?.project_id === hit.project_id && <VersionPicker hit={hit} onPreview={onPreview} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HitRow({ hit, selected, onSelect }: { hit: ModrinthSearchHit; selected: boolean; onSelect: () => void }) {
  const { t } = useTranslation("modules.modpacks");
  return (
    <button
      type="button"
      aria-expanded={selected}
      onClick={onSelect}
      className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-border p-2.5 text-left transition-colors duration-150 ease-smooth hover:bg-hover aria-expanded:rounded-b-none aria-expanded:border-primary/60 aria-expanded:bg-primary/6"
    >
      <ProjectIcon title={hit.title} iconUrl={hit.icon_url} size="lg" />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-semibold">{hit.title}</b>
        <span className="block truncate text-xs text-muted-foreground">{hit.description}</span>
      </span>
      <span
        className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums"
        title={t("modrinth.downloads", String(hit.downloads))}
      >
        <Download className="size-3.5" />
        {compact.format(hit.downloads)}
      </span>
    </button>
  );
}

function VersionPicker({ hit, onPreview }: { hit: ModrinthSearchHit; onPreview: (preview: ModpackPreview) => void }) {
  const { t } = useTranslation("modules.modpacks");
  const versions = useModpackVersions(hit.project_id);
  const start = useStartModrinthInspect();
  const [taskId, setTaskId] = useState<string | null>(null);
  // Live stages for the list, the waiter below decides when it is over
  const task = useWatchedTask(taskId).data;
  const waitFor = useTaskWaiter();
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = versions.data?.find((v) => v.id === chosen) ?? versions.data?.[0];
  const busy = start.isPending || !!taskId;

  const read = async () => {
    if (!version) return;
    setError(null);
    try {
      const ref = await start.mutateAsync({ projectId: hit.project_id, versionId: version.id });
      setTaskId(ref.taskId);
      const done = await waitFor(ref.taskId);
      // The task result is the preview, a failure hands the picker back
      if (done.status === TaskStatus.SUCCESS) onPreview(done.result as ModpackPreview);
      else setError(modpackTaskErrorMessage(done.error, t));
    } catch (cause) {
      setError(modpackErrorMessage(cause, t));
    } finally {
      setTaskId(null);
    }
  };

  return (
    <div className="grid min-w-0 animate-enter grid-cols-1 gap-2 rounded-b-lg border border-t-0 border-primary/60 bg-primary/6 p-2.5">
      {versions.isPending ? (
        <Skeleton className="h-24" aria-label={t("modrinth.loadingVersions")} />
      ) : !versions.data?.length ? (
        <p className="text-xs text-muted-foreground">{t("modrinth.noVersions")}</p>
      ) : busy && task?.stages?.length ? (
        <TaskStageList stages={task.stages} className="rounded-lg bg-card p-1" />
      ) : (
        <>
          <ul aria-label={t("modrinth.version")} className="grid scrollbar-thin max-h-48 min-w-0 grid-cols-1 gap-1 overflow-y-auto">
            {versions.data.map((v) => (
              <li key={v.id} className="min-w-0">
                <button
                  type="button"
                  aria-pressed={v.id === version?.id}
                  disabled={busy}
                  onClick={() => setChosen(v.id)}
                  className="flex w-full min-w-0 items-center gap-2 rounded-md border border-transparent bg-card px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150 hover:bg-hover aria-pressed:border-primary/60 aria-pressed:bg-primary/8"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{v.version_number}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{gameVersions(v.game_versions)}</span>
                  {v.version_type !== "release" && <Badge variant="warning">{t(`modrinth.types.${v.version_type}`)}</Badge>}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <Button disabled={!version || busy} onClick={() => void read()}>
              {busy ? <Spinner /> : <PackageOpen />}
              {t("modrinth.read")}
            </Button>
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// A long list of supported versions shrinks to its newest one and a count
const gameVersions = (list: string[]) => (list.length > 1 ? `MC ${list[list.length - 1]} +${list.length - 1}` : `MC ${list[0] ?? "?"}`);

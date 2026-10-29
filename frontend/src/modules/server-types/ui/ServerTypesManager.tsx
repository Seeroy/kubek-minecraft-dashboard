"use client";

import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Button } from "@/shared/ui/button";
import { FileDropZone } from "@/shared/ui/file-drop-zone";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { PageHeader } from "@/shared/ui/page-header";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { AccessArea } from "@shared/access/areas";
import { Boxes, RotateCw, Search, Shield, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useBlueprints, useInstallBlueprintMutation, useRemoveBlueprintMutation } from "../api/server-types.queries";
import { BlueprintCard } from "./BlueprintCard";

type Filter = "all" | BlueprintSummary["source"];
const FILTERS: Filter[] = ["all", "bundled", "installed"];

export const ServerTypesManager = () => {
  const { t } = useTranslation("modules.serverTypes");
  const { notify } = useNotifications();
  const canManage = useAuthStore((s) => s.can(AccessArea.INTEGRATIONS, "manage"));
  const { servers } = useServerStore();
  const blueprints = useBlueprints();
  const remove = useRemoveBlueprintMutation();
  const install = useInstallBlueprintMutation();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const all = blueprints.data ?? [];
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const server of servers) if (server.blueprintId) counts.set(server.blueprintId, (counts.get(server.blueprintId) ?? 0) + 1);
    return counts;
  }, [servers]);
  const q = query.trim().toLowerCase();
  const shown = all.filter((bp) => (filter === "all" || bp.source === filter) && (!q || `${bp.name} ${bp.id}`.toLowerCase().includes(q)));
  const count = (key: Filter) => (key === "all" ? all.length : all.filter((bp) => bp.source === key).length);

  const confirmRemove = async (bp: BlueprintSummary) => {
    const ok = await confirmDialog({
      title: t("confirmRemove.title", bp.name),
      description: t("confirmRemove.description"),
      confirmText: t("confirmRemove.confirm"),
      cancelText: t("confirmRemove.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    await remove.mutateAsync(bp.id);
    notify({ type: "success", title: t("toasts.removed", bp.name) });
  };

  return (
    <div className="stagger-enter grid gap-4">
      <PageHeader
        title={t("title")}
        description={t("description")}
        className="mb-1"
        actions={
          <Button variant="outline" disabled={blueprints.isFetching} onClick={() => void blueprints.refetch()}>
            <RotateCw className={blueprints.isFetching ? "animate-spin" : undefined} />
            {t("refresh")}
          </Button>
        }
      />

      <div className="tone-amber grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-tone/25 bg-tone/9 px-4 py-3 text-[13px]">
        <Plate tone="amber">
          <Shield />
        </Plate>
        <div>
          <b className="mb-0.5 block font-semibold">{t("notice.title")}</b>
          <span className="text-muted-foreground">{t("notice.description")}</span>
        </div>
      </div>

      {canManage && (
        <FileDropZone
          icon={<Upload />}
          tone="blue"
          title={t("upload.title")}
          hint={t("upload.hint")}
          accept=".kbp,.json,.zip"
          buttonLabel={t("upload.choose")}
          busyLabel={t("upload.installing")}
          busy={install.isPending}
          onFile={(file) => install.mutate(file, { onSuccess: (result) => notify({ type: "success", title: t("toasts.installed", result.name) }) })}
        />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ToggleGroup variant="segmented" value={[filter]} onValueChange={(next) => next[0] && setFilter(next[0] as Filter)}>
          {FILTERS.map((key) => (
            <Toggle key={key} variant="segmented" value={key}>
              {t(`filters.${key}`)}
              <span className="text-[11px] text-muted-foreground tabular-nums">{count(key)}</span>
            </Toggle>
          ))}
        </ToggleGroup>
        <InputGroup className="ml-auto w-full sm:w-60">
          <InputGroupAddon>
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("filters.search")} />
        </InputGroup>
      </div>

      {blueprints.isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-60 rounded-lg" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Empty className="rounded-lg border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Boxes />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {shown.map((bp) => (
            <BlueprintCard
              key={bp.id}
              blueprint={bp}
              usedBy={usage.get(bp.id) ?? 0}
              canRemove={canManage}
              busy={remove.isPending}
              onRemove={() => void confirmRemove(bp)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

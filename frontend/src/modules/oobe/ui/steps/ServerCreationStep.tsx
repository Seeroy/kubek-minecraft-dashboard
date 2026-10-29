"use client";

import { CREATE_SERVER_MODAL_ID } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Meter } from "@/shared/ui/meter";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { AlertTriangle, Check, Info, Plus, RotateCw, Server } from "lucide-react";
import type { LatestCreation } from "../../lib/useLatestCreation";

function CreationCard({ creation, onOpen }: { creation: LatestCreation; onOpen: () => void }) {
  const { t } = useTranslation("modules.oobe.server");

  if (creation.done) {
    return (
      <>
        <div className="grid animate-in grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-success/40 bg-success/7 p-4 duration-400 fade-in slide-in-from-right-6">
          <Plate tone="green" size="xl">
            <Server />
          </Plate>
          <b className="truncate text-[15px]">{creation.serverName}</b>
          <Badge variant="success">
            <Check />
            {t("created")}
          </Badge>
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">{t("createdHint")}</p>
      </>
    );
  }

  if (creation.failed) {
    return (
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-lg border border-danger/40 bg-danger/7 p-4">
        <Plate tone="red" size="xl">
          <AlertTriangle />
        </Plate>
        <div className="min-w-0">
          <b className="block truncate text-[15px]">{t("failed")}</b>
          {creation.error && <span className="block truncate text-[12.5px] text-muted-foreground">{creation.error}</span>}
        </div>
        <Button variant="outline" onClick={onOpen}>
          <RotateCw />
          {t("retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 text-[13px] font-medium">
        <Spinner className="text-primary" />
        <span className="min-w-0 flex-1 truncate">{t("creating", creation.serverName)}</span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">{creation.percent}%</span>
      </div>
      <Meter value={creation.percent} tone="primary" aria-label={t("creating", creation.serverName)} />
      <Button variant="ghost" size="sm" className="justify-self-start" onClick={onOpen}>
        {t("open")}
      </Button>
    </div>
  );
}

export function ServerCreationStep({ creation }: { creation: LatestCreation | undefined }) {
  const { t } = useTranslation("modules.oobe.server");
  const { openModal } = useModal();
  const open = () => openModal(CREATE_SERVER_MODAL_ID);

  return (
    <>
      <div className="tone-blue mb-4 grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-tone/20 bg-tone/8 px-4 py-3 text-[13px]">
        <Plate tone="blue" size="sm">
          <Info />
        </Plate>
        <div>
          <b className="mb-0.5 block font-semibold">{t("optional.title")}</b>
          <span className="text-muted-foreground">{t("optional.description")}</span>
        </div>
      </div>

      {creation ? (
        <CreationCard creation={creation} onOpen={open} />
      ) : (
        <div className="grid justify-items-center gap-2 px-4 py-6 text-center">
          <Plate tone="amber" size="lg">
            <Server />
          </Plate>
          <h3 className="mt-2 text-base font-semibold">{t("intro.title")}</h3>
          <p className="mb-2 max-w-[46ch] text-[13.5px] text-muted-foreground">{t("intro.description")}</p>
          <Button onClick={open}>
            <Plus />
            {t("intro.button")}
          </Button>
        </div>
      )}
    </>
  );
}

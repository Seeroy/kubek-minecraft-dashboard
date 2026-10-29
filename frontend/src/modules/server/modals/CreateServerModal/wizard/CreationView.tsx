import { iconType } from "@/modules/server-types/lib/blueprint";
import { resolveProgressMessage } from "@/modules/notifications/utils/resolveProgressMessage";
import { useLanguageContext } from "@/shared/context/language-context";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Badge } from "@/shared/ui/badge";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Meter } from "@/shared/ui/meter";
import { Plate } from "@/shared/ui/plate";
import type { Tone } from "@/shared/ui/tone";
import type { ITask } from "@shared/types/task.types";
import { AlertTriangle, Check, Coffee, Download, Loader, type LucideIcon, Package, Server, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ServerCreationProgress } from "../../../store/server-creation.store";
import { computeCreationStages, creationOverallPercent } from "../stages";

const STAGE_LOOK: Record<string, { icon: LucideIcon; tone: Tone }> = {
  java: { icon: Coffee, tone: "orange" },
  core: { icon: Download, tone: "purple" },
  mods: { icon: Package, tone: "blue" },
  overrides: { icon: SlidersHorizontal, tone: "cyan" },
  finalize: { icon: Check, tone: "green" },
};

interface CreationViewProps {
  creation: ServerCreationProgress;
  /** Known while the wizard that started the creation is still open */
  blueprint?: BlueprintSummary;
  meta?: string;
  autostart: boolean;
}

export function CreationView({ creation, blueprint, meta, autostart }: CreationViewProps) {
  const { t } = useTranslation("modules.newServerModal.progress");
  const { t: tRoot } = useLanguageContext();
  const stages = computeCreationStages(creation);
  const overall = creationOverallPercent(creation);
  const done = stages.every((stage) => stage.state === "done");
  const failed = stages.some((stage) => stage.state === "error");
  const log = useRef<HTMLDivElement>(null);
  const messages = creation.log.map((entry) => resolveProgressMessage(entry as ITask, tRoot));

  // Follow the newest line
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages.length]);

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-lg border border-border p-3">
        {blueprint ? (
          <BlueprintIcon icon={blueprint.icon} coreType={iconType(blueprint.id)} label={blueprint.name} className="size-10 rounded-[9px]" />
        ) : (
          <Plate tone="primary" size="xl">
            <Server />
          </Plate>
        )}
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[15px] font-semibold">{creation.serverName}</b>
          {meta && <span className="block truncate text-[12.5px] text-muted-foreground">{meta}</span>}
        </div>
        {done ? (
          <Badge variant="success">{t("done")}</Badge>
        ) : failed ? (
          <Badge variant="destructive">
            <AlertTriangle />
          </Badge>
        ) : (
          <Badge variant="info" className="tabular-nums">
            {overall}%
          </Badge>
        )}
      </div>

      {done ? (
        <div className="grid animate-enter justify-items-center px-4 pt-6 pb-2 text-center">
          <Plate tone="green" className="mb-3 size-[52px] rounded-[14px] [&_svg]:size-6">
            <Check />
          </Plate>
          <h3 className="mb-1 text-lg font-semibold">{t("createdTitle", creation.serverName)}</h3>
          <p className="text-muted-foreground">{autostart ? t("starting") : t("ready")}</p>
        </div>
      ) : (
        <>
          <ol>
            {stages.map((stage) => {
              const look = STAGE_LOOK[stage.key];
              const Icon = stage.state === "done" ? Check : stage.state === "active" ? Loader : stage.state === "error" ? AlertTriangle : look.icon;
              const pct = Math.round(stage.progress * 100);
              return (
                <li
                  key={stage.key}
                  className={cn(
                    "grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 py-2.5 not-first:border-t not-first:border-border",
                    stage.state === "pending" && "opacity-50"
                  )}
                >
                  <Plate tone={stage.state === "done" ? "green" : stage.state === "error" ? "red" : look.tone} size="sm">
                    <Icon className={cn(stage.state === "active" && "animate-spin")} />
                  </Plate>
                  <div className="min-w-0">
                    <b className="block text-[13.5px] font-medium">{t(`stages.${stage.key}`)}</b>
                    <span className="block truncate text-xs text-muted-foreground">
                      {stage.state === "done" ? t("done") : stage.state === "pending" ? t("pending") : messages.at(-1)}
                    </span>
                    {stage.state === "active" && <Meter value={pct} tone="primary" className="mt-1.5" aria-label={t(`stages.${stage.key}`)} />}
                  </div>
                  <span className="text-[12.5px] text-muted-foreground tabular-nums">{stage.state === "pending" ? "" : `${pct}%`}</span>
                </li>
              );
            })}
          </ol>

          {failed && creation.error ? (
            <p className="mt-3 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-danger">
              <b className="mb-0.5 block font-semibold">{t("failedTitle")}</b>
              {creation.error}
            </p>
          ) : (
            <div className="mt-4 mb-3 flex items-center gap-3">
              <span>{t("overall")}</span>
              <Meter value={overall} tone="primary" size="md" className="flex-1" aria-label={t("overall")} />
              <b className="tabular-nums">{overall}%</b>
            </div>
          )}

          <div
            ref={log}
            className="h-[140px] scrollbar-thin overflow-auto rounded-md border border-border bg-code p-3 font-mono text-[11.5px] leading-relaxed text-muted-foreground"
          >
            {messages.map((line, i) => (
              <div key={i}>
                <span className={i < messages.length - 1 ? "text-success" : "text-primary"}>{i < messages.length - 1 ? "✓" : "▶"}</span> {line}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

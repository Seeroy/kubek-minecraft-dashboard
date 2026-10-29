"use client";
import { api } from "@/api";
import { useServerStore } from "@/modules/server/contexts/server-context";
import { resolveServerStatus, useAllServerStatuses } from "@/modules/server/store/server-statuses.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { StatusDot } from "@/shared/ui/status-dot";
import { useMutation } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { useState } from "react";

/** Running servers that still read old configs, with a way to restart them */
export function RestartPrompt({ serverIds }: { serverIds: string[] }) {
  const { t } = useTranslation("modules.networks.apply");
  const { servers } = useServerStore();
  const statuses = useAllServerStatuses();
  const [restarted, setRestarted] = useState<string[]>([]);
  const restart = useMutation({
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => api.servers.restart(id))),
    onSuccess: (_, ids) => setRestarted((prev) => [...prev, ...ids]),
  });

  const pending = serverIds.filter((id) => !restarted.includes(id));
  if (serverIds.length === 0) return null;

  return (
    <Alert>
      <RotateCw />
      <AlertTitle>{t("restartTitle")}</AlertTitle>
      <AlertDescription className="grid gap-2">
        <span>{t("restartText")}</span>
        <ul className="grid gap-1">
          {serverIds.map((id) => {
            const server = servers.find((s) => s.id === id);
            const status = server && resolveServerStatus(statuses[id], server.status);
            const done = restarted.includes(id);
            return (
              <li key={id} className="flex items-center gap-2 text-foreground">
                {status && <StatusDot status={status} />}
                <span className="min-w-0 flex-1 truncate">{server?.name ?? id}</span>
                {done ? (
                  <span className="text-xs text-muted-foreground">{t("restarted")}</span>
                ) : (
                  <Button size="xs" variant="outline" disabled={restart.isPending} onClick={() => restart.mutate([id])}>
                    {t("restart")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        {pending.length > 1 && (
          <Button size="sm" className="justify-self-start" disabled={restart.isPending} onClick={() => restart.mutate(pending)}>
            <RotateCw />
            {t("restartAll")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

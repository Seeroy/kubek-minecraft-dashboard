"use client";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useServerStore } from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { SettingsGroup } from "@/shared/ui/settings";
import { Plate } from "@/shared/ui/plate";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AlertTriangle, Check, CircleHelp, Coffee, Server } from "lucide-react";
import { api } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { javaTone, type ServerJava } from "../lib/java";

// Server settings remember their last tab under this key, opening it on Java saves a click

type Compatibility = { state: "ok" | "unknown" } | { state: "mismatch"; required: number };

const gameVersionOf = ({ server }: ServerJava) => (server.variables?.GAME_VERSION != null ? String(server.variables.GAME_VERSION) : undefined);

/** Compatible unless the game version asks for a newer Java than the server runs */
function useCompatibility(usage: ServerJava[]) {
  const versions = [...new Set(usage.map(gameVersionOf).filter((v): v is string => !!v))];
  const required = useQueries({
    queries: versions.map((version) => ({
      queryKey: qk.java.forGame(version),
      queryFn: () => api.java.getJavaVersionForGame(version),
      staleTime: Infinity,
      retry: false,
    })),
  });
  const byVersion = new Map(versions.map((version, i) => [version, required[i]?.data]));

  return (item: ServerJava): Compatibility => {
    const need = item.kind === "system" ? undefined : byVersion.get(gameVersionOf(item) ?? "");
    if (typeof need !== "number" || item.major == null) return { state: "unknown" };
    return item.major >= need ? { state: "ok" } : { state: "mismatch", required: need };
  };
}

const COMPAT_STYLE = {
  ok: { icon: Check, className: "text-success" },
  mismatch: { icon: AlertTriangle, className: "text-warn" },
  unknown: { icon: CircleHelp, className: "text-muted-foreground" },
} as const;

interface UsageRowProps {
  item: ServerJava;
  compat: Compatibility;
  showActions: boolean;
  onChange: () => void;
}

function UsageRow({ item, compat, showActions, onChange }: UsageRowProps) {
  const { t } = useTranslation("modules.javaManager.usage");
  const blueprint = useBlueprint(item.server.blueprintId);
  const core = [blueprint?.shortName ?? blueprint?.name, item.server.variables?.GAME_VERSION].filter(Boolean).join(" ");
  const { icon: CompatIcon, className: compatClass } = COMPAT_STYLE[compat.state];

  return (
    <TableRow className="h-14">
      <TableCell>
        <span className="flex min-w-0 items-center gap-2.5">
          <ServerAvatar serverId={item.server.id} name={item.server.name} className="size-7 rounded-md" />
          <span className="min-w-0">
            <b className="block truncate font-semibold">{item.server.name}</b>
            {core && <small className="block truncate text-xs text-muted-foreground">{core}</small>}
          </span>
        </span>
      </TableCell>
      <TableCell className="hidden @xl/table:table-cell">
        {item.kind === "system" ? (
          <span className="text-muted-foreground">{t("systemJava")}</span>
        ) : (
          <span className="flex min-w-0 items-center gap-2">
            <Plate tone={javaTone(item.major)} size="sm" className="text-xs font-bold">
              {item.major ?? "?"}
            </Plate>
            <span className="truncate" title={item.path}>
              {item.kind === "custom" ? item.path : `Java ${item.major}`}
            </span>
          </span>
        )}
      </TableCell>
      <TableCell className="hidden @2xl/table:table-cell">
        <Badge variant={item.kind === "system" ? "secondary" : "info"}>{t(`kinds.${item.kind}`)}</Badge>
      </TableCell>
      <TableCell>
        <span className={cn("flex min-w-0 items-center gap-1.5", compatClass)}>
          <CompatIcon className="size-3.5 shrink-0" />
          <span className={cn("truncate", compat.state !== "unknown" && "text-foreground")}>
            {compat.state === "mismatch" ? t("needs", compat.required) : t(compat.state)}
          </span>
        </span>
      </TableCell>
      {showActions && (
        <TableCell className="text-right">
          {compat.state === "mismatch" && (
            <Button size="sm" variant="outline" onClick={onChange}>
              {t("change")}
            </Button>
          )}
        </TableCell>
      )}
    </TableRow>
  );
}

export function UsageTab({ usage }: { usage: ServerJava[] }) {
  const { t } = useTranslation("modules.javaManager.usage");
  const router = useRouter();
  const { selectServer } = useServerStore();
  const compatibility = useCompatibility(usage);
  const rows = usage.map((item) => ({ item, compat: compatibility(item) }));
  const attention = rows.filter((row) => row.compat.state === "mismatch").length;

  const openSettings = (serverId: string) => {
    selectServer(serverId);
    router.push("/server-settings/java");
  };

  return (
    <SettingsGroup
      tone="orange"
      icon={Server}
      title={
        <span className="flex flex-wrap items-center gap-2">
          {t("title")}
          {attention > 0 && <Badge variant="warning">{t("attention", attention)}</Badge>}
        </span>
      }
      description={t("description")}
      className="mb-0"
      flush
    >
      {usage.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Coffee />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t("headers.server")}</TableHead>
              <TableHead className="hidden w-56 @xl/table:table-cell">{t("headers.java")}</TableHead>
              <TableHead className="hidden w-32 @2xl/table:table-cell">{t("headers.kind")}</TableHead>
              <TableHead className="w-32 @md/table:w-40">{t("headers.compatibility")}</TableHead>
              {attention > 0 && <TableHead className="w-28" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ item, compat }) => (
              <UsageRow
                key={item.server.id}
                item={item}
                compat={compat}
                showActions={attention > 0}
                onChange={() => openSettings(item.server.id)}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </SettingsGroup>
  );
}

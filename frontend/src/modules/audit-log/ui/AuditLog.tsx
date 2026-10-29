"use client";
import { useServerStore } from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { PageHeader } from "@/shared/ui/page-header";
import { Panel } from "@/shared/ui/panel";
import { Plate } from "@/shared/ui/plate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import type { Tone } from "@/shared/ui/tone";
import { AuditAction, AuditCategory, AuditResult, type AuditLogQuery } from "@shared/types/audit.types";
import { AccessArea } from "@shared/access/areas";
import { AlertTriangle, Archive, LogIn, ScrollText, Search, Server, X, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuditLogsQuery } from "../api/audit-log.queries";
import { AuditTable } from "./AuditTable";
import { AUDIT_TABS, type AuditTab } from "../lib/tabs";
import { RetentionPanel } from "./RetentionPanel";

const PAGE_SIZE = 25;
const ALL = "all";
const DAY_MS = 86_400_000;

const PERIODS = ["today", "week", "month", "all"] as const;
type Period = (typeof PERIODS)[number];

/** Start of the period in ms, computed once per change so the query key stays stable */
function periodStart(period: Period) {
  if (period === "all") return undefined;
  if (period === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.getTime();
  }
  return Date.now() - (period === "week" ? 7 : 30) * DAY_MS;
}

function StatCell({ icon: Icon, tone, value, label }: { icon: LucideIcon; tone: Tone; value: number | undefined; label: string }) {
  return (
    <div className="flex items-center gap-3 bg-card px-4 py-3">
      <Plate tone={tone}>
        <Icon />
      </Plate>
      <div className="min-w-0">
        <b className="block text-[20px] leading-tight font-semibold tracking-[-0.01em] tabular-nums">{value ?? "—"}</b>
        <small className="block truncate text-xs text-muted-foreground">{label}</small>
      </div>
    </div>
  );
}

/** Period totals, each one a single row query that only reads the count */
function Stats({ from }: { from: number | undefined }) {
  const { t } = useTranslation("modules.auditLog.stats");
  const count = (filters: AuditLogQuery) => ({ ...filters, from, limit: 1 });
  const events = useAuditLogsQuery(count({})).data?.total;
  const server = useAuditLogsQuery(count({ category: AuditCategory.SERVER })).data?.total;
  const logins = useAuditLogsQuery(count({ action: AuditAction.AUTH_LOGIN })).data?.total;
  const failed = useAuditLogsQuery(count({ result: AuditResult.FAILED })).data?.total;

  return (
    <Panel className="grid gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-cols-4">
      <StatCell icon={ScrollText} tone="blue" value={events} label={t("events", events ?? 0)} />
      <StatCell icon={Server} tone="green" value={server} label={t("server", server ?? 0)} />
      <StatCell icon={LogIn} tone="purple" value={logins} label={t("logins", logins ?? 0)} />
      <StatCell icon={AlertTriangle} tone={failed ? "red" : "gray"} value={failed} label={t("failed", failed ?? 0)} />
    </Panel>
  );
}

function ServerFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation("modules.auditLog.filters");
  const { servers } = useServerStore();
  const name = (id: string) => (id === ALL ? t("allServers") : (servers.find((s) => s.id === id)?.name ?? id));
  return (
    <Select<string> value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="w-44" aria-label={t("server")}>
        <SelectValue>{name}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t("allServers")}</SelectItem>
        {servers.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            <ServerAvatar serverId={s.id} name={s.name} className="size-4 rounded-[4px]" />
            <span className="truncate">{s.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AuditLog() {
  const { t } = useTranslation("modules.auditLog");
  // Rotation removes history, so its tab needs audit manage
  const canRotate = useAuthStore((s) => s.can(AccessArea.AUDIT, "manage"));
  const [routeTab, changeTab] = useRouteTab("/audit-log", AUDIT_TABS, "log");
  const tab = canRotate ? routeTab : "log";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);
  const [server, setServer] = useState<string>(ALL);
  const [result, setResult] = useState<string>(ALL);
  const [period, setPeriod] = useState<{ id: Period; from: number | undefined }>(() => ({ id: "week", from: periodStart("week") }));
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  // Any filter change goes back to the first page
  const filtered =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(0);
    };

  const filters = useMemo<AuditLogQuery>(
    () => ({
      search: debouncedSearch || undefined,
      category: category === ALL ? undefined : (category as AuditCategory),
      serverId: server === ALL ? undefined : server,
      result: result === ALL ? undefined : (result as AuditResult),
      from: period.from,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    }),
    [debouncedSearch, category, server, result, period.from, page]
  );
  const query = useAuditLogsQuery(filters);
  const dirty = !!search || category !== ALL || server !== ALL || result !== ALL || period.id !== "week";

  const reset = () => {
    setSearch("");
    setCategory(ALL);
    setServer(ALL);
    setResult(ALL);
    setPeriod({ id: "week", from: periodStart("week") });
    setPage(0);
  };

  return (
    <div className="grid stagger-enter gap-4">
      <PageHeader title={t("title")} description={t("description")} className="mb-1" />
      <Tabs value={tab} onValueChange={(value) => changeTab(value as AuditTab)} className="gap-4">
        {canRotate && (
          <TabsList>
            <TabsTrigger value="log">
              <ScrollText />
              {t("tabs.log")}
            </TabsTrigger>
            <TabsTrigger value="retention">
              <Archive />
              {t("tabs.retention")}
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="log" className="grid gap-4">
          <Stats from={period.from} />

          <Panel>
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
              <InputGroup className="w-full sm:max-w-96 sm:flex-1">
                <InputGroupAddon>
                  <Search className="size-3.5" />
                </InputGroupAddon>
                <InputGroupInput value={search} onChange={(e) => filtered(setSearch)(e.target.value)} placeholder={t("filters.search")} />
              </InputGroup>
              <Select<string> value={category} onValueChange={(value) => value && filtered(setCategory)(value)}>
                <SelectTrigger className="w-44" aria-label={t("filters.category")}>
                  <SelectValue>{(value: string) => (value === ALL ? t("filters.allCategories") : t(`categories.${value}`))}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t("filters.allCategories")}</SelectItem>
                  {Object.values(AuditCategory).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`categories.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ServerFilter value={server} onChange={filtered(setServer)} />
              <ToggleGroup
                variant="segmented"
                value={[result]}
                onValueChange={(next) => next[0] && filtered(setResult)(next[0])}
                aria-label={t("filters.result")}
              >
                <Toggle variant="segmented" value={ALL}>
                  {t("filters.all")}
                </Toggle>
                <Toggle variant="segmented" value={AuditResult.SUCCESS}>
                  {t("results.success")}
                </Toggle>
                <Toggle variant="segmented" value={AuditResult.FAILED}>
                  {t("results.failed")}
                </Toggle>
              </ToggleGroup>
              <ToggleGroup
                variant="segmented"
                value={[period.id]}
                onValueChange={(next) => next[0] && filtered(setPeriod)({ id: next[0] as Period, from: periodStart(next[0] as Period) })}
                aria-label={t("filters.period")}
              >
                {PERIODS.map((id) => (
                  <Toggle key={id} variant="segmented" value={id}>
                    {t(`filters.periods.${id}`)}
                  </Toggle>
                ))}
              </ToggleGroup>
              {dirty && (
                <Button variant="ghost" onClick={reset}>
                  <X />
                  {t("filters.reset")}
                </Button>
              )}
            </div>

            <AuditTable
              items={query.data?.items ?? []}
              total={query.data?.total ?? 0}
              loading={query.isLoading}
              page={page}
              pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </Panel>
        </TabsContent>
        {canRotate && (
          <TabsContent value="retention">
            <RetentionPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

"use client";
import type { AuditLogEntry } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import type { AuditChange } from "@shared/types/audit.types";
import type { ReactNode } from "react";
import { useDetailLabel, useResourceLabel } from "../lib/labels";
import { AuditChanges } from "./AuditChanges";
import { ServerLine } from "./AuditTarget";
import { AuditValue } from "./AuditValue";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid content-start gap-2">
      <h4 className="label-caps">{title}</h4>
      {children}
    </section>
  );
}

function DataList({ data }: { data: Record<string, unknown> }) {
  const label = useDetailLabel();
  return (
    <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-md border border-border bg-card px-2.5 py-2 text-xs leading-relaxed">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-[12.5px] text-muted-foreground">{label(key)}</dt>
          <dd className="m-0 min-w-0 font-mono break-words">
            <AuditValue value={value} name={key} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditDetails({ entry }: { entry: AuditLogEntry }) {
  const { t } = useTranslation("modules.auditLog");
  const object = useResourceLabel()(entry);
  const changes = (entry.changes ?? []) as AuditChange[];
  // Old entries kept the server inside their data, the column shows it now
  const data = Object.fromEntries(Object.entries(entry.details ?? {}).filter(([key]) => key !== "serverId"));
  const hasData = Object.keys(data).length > 0;

  return (
    <div className="grid gap-5 border-t border-dashed border-border bg-subtle py-4 pr-4 pl-4 max-md:grid-cols-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:pl-13">
      <Section title={t("details.title")}>
        <KeyValue className="text-[12.5px] [&_dd]:text-left [&_dd]:font-normal">
          {object && <KeyValueItem label={t("details.resource")}>{object}</KeyValueItem>}
          {entry.serverId && (
            <KeyValueItem label={t("details.server")}>
              <ServerLine id={entry.serverId} name={entry.serverName} />
            </KeyValueItem>
          )}
          <KeyValueItem label={t("details.source")}>{t(`sources.${entry.source}`)}</KeyValueItem>
          <KeyValueItem label={t("details.category")}>{t(`categories.${entry.category}`)}</KeyValueItem>
          <KeyValueItem label="IP">
            <span className="font-mono">{entry.ip || "—"}</span>
          </KeyValueItem>
          <KeyValueItem label={t("details.client")}>
            <span title={entry.userAgent ?? undefined}>{entry.userAgent || "—"}</span>
          </KeyValueItem>
          <KeyValueItem label={t("details.time")}>{new Date(entry.createdAt).toLocaleString()}</KeyValueItem>
          <KeyValueItem label={t("details.id")}>
            <span className="font-mono text-muted-foreground">{entry.id}</span>
          </KeyValueItem>
        </KeyValue>
      </Section>

      <div className="grid content-start gap-4">
        {entry.error && <p className="rounded-md border border-danger/25 bg-danger/8 px-3 py-2 font-mono text-xs break-words text-danger">{entry.error}</p>}
        {changes.length > 0 && (
          <Section title={t("details.changes")}>
            <AuditChanges changes={changes} resourceType={entry.resourceType} />
          </Section>
        )}
        {hasData && (
          <Section title={t("details.data")}>
            <DataList data={data} />
          </Section>
        )}
        {!entry.error && !changes.length && !hasData && <p className="text-[12.5px] text-muted-foreground">{t("details.noData")}</p>}
      </div>
    </div>
  );
}

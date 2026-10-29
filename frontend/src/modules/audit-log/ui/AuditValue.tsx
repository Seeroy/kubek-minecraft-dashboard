"use client";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatBytes } from "@/shared/lib/bytesToGb";
import { cn } from "@/shared/lib/cn";
import { useAccessValueLabel, useDetailLabel } from "../lib/labels";

const LIST_LIMIT = 12;

// Timestamps are stored as ms epoch in fields named like createdAt or runAt
const isTimestamp = (name: string | undefined, value: unknown) => typeof value === "number" && !!name?.endsWith("At") && value > 1e11;

function BlueprintName({ id }: { id: string }) {
  return <>{useBlueprint(id)?.name ?? id}</>;
}

function Scalar({ value, name }: { value: string | number; name?: string }) {
  const accessValue = useAccessValueLabel();
  if (name === "blueprintId") return <BlueprintName id={String(value)} />;
  if (name === "size" && typeof value === "number") return <>{formatBytes(value)}</>;
  if (isTimestamp(name, value)) return <>{new Date(value).toLocaleString()}</>;
  const access = accessValue(name, String(value));
  if (access) return <>{access}</>;
  return <>{String(value)}</>;
}

/** Chips for a list, long ones are cut with a count of the rest */
export function ValueList({ items, name, tone }: { items: unknown[]; name?: string; tone?: "added" | "removed" }) {
  const { t } = useTranslation("modules.auditLog.values");
  const shown = items.slice(0, LIST_LIMIT);
  return (
    <span className="flex min-w-0 flex-wrap gap-1">
      {shown.map((item, i) => (
        <span
          key={i}
          className={cn(
            "inline-flex max-w-full items-center rounded-[5px] bg-secondary px-1.5 py-px font-sans text-[11.5px] break-all",
            tone === "added" && "bg-success/12 text-success",
            tone === "removed" && "bg-danger/12 text-danger line-through decoration-danger/50"
          )}
        >
          {tone === "added" ? "+ " : tone === "removed" ? "− " : ""}
          <AuditValue value={item} name={name} />
        </span>
      ))}
      {items.length > LIST_LIMIT && <span className="px-1 text-[11.5px] text-muted-foreground">{t("more", items.length - LIST_LIMIT)}</span>}
    </span>
  );
}

function ValueObject({ value }: { value: Record<string, unknown> }) {
  const label = useDetailLabel();
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  return (
    <span className="grid min-w-0 gap-0.5">
      {entries.map(([key, v]) => (
        <span key={key} className="flex min-w-0 gap-1.5">
          <span className="shrink-0 font-sans text-muted-foreground">{label(key)}:</span>
          <span className="min-w-0">
            <AuditValue value={v} name={key} />
          </span>
        </span>
      ))}
    </span>
  );
}

/** One logged value as text, never as raw JSON */
export function AuditValue({ value, name }: { value: unknown; name?: string }) {
  const { t } = useTranslation("modules.auditLog.values");
  if (value == null || value === "") return <span className="text-muted-foreground">{t("empty")}</span>;
  if (typeof value === "boolean") return <>{value ? t("on") : t("off")}</>;
  if (Array.isArray(value)) return value.length ? <ValueList items={value} name={name} /> : <span className="text-muted-foreground">{t("empty")}</span>;
  if (typeof value === "object") return <ValueObject value={value as Record<string, unknown>} />;
  return <Scalar value={value as string | number} name={name} />;
}

"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import type { AuditChange } from "@shared/types/audit.types";
import { ArrowRight, KeyRound } from "lucide-react";
import { useFieldLabel } from "../lib/labels";
import { AuditValue, ValueList } from "./AuditValue";

const leaf = (field: string) => field.slice(field.lastIndexOf(".") + 1);

const key = (item: unknown) => JSON.stringify(item);

// A list edit reads best as what was added and removed, a reorder keeps both sides
function listDelta(from: unknown[], to: unknown[]) {
  const before = new Set(from.map(key));
  const after = new Set(to.map(key));
  return { added: to.filter((item) => !before.has(key(item))), removed: from.filter((item) => !after.has(key(item))) };
}

function ChangeValues({ change }: { change: AuditChange }) {
  const { t } = useTranslation("modules.auditLog.details");
  const name = leaf(change.field);

  if (change.secret) {
    return (
      <Badge variant="warning" className="col-span-3">
        <KeyRound />
        {t("secretChanged")}
      </Badge>
    );
  }

  const from = Array.isArray(change.from) ? change.from : change.from == null ? [] : null;
  const to = Array.isArray(change.to) ? change.to : change.to == null ? [] : null;
  if (from && to && (Array.isArray(change.from) || Array.isArray(change.to))) {
    const { added, removed } = listDelta(from, to);
    if (added.length || removed.length) {
      return (
        <span className="col-span-3 flex min-w-0 flex-wrap gap-1">
          {removed.length > 0 && <ValueList items={removed} name={name} tone="removed" />}
          {added.length > 0 && <ValueList items={added} name={name} tone="added" />}
        </span>
      );
    }
  }

  return (
    <>
      <span className="min-w-0 break-words text-muted-foreground">
        <AuditValue value={change.from} name={name} />
      </span>
      <ArrowRight className="mt-0.5 size-3.5 text-muted-foreground" aria-hidden />
      <span className="min-w-0 break-words">
        <AuditValue value={change.to} name={name} />
      </span>
    </>
  );
}

/** Field by field diff of an edit, secrets only say that they changed */
export function AuditChanges({ changes, resourceType }: { changes: AuditChange[]; resourceType?: string | null }) {
  const label = useFieldLabel(resourceType);
  return (
    <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-card text-xs leading-relaxed">
      {changes.map((change) => {
        const name = label(change.field, change.label);
        return (
          <div
            key={change.field}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-2 gap-y-1 px-2.5 py-1.5 font-mono max-sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
          >
            <span
              className={cn("min-w-0 text-[12.5px] break-words text-foreground max-sm:col-span-3", name ? "font-sans" : "font-mono text-xs")}
              title={change.field}
            >
              {name ?? change.field}
            </span>
            <ChangeValues change={change} />
          </div>
        );
      })}
    </div>
  );
}

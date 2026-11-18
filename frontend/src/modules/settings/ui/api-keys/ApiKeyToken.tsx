"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { API_URL } from "@/shared/lib/http/api-url";
import { CopyButton } from "@/shared/ui/CopyButton";
import { AlertTriangle } from "lucide-react";

export function apiUrl(path: string): string {
  return new URL(`${API_URL}/${path}`, window.location.origin).href;
}

function Snippet({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-[12.5px] font-medium text-muted-foreground">{label}</span>
      <div className="relative min-w-0">
        <pre className="rounded-md border border-border bg-subtle py-2.5 pr-10 pl-3 font-mono text-[12px] leading-relaxed break-all whitespace-pre-wrap">{value}</pre>
        <CopyButton value={value} className="absolute top-1.5 right-1.5" />
      </div>
    </div>
  );
}

/** The secret right after creation, with ready to paste examples */
export function ApiKeyToken({ token, mcp }: { token: string; mcp: boolean }) {
  const { t } = useTranslation("modules.settings.apiKeys.token");
  const mcpUrl = apiUrl("mcp");
  const curl = `curl -H "Authorization: Bearer ${token}" ${apiUrl("servers")}`;
  const claude = `claude mcp add --transport http kubek ${mcpUrl} --header "Authorization: Bearer ${token}"`;
  const config = JSON.stringify({ mcpServers: { kubek: { type: "http", url: mcpUrl, headers: { Authorization: `Bearer ${token}` } } } }, null, 2);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="flex items-start gap-2 rounded-md border border-warn/25 bg-warn/9 px-3 py-2 text-[12.5px] text-[color-mix(in_oklch,var(--warn),var(--foreground)_30%)]">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        {t("once")}
      </p>
      <Snippet label={t("key")} value={token} />
      <Snippet label={t("curl")} value={curl} />
      {mcp && (
        <>
          <Snippet label={t("claudeCode")} value={claude} />
          <Snippet label={t("mcpConfig")} value={config} />
        </>
      )}
    </div>
  );
}

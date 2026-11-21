"use client";

import type { ApiKey } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useStreamerMask } from "@/shared/hooks/useStreamerMode";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { confirmDialog } from "@/shared/modals";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { CopyButton } from "@/shared/ui/CopyButton";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Plate } from "@/shared/ui/plate";
import { Private } from "@/shared/ui/private";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Switch } from "@/shared/ui/switch";
import { AccessArea } from "@shared/access/areas";
import { BookOpen, Bot, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApiKeys, useDeleteApiKeyMutation, useMcpSettings, useSetMcpMutation } from "../api/api-keys.queries";
import { toAccessMap } from "../data/access-areas";
import { SAMPLE_API_KEYS } from "../data/samples";
import { useAccessErrorMessage } from "../lib/access-errors";
import { API_KEY_FORM_MODAL_ID } from "../modals";
import { AccessSummary } from "./access/AccessSummary";
import { apiUrl } from "./api-keys/ApiKeyToken";

const API_DOCS_URL = "https://rest.wiki/?https://raw.githubusercontent.com/Seeroy/kubek-minecraft-dashboard/refs/heads/main/openapi.json";

function McpSettingsGroup() {
  const { t } = useTranslation("modules.settings.apiKeys.mcp");
  const { notify } = useNotifications();
  const canToggle = useAuthStore((s) => s.can(AccessArea.PANEL, "manage"));
  const settings = useMcpSettings();
  const toggle = useSetMcpMutation();
  const enabled = !!settings.data?.enabled;
  const url = apiUrl("mcp");

  const change = (next: boolean) =>
    toggle.mutate(next, { onSuccess: () => notify({ type: "success", title: next ? t("toasts.enabled") : t("toasts.disabled") }) });

  return (
    <SettingsGroup tone="purple" icon={Bot} title={t("title")} description={t("description")}>
      <SettingsField inline label={t("enabled")} hint={canToggle ? t("enabledHint") : t("adminOnly")}>
        <Switch checked={enabled} disabled={!canToggle || settings.isLoading || toggle.isPending} onCheckedChange={change} aria-label={t("enabled")} />
      </SettingsField>
      <SettingsField wide label={t("url")} hint={t("urlHint")}>
        <div className="flex min-w-0 items-center gap-1 rounded-md border border-border bg-subtle py-1 pr-1 pl-3">
          <code data-private="basic" className="min-w-0 flex-1 truncate font-mono text-[12.5px]">{url}</code>
          <CopyButton value={url} />
        </div>
      </SettingsField>
    </SettingsGroup>
  );
}

export default function ApiKeysTab() {
  const { t } = useTranslation("modules.settings.apiKeys");
  const { t: tc } = useTranslation("modules.components");
  const { notify } = useNotifications();
  const { openModal } = useModal();
  const userId = useAuthStore((s) => s.user?.id);
  const canManage = useAuthStore((s) => s.can(AccessArea.API, "manage"));
  const [showAll, setShowAll] = useState(false);
  const scope = canManage && showAll ? "all" : "own";
  const keys = useApiKeys(scope);
  const remove = useDeleteApiKeyMutation();
  const errorMessage = useAccessErrorMessage();
  const list = keys.data ?? [];
  const relative = (timestamp: number) => formatRelative(timestamp, tc("justNow"));
  const mask = useStreamerMask();

  const confirmRemove = async (key: ApiKey) => {
    const ok = await confirmDialog({
      title: t("confirmDelete.title", key.name),
      description: t("confirmDelete.description"),
      confirmText: t("confirmDelete.confirm"),
      cancelText: t("confirmDelete.cancel"),
      variant: "destructive",
      icon: Trash2,
    });
    if (!ok) return;
    remove.mutate(key.id, {
      onSuccess: () => notify({ type: "success", title: t("toasts.deleted") }),
      onError: (err) => notify({ type: "error", title: errorMessage(err) }),
    });
  };

  const usage = (key: ApiKey) =>
    key.lastUsedAt ? t("lastUsed", relative(key.lastUsedAt), key.lastUsedIp ? mask.value(key.lastUsedIp) : t("unknownIp")) : t("neverUsed");

  return (
    <>
      <SettingsGroup tone="amber" icon={KeyRound} title={t("title")} description={t("description")} flush>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <span className="text-xs text-muted-foreground tabular-nums">{t("count", list.length)}</span>
          {canManage && (
            <label className="ml-2 flex cursor-pointer items-center gap-2 text-[12.5px] font-medium">
              <Switch checked={showAll} onCheckedChange={setShowAll} />
              {t("showAll")}
            </label>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            nativeButton={false}
            render={<a href={API_DOCS_URL} target="_blank" rel="noreferrer noopener" />}
          >
            <BookOpen />
            {t("docs")}
          </Button>
          <Button size="sm" onClick={() => openModal(API_KEY_FORM_MODAL_ID, {})}>
            <Plus />
            {t("add")}
          </Button>
        </div>

        {!keys.isLoading && list.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted-foreground">{t("empty")}</p>
        ) : (
          <DataReveal id={`settings-api-keys-${scope}`} data={list} loading={keys.isLoading} sample={SAMPLE_API_KEYS}>
            {(rows) => (
              <div className="divide-y divide-border">
                {rows.map((key: ApiKey) => {
                  const own = key.userId === userId;
                  const expired = key.expiresAt !== null && key.expiresAt <= Date.now();
                  return (
                    <div key={key.id} className="flex items-start gap-3 px-4 py-3">
                      <Plate tone={expired ? "gray" : "amber"}>
                        <KeyRound />
                      </Plate>
                      <div className="grid min-w-0 flex-1 gap-1.5">
                        <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13.5px] font-medium">
                          <span className="truncate">{key.name}</span>
                          <code className="font-mono text-[11.5px] text-muted-foreground">
                            <Private level="secret">{key.prefix}</Private>...
                          </code>
                          {key.mcp && <Badge variant="info">MCP</Badge>}
                          {key.servers && <Badge variant="secondary">{t("serversCount", key.servers.length)}</Badge>}
                          {expired ? (
                            <Badge variant="destructive">{t("expired")}</Badge>
                          ) : (
                            key.expiresAt && <Badge variant="warning">{t("expires", new Date(key.expiresAt).toLocaleDateString())}</Badge>
                          )}
                          {scope === "all" && key.username && <Badge variant="outline">{key.username}</Badge>}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {usage(key)} · {t("created", relative(key.createdAt))}
                        </div>
                        <AccessSummary roles={[]} grants={toAccessMap(key.grants)} ext={[]} />
                      </div>
                      <div className="flex shrink-0 gap-0.5">
                        {own && (
                          <Button variant="ghost" size="sm" onClick={() => openModal(API_KEY_FORM_MODAL_ID, { apiKey: key })}>
                            <Pencil />
                            {t("edit")}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="hover:bg-danger/10 hover:text-danger"
                          title={t("delete")}
                          aria-label={t("delete")}
                          disabled={remove.isPending}
                          onClick={() => void confirmRemove(key)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DataReveal>
        )}
      </SettingsGroup>

      <McpSettingsGroup />
    </>
  );
}

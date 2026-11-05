"use client";

import type { CompanionMaintenance } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { AccessArea } from "@shared/access/areas";
import { Construction, Crown, DoorClosed, MessageSquareText, Server, UserCheck } from "lucide-react";
import { useState } from "react";
import { useCompanionMaintenanceMutation } from "../../api/companion.queries";

// One name or UUID per line, commas work too
const parseAllow = (raw: string) => [...new Set(raw.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean))];

interface MaintenanceGroupProps {
  serverId: string;
  current: CompanionMaintenance | null;
  /** Plugin isn't talking right now, the setting waits for it */
  offline: boolean;
}

/** Maintenance mode form, saved on the panel and pushed to the plugin */
export function MaintenanceGroup({ serverId, current, offline }: MaintenanceGroupProps) {
  const { t } = useTranslation("modules.companion.maintenance");
  const { notify } = useNotifications();
  const mutation = useCompanionMaintenanceMutation(serverId);
  const canEdit = useAccess([AccessArea.PLAYERS, "manage"], serverId);
  const [enabled, setEnabled] = useState(current?.enabled ?? false);
  const [message, setMessage] = useState(current?.message ?? t("defaultMessage"));
  const [motd, setMotd] = useState(current?.motd ?? "");
  const [allow, setAllow] = useState(current?.allow.join("\n") ?? "");
  const [allowOps, setAllowOps] = useState(current?.allowOps ?? true);
  const [kickOnline, setKickOnline] = useState(true);

  const save = async () => {
    try {
      await mutation.mutateAsync({
        enabled,
        message: message.trim() || undefined,
        motd: motd.trim() || undefined,
        allow: parseAllow(allow),
        allowOps,
        // Turning it on kicks the rest only when asked to
        kickOnline: enabled && !current?.enabled && kickOnline,
      });
      notify({ type: "success", title: enabled ? t("enabled") : t("disabled"), message: offline ? t("offlineNote") : undefined });
    } catch (error) {
      notify({ type: "error", title: t("failed"), message: getApiErrorMessage(error) });
    }
  };

  return (
    <SettingsGroup tone="amber" icon={Construction} title={t("title")} description={t("description")} note={offline ? t("offlineNote") : undefined}>
      <fieldset disabled={!canEdit} className="contents">
        <SettingsField inline label={t("enable")} icon={Construction} hint={current?.enabled ? t("isOn") : undefined}>
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={t("enable")} />
        </SettingsField>
        <SettingsField label={t("message")} icon={MessageSquareText} hint={t("colors")} htmlFor="maintenance-message">
          <Input id="maintenance-message" maxLength={256} value={message} onChange={(e) => setMessage(e.target.value)} />
        </SettingsField>
        <SettingsField label={t("motd")} icon={Server} hint={t("motdHint")} htmlFor="maintenance-motd">
          <Input id="maintenance-motd" maxLength={256} placeholder={t("motdPlaceholder")} value={motd} onChange={(e) => setMotd(e.target.value)} />
        </SettingsField>
        <SettingsField wide label={t("allow")} icon={UserCheck} hint={t("allowHint")} htmlFor="maintenance-allow">
          <Textarea id="maintenance-allow" rows={3} className="font-mono text-xs" value={allow} onChange={(e) => setAllow(e.target.value)} />
        </SettingsField>
        <SettingsField inline label={t("allowOps")} icon={Crown}>
          <Switch checked={allowOps} onCheckedChange={setAllowOps} aria-label={t("allowOps")} />
        </SettingsField>
        {enabled && !current?.enabled && (
          <SettingsField inline label={t("kickOnline")} icon={DoorClosed} hint={t("kickOnlineHint")}>
            <Switch checked={kickOnline} onCheckedChange={setKickOnline} aria-label={t("kickOnline")} />
          </SettingsField>
        )}
        {canEdit && (
          <div className="col-span-full flex justify-end">
            <Button disabled={mutation.isPending} onClick={() => void save()}>
              {mutation.isPending && <Spinner />}
              {t("save")}
            </Button>
          </div>
        )}
      </fieldset>
    </SettingsGroup>
  );
}

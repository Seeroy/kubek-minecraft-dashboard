"use client";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Plate } from "@/shared/ui/plate";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { NotificationCategory, NotificationChannel, type NotificationPrefs } from "@shared/types/notification.types";
import { Bell } from "lucide-react";
import { useState } from "react";
import { useNotificationPrefsQuery, useUpdateNotificationPrefsMutation } from "../api/inbox.queries";
import { INBOX_TOAST_LEVELS, setInboxToastLevel, useInboxToastLevel, type InboxToastLevel } from "../lib/toast-level";

const CATEGORIES = Object.values(NotificationCategory);
const CHANNELS = Object.values(NotificationChannel);

export default function NotificationPrefsDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation("modules.inbox.prefs");
  const { notify } = useNotifications();
  const saved = useNotificationPrefsQuery();
  const update = useUpdateNotificationPrefsMutation();
  const [draft, setDraft] = useState<NotificationPrefs | null>(null);
  const savedLevel = useInboxToastLevel();
  const [levelDraft, setLevelDraft] = useState<InboxToastLevel | null>(null);
  const level = levelDraft ?? savedLevel;
  const prefs = draft ?? saved.data;
  const prefsDirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved.data);
  const dirty = prefsDirty || level !== savedLevel;

  const toggle = (category: NotificationCategory, channel: NotificationChannel, enabled: boolean) => {
    if (!prefs) return;
    setDraft({ ...prefs, [category]: { ...prefs[category], [channel]: enabled } });
  };

  const done = () => {
    notify({ type: "success", title: t("saved") });
    onClose();
  };

  const save = () => {
    // Toast level is saved in the browser, only the channels go to the server
    if (level !== savedLevel) setInboxToastLevel(level);
    if (draft && prefsDirty) update.mutate(draft, { onSuccess: done });
    else done();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !update.isPending && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="amber">
            <Bell />
          </Plate>
          <div>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="grid gap-3">
          <div className="flex items-center gap-4 pr-1" aria-hidden>
            <span className="flex-1" />
            {CHANNELS.map((channel) => (
              <span key={channel} className="label-caps w-16 text-center">
                {t(channel)}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {CATEGORIES.map((category) => (
              <li key={category} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-medium">{t(`categories.${category}.title`)}</div>
                  <div className="text-[12.5px] text-muted-foreground">{t(`categories.${category}.description`)}</div>
                </div>
                {CHANNELS.map((channel) => (
                  <div key={channel} className="grid w-16 shrink-0 place-items-center">
                    {prefs ? (
                      <Switch
                        checked={prefs[category][channel]}
                        onCheckedChange={(enabled) => toggle(category, channel, enabled)}
                        aria-label={`${t(`categories.${category}.title`)}: ${t(channel)}`}
                      />
                    ) : (
                      <Skeleton className="h-5 w-9 rounded-full" />
                    )}
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <p className="text-[12px] text-muted-foreground">{t("telegramUnlinked")}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-lg border border-border px-4 py-3">
            <div className="min-w-0 flex-1 basis-56">
              <div className="text-[13.5px] font-medium">{t("toasts.title")}</div>
              <div className="text-[12.5px] text-muted-foreground">{t("toasts.description")}</div>
            </div>
            <ToggleGroup
              variant="segmented"
              aria-label={t("toasts.label")}
              value={[level]}
              onValueChange={(next) => next[0] && setLevelDraft(next[0] as InboxToastLevel)}
            >
              {INBOX_TOAST_LEVELS.map((key) => (
                <Toggle key={key} variant="segmented" value={key}>
                  {t(`toasts.levels.${key}`)}
                </Toggle>
              ))}
            </ToggleGroup>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending && <Spinner />}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

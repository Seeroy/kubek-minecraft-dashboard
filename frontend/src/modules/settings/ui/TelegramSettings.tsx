"use client";

import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { FieldError } from "@/shared/ui/field";
import { Plate } from "@/shared/ui/plate";
import { revealConfigSecret, useMainConfig } from "@/shared/queries";
import { PlayerHead } from "@/shared/ui/player-head";
import { SecretInput } from "@/shared/ui/secret-input";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { AlertTriangle, Bell, Check, Info, KeyRound, Link2, Send, Trash2, Users } from "lucide-react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useBotAvatarQuery, useBotInfoQuery, useLinkedUsersQuery, useUnlinkUserMutation } from "../api/telegram.queries";
import type { MainConfigFormData } from "../validations/schema";
import { OtpLinking } from "./telegram/OtpLinking";

const dateFormat = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });

function BotInfo({ tokenSaved }: { tokenSaved: boolean }) {
  const { t } = useTranslation("modules.settings.telegram.bot");
  // The backend checks the saved token, so the readout follows the stored config
  const info = useBotInfoQuery(tokenSaved);
  const avatar = useBotAvatarQuery(info.data?.id, !!info.data?.hasAvatar);
  const box = "flex min-h-ctl items-center gap-3 rounded-md border border-dashed border-border bg-subtle px-3 py-2";

  if (!tokenSaved) return <div className={cn(box, "text-[12.5px] text-muted-foreground")}>{t("noToken")}</div>;
  if (info.isLoading)
    return (
      <div className={cn(box, "text-[12.5px] text-muted-foreground")}>
        <Spinner />
        {t("validating")}
      </div>
    );
  if (info.isError || info.data?.error)
    return (
      <div className={box}>
        <Plate tone="red" size="sm">
          <AlertTriangle />
        </Plate>
        <span className="text-[13px] text-danger">{t("invalid")}</span>
      </div>
    );
  return (
    <div className={box}>
      {avatar.data ? (
        // Blob URL, next/image adds nothing here
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar.data} alt={info.data?.name ?? ""} className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <Plate tone="green" size="sm">
          <Check />
        </Plate>
      )}
      <span className="min-w-0">
        <a
          href={`https://t.me/${info.data?.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-[13px] font-semibold text-foreground underline-offset-2 hover:underline"
        >
          @{info.data?.username}
        </a>
        <span className="block truncate text-xs text-muted-foreground">
          {t("valid")} · {info.data?.name}
        </span>
      </span>
    </div>
  );
}

function LinkedUsers() {
  const { t } = useTranslation("modules.settings.telegram.users");
  const { notify } = useNotifications();
  const linked = useLinkedUsersQuery(true);
  const unlink = useUnlinkUserMutation();
  const users = linked.data ?? [];

  if (linked.isLoading) return <div className="p-4 text-[13px] text-muted-foreground">…</div>;

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Send />
          </EmptyMedia>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t("user")}</TableHead>
          <TableHead className="w-36">{t("telegramId")}</TableHead>
          <TableHead className="hidden w-28 @xl/table:table-cell">{t("linkedAt")}</TableHead>
          <TableHead className="hidden w-36 @xl/table:table-cell">{t("linkedBy")}</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map(({ telegramUser: user, accountName, accountSkinName }) => {
          const name = user.username
            ? `@${user.username}`
            : [user.firstName, user.lastName].filter(Boolean).join(" ") || t("unknown");
          return (
            <TableRow key={user.id}>
              <TableCell>
                <span className="flex min-w-0 items-center gap-2.5">
                  <PlayerHead name={accountSkinName || accountName} size={30} className="size-[30px] rounded-[7px]" />
                  <b className="truncate font-semibold">{name}</b>
                </span>
              </TableCell>
              <TableCell className="font-mono text-[12.5px]">{user.id}</TableCell>
              <TableCell className="hidden text-muted-foreground tabular-nums @xl/table:table-cell">
                {dateFormat.format(new Date(user.linkedAt))}
              </TableCell>
              <TableCell className="hidden truncate @xl/table:table-cell">{accountName}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-danger/10 hover:text-danger"
                  disabled={unlink.isPending}
                  onClick={() => unlink.mutate(user.id, { onSuccess: () => notify({ type: "success", title: t("unlinked", name) }) })}
                >
                  <Trash2 />
                  {t("remove")}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function TelegramSettings({ form }: { form: UseFormReturn<MainConfigFormData> }) {
  const { t } = useTranslation("modules.settings.telegram");
  const { t: tRoot } = useTranslation();
  const { control, register, formState, setValue } = form;
  const tokenSecret = useMainConfig().data?.secrets["telegramBot.token"];
  const { errors, dirtyFields } = formState;
  const enabled = useWatch({ control, name: "telegramBot.enabled" });
  // Bot info reflects the saved token, an unsaved edit would only show the old bot
  const tokenSaved = !!tokenSecret?.set;
  const info = useBotInfoQuery(tokenSaved);

  const revealToken = async () => {
    const value = await revealConfigSecret("telegramBot.token");
    // Not marked dirty, the same value goes back on save
    if (value) setValue("telegramBot.token", value);
    return value;
  };

  return (
    <>
      <SettingsGroup
        tone="blue"
        icon={Send}
        title={
          <span className="flex items-center gap-2">
            {t("bot.title")}
            <Badge variant="info">{t("bot.beta")}</Badge>
          </span>
        }
        description={t("bot.description")}
      >
        <SettingsField label={t("bot.enable")} icon={Bell} hint={t("bot.enableHint")} changed={!!dirtyFields.telegramBot?.enabled} inline>
          <Controller
            control={control}
            name="telegramBot.enabled"
            render={({ field }) => (
              <Switch
                checked={!!field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  void form.trigger("telegramBot");
                }}
                aria-label={t("bot.enable")}
              />
            )}
          />
        </SettingsField>

        <SettingsField label={t("bot.token")} icon={KeyRound} hint={t("bot.tokenHint")} changed={!!dirtyFields.telegramBot?.token} htmlFor="telegram-token">
          <SecretInput
            id="telegram-token"
            placeholder={t("bot.tokenPlaceholder")}
            disabled={!enabled}
            aria-invalid={!!errors.telegramBot?.token}
            secret={tokenSecret}
            onReveal={revealToken}
            {...register("telegramBot.token")}
          />
          {errors.telegramBot?.token?.message && <FieldError>{tRoot(errors.telegramBot.token.message)}</FieldError>}
        </SettingsField>

        <SettingsField label={t("bot.info")} icon={Info}>
          <BotInfo tokenSaved={tokenSaved} />
        </SettingsField>
      </SettingsGroup>

      <SettingsGroup tone="cyan" icon={Link2} title={t("linking.title")} description={t("linking.description")}>
        <OtpLinking botUsername={info.data?.error ? undefined : info.data?.username} />
      </SettingsGroup>

      <SettingsGroup tone="green" icon={Users} title={t("users.title")} description={t("users.description")} flush>
        <LinkedUsers />
      </SettingsGroup>
    </>
  );
}

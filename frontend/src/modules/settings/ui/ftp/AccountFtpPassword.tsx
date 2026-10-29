"use client";

import type { Account } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { useState } from "react";
import { useAccounts, useRemoveFtpPasswordMutation, useResetFtpPasswordMutation } from "../../api/accounts.queries";
import { FtpPasswordRevealDialog } from "./FtpPasswordDialogs";

/** FTP password of another account, reset or remove only */
export function AccountFtpPassword({ account }: { account: Account }) {
  const { t } = useTranslation("modules.settings.userForm.ftp");
  const { t: tc } = useTranslation("modules.components");
  const { notify } = useNotifications();
  // The modal has the account as it was, the list has the fresh one
  const current = useAccounts().data?.find((item) => item.id === account.id) ?? account;
  const reset = useResetFtpPasswordMutation();
  const remove = useRemoveFtpPasswordMutation();
  const [issued, setIssued] = useState<string | null>(null);
  const setAt = current.ftpPasswordSetAt ?? null;
  const busy = reset.isPending || remove.isPending;

  return (
    <section className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-semibold">
          {t("title")}
          <Badge variant={setAt ? "success" : "secondary"}>{setAt ? t("set", formatRelative(setAt, tc("justNow"))) : t("notSet")}</Badge>
        </span>
        <div className="flex gap-2">
          {setAt && (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => remove.mutate(current.username, { onSuccess: () => notify({ type: "success", title: t("removed") }) })}
            >
              {remove.isPending && <Spinner />}
              {t("remove")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => reset.mutate(current.username, { onSuccess: (result) => setIssued(result.password) })}
          >
            {reset.isPending && <Spinner />}
            {t("reset")}
          </Button>
        </div>
      </div>
      <p className="text-[12.5px] text-muted-foreground">{t("hint")}</p>
      {issued && <FtpPasswordRevealDialog login={current.username} password={issued} onClose={() => setIssued(null)} />}
    </section>
  );
}

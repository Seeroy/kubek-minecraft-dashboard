"use client";

import { api } from "@/api";
import { useProfileQuery } from "@/shared/queries/auth.queries";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { SecretInput } from "@/shared/ui/secret-input";
import { SettingsField } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { KeyRound, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useIssueOwnFtpPasswordMutation } from "../../api/accounts.queries";

/** Your FTP password, the backend creates it when FTP is turned on */
export function FtpPasswordField({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation("modules.settings.general.ftp");
  const { notify } = useNotifications();
  const setAt = useProfileQuery().data?.ftpPasswordSetAt ?? null;
  const issue = useIssueOwnFtpPasswordMutation();
  const [value, setValue] = useState("");

  const reveal = async () => {
    const { password } = await api.accounts.revealOwnFtpPassword();
    setValue(password);
    return password;
  };

  const reset = () =>
    issue.mutate(undefined, {
      onSuccess: ({ password }) => {
        setValue(password);
        notify({ type: "success", title: t("passwordReset") });
      },
    });

  return (
    <SettingsField label={t("password")} icon={KeyRound} hint={setAt ? undefined : t("passwordOnSave")} htmlFor="ftp-password">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <SecretInput
            id="ftp-password"
            readOnly
            disabled={!enabled}
            value={value}
            secret={{ set: !!setAt, hint: null }}
            onReveal={reveal}
            placeholder={t("passwordNotSet")}
          />
        </div>
        {/* FTP that was on before per account passwords has none yet */}
        <Button variant="outline" onClick={reset} disabled={!enabled || issue.isPending}>
          {issue.isPending ? <Spinner /> : <RotateCcw />}
          {setAt ? t("reset") : t("create")}
        </Button>
      </div>
    </SettingsField>
  );
}

"use client";

import { api, type UserProfile } from "@/api";
import { COLOR_THEMES } from "@/modules/settings/ui/ThemePicker";
import { useLanguageContext } from "@/shared/context/language-context";
import { useColorTheme } from "@/shared/hooks/useColorTheme";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { qk } from "@/shared/queries/query-keys";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/shared/ui/button";
import LogoMark from "@/shared/ui/logo-mark";
import { Plate } from "@/shared/ui/plate";
import { Spinner } from "@/shared/ui/spinner";
import { Check, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export function CompletionStep({ serverName }: { serverName?: string }) {
  const { t } = useTranslation("modules.oobe.completion");
  const { t: ts } = useTranslation("modules.settings.general.theme.modes");
  const updateUser = useAuthStore((state) => state.updateUser);
  const { theme } = useColorTheme();
  const { resolvedTheme } = useTheme();
  const { language, availableLanguages } = useLanguageContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const complete = useMutation({
    mutationFn: () => api.auth.completeOOBE(),
    onSuccess: () => {
      queryClient.setQueryData<UserProfile>(qk.auth.profile(), (profile) => profile && { ...profile, oobeCompleted: true });
      updateUser({ oobeCompleted: true });
      router.replace("/");
    },
  });
  // Stays busy after success until the panel replaces this screen
  const finishing = complete.isPending || complete.isSuccess;

  const items = [
    { key: "license", meta: t("meta.license") },
    {
      key: "theme",
      meta: [
        COLOR_THEMES.find((item) => item.id === theme)?.name,
        resolvedTheme && ts(resolvedTheme),
        availableLanguages.find((item) => item.code === language)?.label,
      ]
        .filter(Boolean)
        .join(" · "),
    },
    ...(serverName ? [{ key: "server", meta: serverName }] : []),
    { key: "ready", meta: t("meta.ready") },
  ];

  return (
    <div className="grid w-full max-w-[460px] justify-items-center text-center">
      <div className="relative mb-6 animate-in duration-600 ease-smooth fade-in zoom-in-60">
        <LogoMark size={72} />
        <span className="absolute -right-2 -bottom-1.5 grid size-[30px] animate-in place-items-center rounded-full bg-success text-on-tone shadow-sm ring-4 ring-background delay-250 duration-500 ease-smooth fill-mode-both fade-in zoom-in-60">
          <Check className="size-4" strokeWidth={3} />
        </span>
      </div>
      <h1 className="text-[34px] leading-tight font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-3 max-w-[38ch] text-[15px] text-muted-foreground">{t("subtitle")}</p>

      <ul className="mt-6 w-full overflow-hidden rounded-xl border border-border bg-card text-left">
        {items.map(({ key, meta }, i) => (
          <li
            key={key}
            className="flex animate-enter items-center gap-3 px-4 py-2.5 not-first:border-t not-first:border-border"
            style={{ animationDelay: `${0.35 + i * 0.09}s` }}
          >
            <Plate tone="green" size="sm">
              <Check />
            </Plate>
            <span className="flex-1 text-[13.5px] font-medium">{t(`items.${key}`)}</span>
            <span className="truncate text-xs text-muted-foreground">{meta}</span>
          </li>
        ))}
      </ul>

      <Button size="lg" className="mt-6 h-11 px-6 text-sm" disabled={finishing} onClick={() => complete.mutate()}>
        {finishing ? (
          <>
            <Spinner />
            {t("opening")}
          </>
        ) : (
          <>
            {t("cta")}
            <ChevronRight />
          </>
        )}
      </Button>
    </div>
  );
}

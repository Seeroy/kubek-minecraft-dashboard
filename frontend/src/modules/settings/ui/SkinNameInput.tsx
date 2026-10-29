"use client";

import { qk } from "@/shared/queries/query-keys";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Input } from "@/shared/ui/input";
import { PlayerHead } from "@/shared/ui/player-head";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useState } from "react";
import { useUpdatePreferencesMutation } from "../api/twofa.queries";

type SkinNameInputProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
};

/** Minecraft nickname for the current user's avatar with a live head preview */
export function SkinNameInput({ value, onChange, id, className }: SkinNameInputProps) {
  const { t } = useTranslation("modules.settings.general.profile");
  const username = useAuthStore((s) => s.user?.username ?? "");
  const debounced = useDebouncedValue(value, 500);
  const typing = value !== debounced;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-ctl shrink-0 place-items-center rounded-md border border-border bg-subtle">
        {typing ? (
          <span className="skeleton-shimmer size-[22px] rounded-[4px]" aria-hidden />
        ) : (
          <PlayerHead name={debounced || username} size={22} className="rounded-[4px]" />
        )}
      </span>
      <Input
        id={id}
        value={value}
        maxLength={16}
        spellCheck={false}
        autoComplete="off"
        placeholder={username}
        aria-label={t("label")}
        className="font-mono"
        // Only characters Minecraft allows in a nickname
        onChange={(event) => onChange(event.target.value.replace(/[^A-Za-z0-9_]/g, ""))}
      />
    </div>
  );
}

/** Same field saving on its own, for places without a save bar */
export function AutosaveSkinNameInput({ className }: { className?: string }) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const queryClient = useQueryClient();
  const updatePreferences = useUpdatePreferencesMutation();
  const [value, setValue] = useState(user?.skinName ?? "");
  const debounced = useDebouncedValue(value, 500);

  const save = useEffectEvent((next: string) => {
    if (!user || (next || null) === (user.skinName ?? null)) return;
    updatePreferences.mutate(
      { skinName: next || null },
      {
        onSuccess: (prefs) => {
          updateUser({ skinName: prefs.skinName });
          queryClient.invalidateQueries({ queryKey: qk.auth.profile() });
        },
      }
    );
  });

  useEffect(() => save(debounced), [debounced]);

  return <SkinNameInput value={value} onChange={setValue} className={className} />;
}

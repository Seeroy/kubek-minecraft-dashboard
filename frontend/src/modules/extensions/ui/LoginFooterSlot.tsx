"use client";

import { useExtensionLoginSlots } from "@/modules/extensions/api/extensions.queries";
import { useLanguageContext } from "@/shared/context/language-context";
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { collectSlotMounts } from "./slot-mounts";

// The extension runtime stays out of the login bundle until a slot needs it
const LoginSlotMounts = dynamic(() => import("./LoginSlotMounts"), { ssr: false });

/** login.footer slots under the sign-in form, read from a public endpoint */
export function LoginFooterSlot() {
  const { data } = useExtensionLoginSlots();
  const { registerExtensionLocales } = useLanguageContext();
  const mounts = useMemo(() => collectSlotMounts(data, "login.footer"), [data]);

  useEffect(() => {
    if (data?.length) registerExtensionLocales(data.map((e) => e.locales ?? {}));
  }, [data, registerExtensionLocales]);

  if (!mounts.length) return null;
  return (
    <div className="mt-6 grid gap-2 border-t border-border/60 pt-4">
      <LoginSlotMounts mounts={mounts} />
    </div>
  );
}

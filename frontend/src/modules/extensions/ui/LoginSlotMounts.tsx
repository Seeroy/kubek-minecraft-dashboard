"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { installKubekGlobal } from "../runtime/kubek-global";
import { SlotMounts } from "./ExtensionSlot";
import type { SlotMount } from "./slot-mounts";

/** Mounts login.footer components, the dashboard providers that publish window.Kubek are not here yet */
export default function LoginSlotMounts({ mounts }: { mounts: SlotMount[] }) {
  const router = useRouter();
  // Has to exist before the bundles import, so not in an effect
  useState(() => installKubekGlobal((path: string) => router.push(path)));
  return <SlotMounts mounts={mounts} publicBundle loading={null} />;
}

"use client";

import { LoadingBar } from "@/shared/ui/loading-bar";
import { useNavPending } from "../store/nav-pending.store";

/** Thin bar over the content while a nav click waits for its route */
export function NavProgress() {
  const pending = useNavPending((s) => s.href !== null);
  return pending ? <LoadingBar className="top-0 z-30" /> : null;
}

"use client";

import { useProfileQuery } from "@/shared/queries/auth.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Keeps the profile fresh, sends logged out users to /login */
export function AuthGate() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useProfileQuery();

  useEffect(() => {
    if (!isHydrated) return;
    if (token) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;
    router.push("/login");
  }, [isHydrated, token, router]);

  return null;
}

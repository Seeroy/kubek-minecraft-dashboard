"use client";

import { useLanguageContext } from "@/shared/context/language-context";
import { useExtensionRegistry } from "@/modules/extensions/api/extensions.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { installKubekGlobal } from "./kubek-global";

/**
 * Publishes window.Kubek before any extension bundle loads and warms the frontend registry. Mounted
 * high in the provider tree so slots/pages can resolve contributions immediately
 */
export const ExtensionRuntimeProvider = () => {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const { registerExtensionLocales } = useLanguageContext();

  useEffect(() => {
    installKubekGlobal((path: string) => router.push(path));
  }, [router]);

  // warm the registry once the user is authenticated; slots read from the same query cache
  const { data: registry } = useExtensionRegistry({ enabled: isAuthenticated });

  // Feed extension locale dictionaries into the panel i18n so their labels translate
  useEffect(() => {
    if (!registry) return;
    registerExtensionLocales(registry.map((e) => e.locales ?? {}));
  }, [registry, registerExtensionLocales]);

  return null;
};

"use client";

import { allNavigation } from "@/modules/sidebar/data/navigation";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useNotificationTitleStore } from "@/shared/stores/notification-title-store";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const APP_NAME = "Kubek";

// Routes outside the main navigation that should still have a translated title
const EXTRA_TITLE_KEYS: Record<string, string> = {
  "/login": "modules.auth.modal.title",
};

const DocumentTitle = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const unread = useNotificationTitleStore((s) => s.unread);

  useEffect(() => {
    let pageName: string | null = null;

    const navItem = allNavigation.find((item) => item.href === pathname);
    if (navItem) {
      pageName = t(`modules.sidebar.${ navItem.nameKey }`);
    } else if (pathname && EXTRA_TITLE_KEYS[pathname]) {
      pageName = t(EXTRA_TITLE_KEYS[pathname]);
    }

    const base = pageName ? `${ pageName } | ${ APP_NAME }` : APP_NAME;
    document.title = unread > 0 ? `(${ unread }) ${ base }` : base;
  }, [pathname, t, unread]);

  return null;
};

export default DocumentTitle;

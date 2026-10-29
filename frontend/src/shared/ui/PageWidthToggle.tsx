"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { togglePageWidth } from "@/shared/lib/page-width";
import { ChevronsLeftRight, ChevronsRightLeft } from "lucide-react";

/** Corner switch between the full and the contained page width */
export function PageWidthToggle() {
  const { t } = useTranslation("modules.components.pageWidth");

  return (
    <button
      type="button"
      onClick={togglePageWidth}
      aria-label={t("toggle")}
      title={t("toggle")}
      className="absolute right-5 bottom-4 z-20 hidden size-8 cursor-pointer items-center justify-center rounded-md border border-border bg-card/70 text-muted-foreground opacity-50 backdrop-blur-sm transition-opacity hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary/70 @[81rem]/content:inline-flex [&_svg]:size-4"
    >
      {/* Both icons rendered, the html class picks one so markup never depends on storage */}
      <ChevronsRightLeft className="page-contained:hidden" />
      <ChevronsLeftRight className="hidden page-contained:block" />
    </button>
  );
}

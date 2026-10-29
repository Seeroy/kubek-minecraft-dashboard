"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { buttonVariants } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { House, MapPinOff } from "lucide-react";
import Link from "next/link";

// Any path the static export does not have, the backend serves it with a 404 status
export default function NotFound() {
  const { t } = useTranslation("modules.shared.notFound");

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinOff />
          </EmptyMedia>
          <span className="font-mono text-4xl font-semibold text-muted-foreground tabular-nums">404</span>
          <EmptyTitle>{t("title")}</EmptyTitle>
          <EmptyDescription>{t("description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            <House />
            {t("home")}
          </Link>
        </EmptyContent>
      </Empty>
    </main>
  );
}

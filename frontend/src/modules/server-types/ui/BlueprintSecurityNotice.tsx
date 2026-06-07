"use client";

import { useLanguageContext } from "@/shared/context/language-context";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { TriangleAlert } from "lucide-react";

export const BlueprintSecurityNotice = () => {
  const { t } = useLanguageContext();

  return (
    <Alert variant="destructive" className="md:max-w-md">
      <TriangleAlert className="size-4" />
      <AlertTitle>{t("modules.serverTypes.securityNotice.title")}</AlertTitle>
      <AlertDescription>
        {t("modules.serverTypes.securityNotice.description")}
      </AlertDescription>
    </Alert>
  );
};

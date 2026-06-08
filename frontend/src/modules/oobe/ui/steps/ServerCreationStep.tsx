"use client";

import { CREATE_SERVER_MODAL_ID } from "@/modules/server";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Info, Server } from "lucide-react";

interface ServerCreationStepProps {
  onComplete: () => void;
}

export function ServerCreationStep({ onComplete }: ServerCreationStepProps) {
  const { openModal } = useModal();
  const { t } = useTranslation("modules.oobe.serverCreationStep");

  const handleOpenServerModal = () => {
    openModal(CREATE_SERVER_MODAL_ID);
    // The modal owns the actual creation, so mark the step done on open
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Server className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h3 className="mb-2 text-lg font-semibold">{t("title")}</h3>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex justify-center">
        <Button onClick={handleOpenServerModal} size="lg" className="min-w-48">
          {t("button")}
        </Button>
      </div>

      <Alert className="mx-auto max-w-md">
        <Info />
        <AlertTitle>{t("optional.title")}</AlertTitle>
        <AlertDescription>{t("optional.description")}</AlertDescription>
      </Alert>
    </div>
  );
}

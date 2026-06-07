"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import LogoV2 from "@/shared/ui/logo-v2";
import { Progress } from "@/shared/ui/progress";
import { UserPermissions } from "@shared/types/user.types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CompletionStep } from "./steps/CompletionStep";
import { EULAStep } from "./steps/EULAStep";
import { PreferencesStep } from "./steps/PreferencesStep";
import { ServerCreationStep } from "./steps/ServerCreationStep";

export type OOBEStep =
  | "eula"
  | "preferences"
  | "server-creation"
  | "completion";

const ALL_STEP_IDS: OOBEStep[] = [
  "eula",
  "preferences",
  "server-creation",
  "completion",
];

export default function OOBE() {
  const { t } = useTranslation("modules.oobe");
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const STEPS = useMemo(
    () =>
      ALL_STEP_IDS.filter(
        (id) =>
          id !== "server-creation" ||
          hasPermission(UserPermissions.CREATE_SERVERS)
      ),
    [hasPermission]
  );

  const [currentStep, setCurrentStep] = useState<OOBEStep>("eula");
  const [completedSteps, setCompletedSteps] = useState<Set<OOBEStep>>(
    new Set()
  );

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "eula":
        return completedSteps.has("eula");
      case "preferences":
        return true;
      case "server-creation":
        // Server creation is optional - user can skip it
        return true;
      case "completion":
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "eula":
        return (
          <EULAStep
            onComplete={() =>
              setCompletedSteps((prev) => new Set([...prev, "eula"]))
            }
          />
        );
      case "preferences":
        return (
          <PreferencesStep
            onComplete={() =>
              setCompletedSteps((prev) => new Set([...prev, "preferences"]))
            }
          />
        );
      case "server-creation":
        return (
          <ServerCreationStep
            onComplete={() =>
              setCompletedSteps((prev) => new Set([...prev, "server-creation"]))
            }
          />
        );
      default:
        return null;
    }
  };

  if (currentStep === "completion") {
    return (
      <CompletionStep serverCreated={completedSteps.has("server-creation")} />
    );
  }

  // On the optional server step the primary action is "skip" until a server is created.
  const isOptionalSkip =
    currentStep === "server-creation" && !completedSteps.has("server-creation");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-3">
      <Card className="w-full max-w-4xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <LogoV2 size="md" withText={false} className="shrink-0" />
              <CardTitle className="truncate text-2xl font-bold">
                {t(`steps.${currentStep}.title`)}
              </CardTitle>
            </div>
            <span className="shrink-0 text-sm text-muted-foreground">
              {t("navigation.stepOf", currentStepIndex + 1, STEPS.length)}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
          <p className="text-muted-foreground">
            {t(`steps.${currentStep}.description`)}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {renderStep()}

          <div className="flex justify-between border-t pt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("navigation.back")}
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              variant={isOptionalSkip ? "outline" : "default"}
              className="flex items-center gap-2"
            >
              {isOptionalSkip ? t("navigation.skip") : t("navigation.next")}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

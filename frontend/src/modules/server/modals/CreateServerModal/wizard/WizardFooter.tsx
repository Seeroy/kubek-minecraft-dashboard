import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Button } from "@/shared/ui/button";
import { DialogFooter } from "@/shared/ui/dialog";
import { Kbd } from "@/shared/ui/kbd";
import { Check, Terminal } from "lucide-react";
import { CREATE_STEP } from "./StepNav";

interface WizardFooterProps {
  step: number;
  blueprint: BlueprintSummary | undefined;
  submitting: boolean;
  succeeded: boolean;
  failed: boolean;
  onBack: () => void;
  onNext: () => void;
  onRestart: () => void;
  onClose: () => void;
  onOpenConsole: () => void;
}

export function WizardFooter({ step, blueprint, submitting, succeeded, failed, onBack, onNext, onRestart, onClose, onOpenConsole }: WizardFooterProps) {
  const { t } = useTranslation("modules.newServerModal");
  const creating = step === CREATE_STEP;
  const confirming = step === CREATE_STEP - 1;

  const hint = () => {
    if (step === 0) return blueprint ? t("nav.picked", blueprint.shortName ?? blueprint.name) : t("nav.pickType");
    if (!creating)
      return (
        <>
          <Kbd>Enter</Kbd> {t("nav.keys")}
        </>
      );
    return !succeeded && !failed && t("nav.running");
  };

  const nextLabel = () => {
    if (submitting) return t("nav.creating");
    return confirming ? t("nav.create") : t("nav.next");
  };

  return (
    <DialogFooter className="flex-row items-center">
      <span className={cn("mr-auto hidden text-[12.5px] text-muted-foreground sm:inline", creating && "inline")}>{hint()}</span>

      {creating && (succeeded || failed) && (
        <Button variant="outline" onClick={onRestart}>
          {t("nav.another")}
        </Button>
      )}
      {creating && !succeeded && (
        <Button variant="outline" onClick={onClose}>
          {t("modal.close")}
        </Button>
      )}
      {creating && succeeded && (
        <>
          <Button variant="outline" onClick={onClose}>
            {t("nav.done")}
          </Button>
          <Button onClick={onOpenConsole}>
            <Terminal />
            {t("nav.openConsole")}
          </Button>
        </>
      )}

      {!creating && step > 0 && (
        <Button variant="ghost" disabled={submitting} onClick={onBack}>
          {t("nav.back")}
        </Button>
      )}
      {!creating && (
        <Button disabled={!blueprint || submitting} onClick={onNext}>
          {confirming && <Check />}
          {nextLabel()}
        </Button>
      )}
    </DialogFooter>
  );
}

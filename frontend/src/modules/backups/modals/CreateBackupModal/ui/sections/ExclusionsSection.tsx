import type { Translator } from "@/locales/types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { X } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateBackupFormValues } from "../../validations/schema";

interface ExclusionsSectionProps {
  form: UseFormReturn<CreateBackupFormValues>;
  t: Translator;
  currentExclusion: string;
  setCurrentExclusion: (value: string) => void;
  addExclusion: () => void;
  removeExclusion: (exclusion: string) => void;
  handleExclusionKeyPress: (e: React.KeyboardEvent) => void;
}

export function ExclusionsSection({
  form,
  t,
  currentExclusion,
  setCurrentExclusion,
  addExclusion,
  removeExclusion,
  handleExclusionKeyPress,
}: ExclusionsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("modals.createBackup.form.advanced.exclusions.label")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={t(
              "modals.createBackup.form.advanced.exclusions.placeholder"
            )}
            value={currentExclusion}
            onChange={(e) => setCurrentExclusion(e.target.value)}
            onKeyPress={handleExclusionKeyPress}
          />
          <Button
            type="button"
            variant="outline"
            onClick={addExclusion}
            disabled={!currentExclusion.trim()}
            className="max-sm:w-full"
          >
            {t("modals.createBackup.form.advanced.exclusions.addButton")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("modals.createBackup.form.advanced.exclusions.description")}
        </p>
        {(form.watch("globExceptions") || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {(form.watch("globExceptions") || []).map((exclusion, index) => (
              <Badge key={index} variant="secondary" className="gap-1">
                {exclusion}
                <button
                  type="button"
                  onClick={() => removeExclusion(exclusion)}
                  className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        {form.formState.errors.globExceptions && (
          <p className="text-sm text-destructive">
            {form.formState.errors.globExceptions.message}
          </p>
        )}
      </div>
    </div>
  );
}

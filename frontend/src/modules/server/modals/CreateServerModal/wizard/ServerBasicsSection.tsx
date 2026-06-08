import { useLanguageContext } from "@/shared/context/language-context";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Server } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { BlueprintPicker } from "./BlueprintPicker";
import type { WizardValues } from "./buildBlueprintSchema";

interface ServerBasicsSectionProps {
  form: UseFormReturn<WizardValues>;
  blueprints: BlueprintSummary[];
  selectedId?: string;
  onSelectBlueprint: (bp: BlueprintSummary) => void;
  blueprintsLoading: boolean;
}

/** Server name input + core (blueprint) picker */
export function ServerBasicsSection({
  form,
  blueprints,
  selectedId,
  onSelectBlueprint,
  blueprintsLoading,
}: ServerBasicsSectionProps) {
  const { t } = useLanguageContext();
  const { errors } = form.formState;

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-center gap-2">
        <Server className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {t("modules.newServerModal.general.title")}
        </h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">
          {t("modules.newServerModal.general.name.label")}
        </Label>
        <Input
          id="name"
          placeholder={t("modules.newServerModal.general.name.placeholder")}
          {...form.register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">
            {t(errors.name.message as string)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("modules.newServerModal.modal.tabs.core")}</Label>
        <BlueprintPicker
          blueprints={blueprints}
          selectedId={selectedId}
          onSelect={onSelectBlueprint}
          isLoading={blueprintsLoading}
        />
      </div>
    </section>
  );
}

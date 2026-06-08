import { useLanguageContext } from "@/shared/context/language-context";
import { Input } from "@/shared/ui/input";
import { UploadCloud } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { WizardValues } from "./buildBlueprintSchema";

interface CoreFileUploadZoneProps {
  form: UseFormReturn<WizardValues>;
}

/** Dropzone for blueprints that require a user-provided core .jar */
export function CoreFileUploadZone({ form }: CoreFileUploadZoneProps) {
  const { t } = useLanguageContext();
  const customFile = form.watch("customFile");

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-muted p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UploadCloud className="size-4" />
        {t("modules.newServerModal.core.custom.dropzone")}
      </div>
      <Input
        type="file"
        accept=".jar"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file)
            form.setValue("customFile", file, {
              shouldValidate: true,
            });
        }}
      />
      {customFile && (
        <p className="text-sm text-green-600">
          {t("modules.newServerModal.core.custom.selected", {
            name: customFile.name,
          })}
        </p>
      )}
    </div>
  );
}

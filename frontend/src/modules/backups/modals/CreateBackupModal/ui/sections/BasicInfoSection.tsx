import type { Translator } from "@/locales/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import type { UseFormReturn } from "react-hook-form";
import type { CreateBackupFormValues } from "../../validations/schema";

interface BasicInfoSectionProps {
  form: UseFormReturn<CreateBackupFormValues>;
  t: Translator;
}

export function BasicInfoSection({ form, t }: BasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("modals.createBackup.form.name.label")}</Label>
        <Input
          id="name"
          placeholder={t("modals.createBackup.form.name.placeholder")}
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          {t("modals.createBackup.form.description.label")}
        </Label>
        <Textarea
          id="description"
          placeholder={t("modals.createBackup.form.description.placeholder")}
          rows={2}
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <p className="text-sm text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>
    </div>
  );
}

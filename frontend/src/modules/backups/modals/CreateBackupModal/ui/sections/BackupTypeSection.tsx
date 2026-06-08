import type { Translator } from "@/locales/types";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { UseFormReturn } from "react-hook-form";
import type { CreateBackupFormValues } from "../../validations/schema";

interface BackupTypeSectionProps {
  form: UseFormReturn<CreateBackupFormValues>;
  t: Translator;
}

export function BackupTypeSection({ form, t }: BackupTypeSectionProps) {
  // Available backup types
  const typeItems = [
    { value: "full", label: t("modals.createBackup.form.type.options.full") },
    {
      value: "partial",
      label: t("modals.createBackup.form.type.options.partial"),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("modals.createBackup.form.type.label")}</Label>
        <Select
          items={typeItems}
          value={form.watch("type")}
          onValueChange={(value) => value && form.setValue("type", value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.type && (
          <p className="text-sm text-destructive">
            {form.formState.errors.type.message}
          </p>
        )}
      </div>
    </div>
  );
}

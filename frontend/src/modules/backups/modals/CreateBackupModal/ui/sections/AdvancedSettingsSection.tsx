import type { Translator } from "@/locales/types";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Slider } from "@/shared/ui/slider";
import type { UseFormReturn } from "react-hook-form";
import type { CreateBackupFormValues } from "../../validations/schema";

interface AdvancedSettingsSectionProps {
  form: UseFormReturn<CreateBackupFormValues>;
  t: Translator;
}

export function AdvancedSettingsSection({
  form,
  t,
}: AdvancedSettingsSectionProps) {
  // Available ext items
  const formatItems = [
    {
      value: "zip",
      label: t("modals.createBackup.form.advanced.format.options.zip"),
    },
    {
      value: "tar.gz",
      label: t("modals.createBackup.form.advanced.format.options.tarGz"),
    },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium">
        {t("modals.createBackup.form.advanced.title")}
      </h4>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("modals.createBackup.form.advanced.format.label")}</Label>
          <Select
            items={formatItems}
            value={form.watch("format")}
            onValueChange={(value) => value && form.setValue("format", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.format && (
            <p className="text-sm text-destructive">
              {form.formState.errors.format.message}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label>
            {t(
              "modals.createBackup.form.advanced.compressionRatio.label",
              form.watch("compressionRatio")
            )}
          </Label>
          <Slider
            value={form.watch("compressionRatio")}
            onValueChange={(value) =>
              form.setValue(
                "compressionRatio",
                typeof value === "number" ? value : value[0]
              )
            }
            min={1}
            max={9}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {t("modals.createBackup.form.advanced.compressionRatio.min")}
            </span>
            <span>
              {t("modals.createBackup.form.advanced.compressionRatio.max")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

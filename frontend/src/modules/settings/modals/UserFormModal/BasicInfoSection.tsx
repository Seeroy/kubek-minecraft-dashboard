import { useTranslation } from "@/shared/hooks/useTranslation";
import { Card, CardContent } from "@/shared/ui/card";
import { FormControl, FormField, FormItem, FormLabel } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { UserPlus } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { UserFormDataUnion } from "./schema";

interface BasicInfoSectionProps {
  form: UseFormReturn<UserFormDataUnion>;
  isLoading: boolean;
  isEdit?: boolean;
}

export function BasicInfoSection({
  form,
  isLoading,
  isEdit = false,
}: BasicInfoSectionProps) {
  const { t } = useTranslation("modules.createUserModal");

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <UserPlus className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold">
              {t("modal.sections.basicInfo.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("modal.sections.basicInfo.description")}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  {t("modal.sections.basicInfo.username.label")}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder={t(
                      "modal.sections.basicInfo.username.placeholder"
                    )}
                    autoFocus
                    disabled={isLoading}
                    className="h-9"
                  />
                </FormControl>
                {fieldState.error && (
                  <p className="text-sm text-destructive">
                    {t(fieldState.error.message as string)}
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  {t("modal.sections.basicInfo.password.label")}{" "}
                  {isEdit && t("modal.sections.basicInfo.password.editLabel")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    {...field}
                    placeholder={
                      isEdit
                        ? t("modal.sections.basicInfo.password.editPlaceholder")
                        : t("modal.sections.basicInfo.password.placeholder")
                    }
                    disabled={isLoading}
                    className="h-9"
                  />
                </FormControl>
                {fieldState.error && (
                  <p className="text-sm text-destructive">
                    {t(fieldState.error.message as string)}
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

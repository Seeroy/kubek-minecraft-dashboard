import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/shared/ui/form";
import { Shield } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useAvailablePermissions } from "../../data/permissions";
import { PermissionCard } from "./PermissionCard";
import { UserFormDataUnion } from "./schema";

interface PermissionsSectionProps {
  form: UseFormReturn<UserFormDataUnion>;
  selectedPermissions: string[];
}

export function PermissionsSection({
  form,
  selectedPermissions,
}: PermissionsSectionProps) {
  const { t } = useTranslation("modules.createUserModal");
  const availablePermissions = useAvailablePermissions();

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Shield className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold">
              {t("modal.sections.permissions.title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("modal.sections.permissions.description")}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto">
            {t(
              "modal.sections.permissions.selectedCount",
              selectedPermissions.length
            )}
          </Badge>
        </div>

        <FormField
          control={form.control}
          name="permissions"
          render={() => (
            <FormItem>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {availablePermissions.map((permission) => (
                  <FormField
                    key={permission.id}
                    control={form.control}
                    name="permissions"
                    render={({ field }) => {
                      const isSelected = field.value?.includes(permission.id);

                      return (
                        <FormItem>
                          <FormControl>
                            <PermissionCard
                              permission={permission}
                              isSelected={isSelected}
                              onToggle={() => {
                                isSelected
                                  ? field.onChange(
                                      field.value?.filter(
                                        (v) => v !== permission.id
                                      )
                                    )
                                  : field.onChange([
                                      ...field.value,
                                      permission.id,
                                    ]);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

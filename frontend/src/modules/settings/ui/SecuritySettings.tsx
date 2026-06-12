"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { BarChart3, Network, Plus, Shield, Trash2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { MainConfigFormData } from "../validations/schema";

interface SecuritySettingsProps {
  form: UseFormReturn<MainConfigFormData>;
}

export default function SecuritySettings({ form }: SecuritySettingsProps) {
  const {
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = form;
  const { t } = useTranslation("modules.settings");
  // Validation messages are full translation keys from the zod schema
  const { t: tError } = useTranslation();
  const watchSubnetsEnabled = watch("subnetsAccessRestriction.enabled");
  const subnets = watch("subnetsAccessRestriction.subnets") || [];

  const addSubnet = () => {
    const newSubnets = [...subnets, ""];
    setValue("subnetsAccessRestriction.subnets", newSubnets, {
      shouldDirty: true,
    });
    void trigger();
  };

  const updateSubnet = (index: number, value: string) => {
    const newSubnets = [...subnets];
    newSubnets[index] = value;
    setValue("subnetsAccessRestriction.subnets", newSubnets, {
      shouldDirty: true,
    });
    void trigger();
  };

  const removeSubnet = (index: number) => {
    const newSubnets = subnets.filter((_, i) => i !== index);
    setValue("subnetsAccessRestriction.subnets", newSubnets, {
      shouldDirty: true,
    });
    void trigger();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("security.title")}
            title={t("security.title")}
            description={t("security.description")}
            icon={Shield}
            color="red"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subnet Access Restriction */}
          <div className="flex flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label className="text-base" htmlFor="subnets-enabled">
                {t("security.subnets.label")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("security.subnets.description")}
              </p>
            </div>
            <Switch
              id="subnets-enabled"
              checked={watchSubnetsEnabled}
              onCheckedChange={(value) => {
                setValue("subnetsAccessRestriction.enabled", value, {
                  shouldDirty: true,
                });
                void trigger();
              }}
            />
          </div>

          {watchSubnetsEnabled && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>{t("security.subnets.allowed")}</span>
                  <Button
                    variant="outline"
                    onClick={addSubnet}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("security.subnets.add")}
                  </Button>
                </div>

                <div className="space-y-3">
                  {subnets.map((subnet, index) => {
                    const subnetError =
                      errors.subnetsAccessRestriction?.subnets?.[index];
                    return (
                      <div key={index} className="space-y-1.5">
                        <div className="flex gap-2">
                          <Input
                            value={subnet}
                            onChange={(e) =>
                              updateSubnet(index, e.target.value)
                            }
                            placeholder={t("security.subnets.example")}
                            aria-invalid={!!subnetError}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => removeSubnet(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        {subnetError?.message && (
                          <p className="text-sm text-destructive">
                            {tError(subnetError.message)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {subnets.length === 0 && (
                    <div className="py-4 text-center text-muted-foreground">
                      <Network className="mx-auto mb-2 h-8 w-8 opacity-50" />
                      <p>{t("security.subnets.empty.title")}</p>
                      <p className="text-sm">
                        {t("security.subnets.empty.description")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Subnets array-level error (e.g. none provided) */}
                {errors.subnetsAccessRestriction?.subnets?.message && (
                  <div className="text-sm font-medium text-destructive">
                    {tError(errors.subnetsAccessRestriction.subnets.message)}
                  </div>
                )}
                {errors.subnetsAccessRestriction?.subnets?.root?.message && (
                  <div className="text-sm font-medium text-destructive">
                    {tError(
                      errors.subnetsAccessRestriction.subnets.root.message
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("security.telemetry.title")}
            title={t("security.telemetry.title")}
            description={t("security.telemetry.description")}
            icon={BarChart3}
            color="orange"
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-row items-center justify-between rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label className="text-base" htmlFor="telemetry-enabled">
                {t("security.telemetry.toggleLabel")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("security.telemetry.toggleDescriptionStart")}
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                  KUBEK_TELEMETRY=off
                </code>
                {t("security.telemetry.toggleDescriptionEnd")}
              </p>
            </div>
            <Switch
              id="telemetry-enabled"
              checked={watch("telemetry.enabled")}
              onCheckedChange={(value) => {
                setValue("telemetry.enabled", value, { shouldDirty: true });
                void trigger();
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

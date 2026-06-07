import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { AlertTriangle, Plus, Settings2, Trash2 } from "lucide-react";
import { ServerProperty } from "../types";

interface OtherSettingsProps {
  properties: ServerProperty[];
  onUpdateProperty: (
    index: number,
    field: keyof ServerProperty,
    value: string
  ) => void;
  onAddProperty: () => void;
  onRemoveProperty: (index: number) => void;
}

export const OthersTab = ({
  properties,
  onUpdateProperty,
  onAddProperty,
  onRemoveProperty,
}: OtherSettingsProps) => {
  const { t } = useTranslation("modules.serverSettings");
  return (
    <div className="space-y-6">
      {/* Warning Card */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("other.advancedSettings.warning")}
            title={t("other.advancedSettings.title")}
            description={t("other.advancedSettings.description")}
            icon={AlertTriangle}
            color="yellow"
          />
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
            <h4 className="mb-2 font-semibold text-amber-700 dark:text-amber-300">
              {t("other.advancedSettings.warning")}
            </h4>
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t("other.advancedSettings.warningText")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Properties */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("other.customProperties.title")}
            title={t("other.customProperties.title")}
            description={t("other.customProperties.description")}
            icon={Settings2}
            color="primary"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {properties.map((property, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    id={`other-key-${index}`}
                    value={property.key}
                    onChange={(e) =>
                      onUpdateProperty(index, "key", e.target.value)
                    }
                    placeholder={t(
                      "other.customProperties.propertyNamePlaceholder"
                    )}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    id={`other-value-${index}`}
                    value={property.value}
                    onChange={(e) =>
                      onUpdateProperty(index, "value", e.target.value)
                    }
                    placeholder={t(
                      "other.customProperties.propertyValuePlaceholder"
                    )}
                    className="font-mono text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onRemoveProperty(index)}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full gap-2 sm:w-auto"
            onClick={onAddProperty}
          >
            <Plus className="h-4 w-4" />
            {t("other.customProperties.addProperty")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

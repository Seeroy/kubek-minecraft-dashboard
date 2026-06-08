import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { AlertTriangle, Network } from "lucide-react";

interface NetworkSettingsProps {
  settings: Record<string, string>;
  onUpdateSetting: (key: string, value: string) => void;
}

export const NetworkTab = ({
  settings,
  onUpdateSetting,
}: NetworkSettingsProps) => {
  const { t } = useTranslation("modules.serverSettings");
  const getValue = (key: string, defaultValue: string = "") => {
    return settings[key] || defaultValue;
  };

  return (
    <div className="space-y-6">
      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("network.connectionSettings.title")}
            title={t("network.connectionSettings.title")}
            description={t("network.connectionSettings.description")}
            icon={Network}
            color="blue"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="server-port">
              {t("network.connectionSettings.serverPort")}
            </Label>
            <Input
              id="server-port"
              type="number"
              value={getValue("server-port")}
              onChange={(e) => onUpdateSetting("server-port", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {t("network.connectionSettings.serverPortDefault")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="query-port">
              {t("network.connectionSettings.queryPort")}
            </Label>
            <Input
              id="query-port"
              type="number"
              value={getValue("query.port")}
              onChange={(e) => onUpdateSetting("query.port", e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              {t("network.connectionSettings.queryPortDefault")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Network Information */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("network.networkConfiguration.importantNotice")}
            title={t("network.networkConfiguration.title")}
            description={t("network.networkConfiguration.description")}
            icon={AlertTriangle}
            color="yellow"
          />
        </CardHeader>
        <CardContent>
          <div className="border-warning/50 bg-warning/10 rounded-lg border p-4">
            <h4 className="text-warning mb-2 font-semibold">
              {t("network.networkConfiguration.importantNotice")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("network.networkConfiguration.importantNoticeText")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

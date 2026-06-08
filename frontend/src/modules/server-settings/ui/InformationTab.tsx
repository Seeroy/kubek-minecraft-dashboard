import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Server, Shield } from "lucide-react";

interface InformationTabProps {
  settings: Record<string, string>;
  onUpdateSetting: (key: string, value: string) => void;
}

export const InformationTab = ({
  settings,
  onUpdateSetting,
}: InformationTabProps) => {
  const { t } = useTranslation("modules.serverSettings");
  const getValue = (key: string, defaultValue: string = "") => {
    return settings[key] || defaultValue;
  };

  return (
    <div className="space-y-6">
      {/* Server Information */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("information.serverInformation.title")}
            title={t("information.serverInformation.title")}
            description={t("information.serverInformation.description")}
            icon={Server}
            color="blue"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="motd">
              {t("information.serverInformation.motd")}
            </Label>
            <Input
              id="motd"
              value={getValue("motd")}
              onChange={(e) => onUpdateSetting("motd", e.target.value)}
              placeholder={t("information.serverInformation.motdPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-players">
              {t("information.serverInformation.maxPlayers")}
            </Label>
            <Input
              id="max-players"
              type="number"
              value={getValue("max-players")}
              onChange={(e) => onUpdateSetting("max-players", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("information.securitySettings.title")}
            title={t("information.securitySettings.title")}
            description={t("information.securitySettings.description")}
            icon={Shield}
            color="purple"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("information.securitySettings.onlineMode")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("information.securitySettings.onlineModeDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("online-mode") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("online-mode", checked.toString())
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("information.securitySettings.whitelist")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("information.securitySettings.whitelistDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("white-list") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("white-list", checked.toString())
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

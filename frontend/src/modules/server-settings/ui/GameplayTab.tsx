import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Gamepad2, Globe, Users } from "lucide-react";

interface GameplaySettingsProps {
  settings: Record<string, string>;
  onUpdateSetting: (key: string, value: string) => void;
}

export const GameplayTab = ({
  settings,
  onUpdateSetting,
}: GameplaySettingsProps) => {
  const getValue = (key: string, defaultValue: string = "") => {
    return settings[key] || defaultValue;
  };
  const { t } = useTranslation("modules.serverSettings.gameplay");

  return (
    <div className="space-y-6">
      {/* Game Rules */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("gameRules.title")}
            title={t("gameRules.title")}
            description={t("gameRules.description")}
            icon={Gamepad2}
            color="green"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="difficulty">{t("gameRules.difficulty")}</Label>
              <Select
                value={getValue("difficulty")}
                onValueChange={(value) =>
                  value && onUpdateSetting("difficulty", value)
                }
              >
                <SelectTrigger id="difficulty" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="peaceful">
                    {t("gameRules.difficultyOptions.peaceful")}
                  </SelectItem>
                  <SelectItem value="easy">
                    {t("gameRules.difficultyOptions.easy")}
                  </SelectItem>
                  <SelectItem value="normal">
                    {t("gameRules.difficultyOptions.normal")}
                  </SelectItem>
                  <SelectItem value="hard">
                    {t("gameRules.difficultyOptions.hard")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gamemode">{t("gameRules.defaultGamemode")}</Label>
              <Select
                value={getValue("gamemode")}
                onValueChange={(value) =>
                  value && onUpdateSetting("gamemode", value)
                }
              >
                <SelectTrigger id="gamemode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="survival">Survival</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="spectator">Spectator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Interactions */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("playerInteractions.title")}
            title={t("playerInteractions.title")}
            description={t("playerInteractions.description")}
            icon={Users}
            color="blue"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("playerInteractions.pvp")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("playerInteractions.pvpDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("pvp") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("pvp", checked.toString())
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("playerInteractions.allowFlight")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("playerInteractions.allowFlightDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("allow-flight") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("allow-flight", checked.toString())
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* World Settings */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("worldSettings.title")}
            title={t("worldSettings.title")}
            description={t("worldSettings.description")}
            icon={Globe}
            color="purple"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("worldSettings.hardcoreMode")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("worldSettings.hardcoreModeDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("hardcore") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("hardcore", checked.toString())
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spawn-protection">
              {t("worldSettings.spawnProtectionRadius")}
            </Label>
            <Input
              id="spawn-protection"
              type="number"
              value={getValue("spawn-protection")}
              onChange={(e) =>
                onUpdateSetting("spawn-protection", e.target.value)
              }
            />
            <p className="text-sm text-muted-foreground">
              {t("worldSettings.spawnProtectionRadiusHelp")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

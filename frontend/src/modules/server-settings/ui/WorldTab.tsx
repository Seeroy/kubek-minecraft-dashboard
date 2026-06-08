import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Gauge, Layers, Map, Users } from "lucide-react";

interface WorldSettingsProps {
  settings: Record<string, string>;
  onUpdateSetting: (key: string, value: string) => void;
}

export const WorldTab = ({ settings, onUpdateSetting }: WorldSettingsProps) => {
  const { t } = useTranslation("modules.serverSettings");
  const getValue = (key: string, defaultValue: string = "") => {
    return settings[key] || defaultValue;
  };

  return (
    <div className="space-y-6">
      {/* World Generation */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("world.worldGeneration.title")}
            title={t("world.worldGeneration.title")}
            description={t("world.worldGeneration.description")}
            icon={Map}
            color="green"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="level-seed">
              {t("world.worldGeneration.worldSeed")}
            </Label>
            <Input
              id="level-seed"
              value={getValue("level-seed")}
              onChange={(e) => onUpdateSetting("level-seed", e.target.value)}
              placeholder={t("world.worldGeneration.worldSeedPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-world-size">
              {t("world.worldGeneration.maxWorldSize")}
            </Label>
            <Input
              id="max-world-size"
              type="number"
              value={getValue("max-world-size")}
              onChange={(e) =>
                onUpdateSetting("max-world-size", e.target.value)
              }
            />
            <p className="text-sm text-muted-foreground">
              {t("world.worldGeneration.maxWorldSizeHelp")}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("world.worldGeneration.generateStructures")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("world.worldGeneration.generateStructuresDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("generate-structures") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("generate-structures", checked.toString())
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("world.performanceSettings.title")}
            title={t("world.performanceSettings.title")}
            description={t("world.performanceSettings.description")}
            icon={Gauge}
            color="purple"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="view-distance">
                {t("world.performanceSettings.viewDistance")}
              </Label>
              <Input
                id="view-distance"
                type="number"
                value={getValue("view-distance")}
                onChange={(e) =>
                  onUpdateSetting("view-distance", e.target.value)
                }
              />
              <p className="text-sm text-muted-foreground">
                {t("world.performanceSettings.viewDistanceHelp")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="simulation-distance">
                {t("world.performanceSettings.simulationDistance")}
              </Label>
              <Input
                id="simulation-distance"
                type="number"
                value={getValue("simulation-distance")}
                onChange={(e) =>
                  onUpdateSetting("simulation-distance", e.target.value)
                }
              />
              <p className="text-sm text-muted-foreground">
                {t("world.performanceSettings.simulationDistanceHelp")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimension Settings */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("world.dimensionSettings.title")}
            title={t("world.dimensionSettings.title")}
            description={t("world.dimensionSettings.description")}
            icon={Layers}
            color="orange"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("world.dimensionSettings.allowNether")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("world.dimensionSettings.allowNetherDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("allow-nether") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("allow-nether", checked.toString())
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Spawn Settings */}
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("world.spawnSettings.title")}
            title={t("world.spawnSettings.title")}
            description={t("world.spawnSettings.description")}
            icon={Users}
            color="blue"
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("world.spawnSettings.spawnAnimals")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("world.spawnSettings.spawnAnimalsDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("spawn-animals") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("spawn-animals", checked.toString())
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("world.spawnSettings.spawnMonsters")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("world.spawnSettings.spawnMonstersDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("spawn-monsters") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("spawn-monsters", checked.toString())
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("world.spawnSettings.spawnNpcs")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("world.spawnSettings.spawnNpcsDescription")}
              </p>
            </div>
            <Switch
              checked={getValue("spawn-npcs") === "true"}
              onCheckedChange={(checked) =>
                onUpdateSetting("spawn-npcs", checked.toString())
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

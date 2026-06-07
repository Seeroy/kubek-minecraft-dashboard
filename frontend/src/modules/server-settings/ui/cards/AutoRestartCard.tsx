import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { RefreshCw } from "lucide-react";
import { SaveStatus, SaveStatusIndicator } from "../SaveStatusIndicator";

interface AutoRestartCardProps {
  t: (path: string, ...args: any[]) => string;
  saveStatus: SaveStatus;
  restartOnError: { enabled: boolean; attempts: number };
  onRestartOnErrorChange: (enabled: boolean) => void;
  onRestartAttemptsChange: (attempts: number) => void;
}

export const AutoRestartCard = ({
  t,
  saveStatus,
  restartOnError,
  onRestartOnErrorChange,
  onRestartAttemptsChange,
}: AutoRestartCardProps) => {
  return (
    <Card>
      <CardHeader>
        <BlockHeader
          kicker={t("general.autoRestartSettings.title")}
          title={t("general.autoRestartSettings.title")}
          description={t("general.autoRestartSettings.description")}
          icon={RefreshCw}
          color="orange"
          actions={<SaveStatusIndicator status={saveStatus} />}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-row items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">
              {t("general.autoRestartSettings.enableAutoRestart")}
            </Label>
            <p className="text-sm text-muted-foreground">
              {t("general.autoRestartSettings.enableAutoRestartDescription")}
            </p>
          </div>
          <Switch
            checked={restartOnError.enabled}
            onCheckedChange={onRestartOnErrorChange}
          />
        </div>

        {restartOnError.enabled && (
          <div className="space-y-2">
            <Label htmlFor="restart-attempts" className="text-sm">
              {t("general.autoRestartSettings.maxRestartAttempts")}
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="restart-attempts"
                type="number"
                min="1"
                max="10"
                value={restartOnError.attempts}
                onChange={(e) =>
                  onRestartAttemptsChange(parseInt(e.target.value) || 3)
                }
                className="max-w-24"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("general.autoRestartSettings.maxRestartAttemptsHelp")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

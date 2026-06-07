import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { JavaVersion } from "@/api/java/java.model";
import { Loader2, Package, Plus } from "lucide-react";
import React from "react";

interface AvailableJavaVersionsTabProps {
  availableVersions: JavaVersion[];
  installedVersions: JavaVersion[];
  installingVersions: Set<string>;
  onInstall: (version: JavaVersion) => void;
}

const AvailableJavaVersionsTab: React.FC<AvailableJavaVersionsTabProps> = ({
  availableVersions,
  installedVersions,
  installingVersions,
  onInstall,
}) => {
  const { t } = useTranslation("modules.javaManager");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Package className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle>{t("available.title")}</CardTitle>
            <CardDescription>{t("available.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {availableVersions.map((version) => {
            const isInstalling = installingVersions.has(version.version);
            const isAlreadyInstalled = installedVersions.some(
              (v) => v.version === version.version
            );

            return (
              <Card key={version.version} className="p-5">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{version.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t("available.versionLabel", version.version)}
                      </p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => onInstall(version)}
                      disabled={isInstalling || isAlreadyInstalled}
                    >
                      {isInstalling ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isAlreadyInstalled ? (
                        t("available.installed")
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailableJavaVersionsTab;

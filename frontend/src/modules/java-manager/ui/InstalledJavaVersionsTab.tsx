import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { JavaVersion } from "@/api/java/java.model";
import { Cpu, Loader2, Server, Trash2 } from "lucide-react";
import React from "react";

interface ServerJavaUsage {
  serverId: string;
  serverName: string;
  javaVersion: string;
  isManaged: boolean;
}

interface InstalledJavaVersionsTabProps {
  installedVersions: JavaVersion[];
  serverUsage: ServerJavaUsage[];
  deletingVersions: Set<string>;
  onDelete: (version: JavaVersion) => void;
}

const InstalledJavaVersionsTab: React.FC<InstalledJavaVersionsTabProps> = ({
  installedVersions,
  serverUsage,
  deletingVersions,
  onDelete,
}) => {
  const { t } = useTranslation("modules.javaManager");
  const getVersionUsage = (version: string, isManaged: boolean) => {
    return serverUsage.filter(
      (usage) => usage.javaVersion === version && usage.isManaged === isManaged
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2">
            <Cpu className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <CardTitle>{t("installed.title")}</CardTitle>
            <CardDescription>{t("installed.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {installedVersions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-muted-foreground">
            <p className="font-medium">{t("installed.empty.title")}</p>
            <p className="text-sm">{t("installed.empty.description")}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {installedVersions.map((version) => {
              const usage = getVersionUsage(version.version, true);
              const isDeleting = deletingVersions.has(version.version);

              return (
                <Card key={version.version} className="p-5">
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{version.name}</h4>
                          <Badge variant="default">
                            {t("installed.badge")}
                          </Badge>
                        </div>
                        {version.vendor && (
                          <p className="text-sm text-muted-foreground">
                            {t("installed.vendor", version.vendor)}
                          </p>
                        )}
                        {version.runtime && (
                          <p className="text-sm text-muted-foreground">
                            {t("installed.runtime", version.runtime)}
                          </p>
                        )}
                        {usage.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Server className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {t("installed.usage", usage.length)}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(version)}
                        disabled={isDeleting || usage.length > 0}
                        className="text-destructive hover:text-destructive"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InstalledJavaVersionsTab;

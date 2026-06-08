import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Server } from "lucide-react";
import React from "react";

interface ServerJavaUsage {
  serverId: string;
  serverName: string;
  javaVersion: string;
  isManaged: boolean;
}

interface ServerJavaUsageTabProps {
  serverUsage: ServerJavaUsage[];
}

const ServerJavaUsageTab: React.FC<ServerJavaUsageTabProps> = ({
  serverUsage,
}) => {
  const { t } = useTranslation("modules.javaManager");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-500/10 p-2">
            <Server className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <CardTitle>{t("serverUsage.title")}</CardTitle>
            <CardDescription>{t("serverUsage.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {serverUsage.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-muted-foreground">
            <p className="font-medium">{t("serverUsage.empty.title")}</p>
            <p className="text-sm">{t("serverUsage.empty.description")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {serverUsage.map((usage) => (
              <div
                key={usage.serverId}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{usage.serverName}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "serverUsage.versionLabel",
                      usage.javaVersion,
                      usage.isManaged
                    )}
                  </p>
                </div>
                <Badge variant={usage.isManaged ? "default" : "outline"}>
                  {usage.isManaged
                    ? t("serverUsage.managed")
                    : t("serverUsage.system")}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServerJavaUsageTab;

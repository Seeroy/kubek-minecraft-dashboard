import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Archive, Plus } from "lucide-react";

interface BackupsHeaderProps {
  onCreateBackup: () => void;
}

export const BackupsHeader = ({ onCreateBackup }: BackupsHeaderProps) => {
  const { t } = useTranslation("modules.backups");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Archive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("page.header.title")}</CardTitle>
              <CardDescription>{t("page.header.description")}</CardDescription>
            </div>
          </div>
          <Button onClick={onCreateBackup} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("page.header.createButton")}
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
};

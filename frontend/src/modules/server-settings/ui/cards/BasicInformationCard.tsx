import BlobImage from "@/shared/ui/BlobImage";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Server, Settings, Upload } from "lucide-react";
import { SaveStatus, SaveStatusIndicator } from "../SaveStatusIndicator";

interface BasicInformationCardProps {
  t: (path: string, ...args: any[]) => string;
  saveStatus: SaveStatus;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isUploadingIcon: boolean;
  iconPreview: string | null;
  iconUrl: string | null;
  onIconUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  serverName: string;
  onServerNameChange: (value: string) => void;
  onServerNameBlur: () => void;
}

export const BasicInformationCard = ({
  t,
  saveStatus,
  fileInputRef,
  isUploadingIcon,
  iconPreview,
  iconUrl,
  onIconUpload,
  serverName,
  onServerNameChange,
  onServerNameBlur,
}: BasicInformationCardProps) => {
  return (
    <Card>
      <CardHeader>
        <BlockHeader
          kicker={t("general.basicInformation.title")}
          title={t("general.basicInformation.title")}
          description={t("general.basicInformation.description")}
          icon={Server}
          color="blue"
          actions={<SaveStatusIndicator status={saveStatus} />}
        />
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Server Icon */}
        <div className="space-y-3">
          <Label>{t("general.basicInformation.serverIcon")}</Label>
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted">
              {iconPreview || iconUrl ? (
                <BlobImage
                  src={iconPreview || iconUrl || ""}
                  alt={t("general.basicInformation.uploadIcon")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Settings className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onIconUpload}
                className="hidden"
                id="icon-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingIcon}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploadingIcon
                  ? t("general.basicInformation.uploading")
                  : t("general.basicInformation.uploadIcon")}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("general.basicInformation.recommendedFormat")}
              </p>
            </div>
          </div>
        </div>

        {/* Server Name */}
        <div className="space-y-2">
          <Label htmlFor="server-name">
            {t("general.basicInformation.serverName")}
          </Label>
          <Input
            id="server-name"
            value={serverName}
            onChange={(e) => onServerNameChange(e.target.value)}
            onBlur={onServerNameBlur}
            placeholder={t("general.basicInformation.serverNamePlaceholder")}
          />
        </div>
      </CardContent>
    </Card>
  );
};

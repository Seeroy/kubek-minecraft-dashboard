"use client";

import { useNotifications } from "@/modules/notifications";
import { useLanguageContext } from "@/shared/context/language-context";
import { useInstallBlueprintMutation } from "@/modules/server-types/api/server-types.queries";
import { Button } from "@/shared/ui/button";
import { Loader2, Package, TriangleAlert, UploadCloud } from "lucide-react";
import { useRef } from "react";

/** Install a blueprint from file */
export const BlueprintUploadZone = () => {
  const { notify } = useNotifications();
  const { t } = useLanguageContext();
  const install = useInstallBlueprintMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runInstall = async (file: File) => {
    try {
      const result = await install.mutateAsync(file);
      notify({
        title: t("modules.serverTypes.notifications.installed"),
        message: result.name,
        type: "success",
        duration: 5000,
        icon: Package,
      });
    } catch (error: unknown) {
      notify({
        title: t("modules.serverTypes.notifications.installFailed"),
        message:
          error instanceof Error
            ? error.message
            : t("modules.serverTypes.notifications.installError"),
        type: "error",
        duration: 8000,
        icon: TriangleAlert,
      });
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 rounded-xl border border-dashed border-muted p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <UploadCloud className="size-4" />
        {t("modules.serverTypes.upload.hint")}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".kbp,.json,.zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void runInstall(file);
        }}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={install.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        {install.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <UploadCloud className="size-4" />
        )}
        {t("modules.serverTypes.upload.choose")}
      </Button>
    </div>
  );
};

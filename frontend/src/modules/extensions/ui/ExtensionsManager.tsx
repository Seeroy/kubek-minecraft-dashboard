"use client";

import { useNotifications } from "@/modules/notifications";
import { useLanguageContext } from "@/shared/context/language-context";
import {
  useConsentExtensionMutation,
  useDisableExtensionMutation,
  useEnableExtensionMutation,
  useExtensions,
  useInstallExtensionMutation,
  useRemoveExtensionMutation,
} from "@/modules/extensions/api/extensions.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/PageLayout";
import {
  Blocks,
  Loader2,
  Power,
  Trash2,
  TriangleAlert,
  UploadCloud,
} from "lucide-react";
import { useRef } from "react";
import { ExtensionCard } from "./ExtensionCard";

export const ExtensionsManager = () => {
  const { notify } = useNotifications();
  const { t } = useLanguageContext();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const { data: extensions, isLoading } = useExtensions();
  const install = useInstallExtensionMutation();
  const consent = useConsentExtensionMutation();
  const enable = useEnableExtensionMutation();
  const disable = useDisableExtensionMutation();
  const remove = useRemoveExtensionMutation();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fail = (title: string, error: unknown) =>
    notify({
      title,
      message:
        error instanceof Error
          ? error.message
          : t("modules.extensions.notifications.operationFailed"),
      type: "error",
      duration: 8000,
      icon: TriangleAlert,
    });

  const runInstall = async (file: File) => {
    try {
      const result = await install.mutateAsync(file);
      notify({
        title: t("modules.extensions.notifications.installed"),
        message: result.manifest.name,
        type: "success",
        duration: 5000,
        icon: Blocks,
      });
    } catch (error) {
      fail(t("modules.extensions.notifications.installFailed"), error);
    }
  };

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("modules.extensions.header.kicker")}
        title={t("modules.extensions.header.title")}
        description={t("modules.extensions.header.description")}
        icon={Blocks}
        color="purple"
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <Alert variant="destructive" className="md:max-w-md">
          <TriangleAlert className="size-4" />
          <AlertTitle>
            {t("modules.extensions.securityNotice.title")}
          </AlertTitle>
          <AlertDescription>
            {t("modules.extensions.securityNotice.description")}
          </AlertDescription>
        </Alert>

        {isAdmin && (
          <div className="flex w-full flex-col gap-2 rounded-xl border border-dashed border-muted p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="size-4" />
              {t("modules.extensions.upload.hint")}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".kubekext,.zip,.json"
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
              {t("modules.extensions.upload.choose")}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("modules.extensions.list.loading")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(extensions ?? []).map((ext) => (
            <ExtensionCard
              key={ext.id}
              ext={ext}
              busy={
                consent.isPending ||
                enable.isPending ||
                disable.isPending ||
                remove.isPending
              }
              onConsent={async (caps) => {
                try {
                  await consent.mutateAsync({ id: ext.id, capabilities: caps });
                } catch (error) {
                  fail(
                    t("modules.extensions.notifications.consentFailed"),
                    error
                  );
                }
              }}
              onEnable={async () => {
                try {
                  await enable.mutateAsync(ext.id);
                  notify({
                    title: t("modules.extensions.notifications.enabled"),
                    message: ext.manifest.name,
                    type: "success",
                    duration: 4000,
                    icon: Power,
                  });
                } catch (error) {
                  fail(
                    t("modules.extensions.notifications.enableFailed"),
                    error
                  );
                }
              }}
              onDisable={async () => {
                try {
                  await disable.mutateAsync(ext.id);
                } catch (error) {
                  fail(
                    t("modules.extensions.notifications.disableFailed"),
                    error
                  );
                }
              }}
              onRemove={async () => {
                try {
                  await remove.mutateAsync(ext.id);
                  notify({
                    title: t("modules.extensions.notifications.removed"),
                    message: ext.manifest.name,
                    type: "success",
                    duration: 4000,
                    icon: Trash2,
                  });
                } catch (error) {
                  fail(
                    t("modules.extensions.notifications.removeFailed"),
                    error
                  );
                }
              }}
            />
          ))}
          {!(extensions ?? []).length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("modules.extensions.list.empty")}
            </p>
          )}
        </div>
      )}
    </PageLayout>
  );
};

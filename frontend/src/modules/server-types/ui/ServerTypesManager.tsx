"use client";

import { useNotifications } from "@/modules/notifications";
import { useLanguageContext } from "@/shared/context/language-context";
import {
  useBlueprints,
  useRemoveBlueprintMutation,
} from "@/modules/server-types/api/server-types.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { PageLayout } from "@/shared/ui/PageLayout";
import { Boxes, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { BlueprintCard } from "./BlueprintCard";
import { BlueprintSecurityNotice } from "./BlueprintSecurityNotice";
import { BlueprintUploadZone } from "./BlueprintUploadZone";

export const ServerTypesManager = () => {
  const { notify } = useNotifications();
  const { t } = useLanguageContext();
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const { data: blueprints, isLoading } = useBlueprints();
  const remove = useRemoveBlueprintMutation();

  const handleRemove = async (bp: BlueprintSummary) => {
    try {
      await remove.mutateAsync(bp.id);
      notify({
        title: t("modules.serverTypes.notifications.removed"),
        message: bp.name,
        type: "success",
        duration: 4000,
        icon: Trash2,
      });
    } catch (error: unknown) {
      notify({
        title: t("modules.serverTypes.notifications.removeFailed"),
        message:
          error instanceof Error
            ? error.message
            : t("modules.serverTypes.notifications.removeError"),
        type: "error",
        duration: 8000,
        icon: TriangleAlert,
      });
    }
  };

  const list = blueprints ?? [];

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("modules.serverTypes.header.kicker")}
        title={t("modules.serverTypes.header.title")}
        description={t("modules.serverTypes.header.description")}
        icon={Boxes}
        color="blue"
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <BlueprintSecurityNotice />
        {isAdmin && <BlueprintUploadZone />}
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("modules.serverTypes.list.loading")}
        </div>
      ) : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("modules.serverTypes.list.empty")}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((bp) => (
            <BlueprintCard
              key={bp.id}
              blueprint={bp}
              busy={remove.isPending}
              onRemove={() => void handleRemove(bp)}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
};

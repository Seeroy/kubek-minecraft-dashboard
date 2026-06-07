"use client";
import { useServerStore } from "@/modules/server";
import { useAllServerStatuses } from "@/modules/server/store/server-statuses.store";
import { useTranslation } from "@/shared/hooks/useTranslation";
import DashboardServerCard from "../../components/DashboardServerCard";

export default function AllServersWidget() {
  const { t } = useTranslation("modules.dashboard");
  const { servers, selectedServer, selectServer } = useServerStore();
  const statuses = useAllServerStatuses();

  if (servers.length === 0) {
    return <p className="text-sm text-muted-foreground">{ t("noServers") }</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      { servers.map((server) => (
        <DashboardServerCard
          key={ server.id }
          server={ server }
          status={ statuses[server.id] }
          selected={ server.id === selectedServer?.id }
          onSelect={ selectServer }
        />
      )) }
    </div>
  );
}

import { useTranslation } from "@/shared/hooks/useTranslation";
import { UserPermissions } from "@shared/types/user.types";
import {
  Activity,
  Archive,
  CalendarClock,
  CirclePlus,
  Coffee,
  Cog,
  Eye,
  FolderOpen,
  Power,
  Puzzle,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

export const useAvailablePermissions = () => {
  const { t } = useTranslation(
    "modules.createUserModal.modal.sections.permissions.list"
  );

  return [
    {
      id: UserPermissions.ACCOUNTS_MANAGEMENT,
      label: t("ACCOUNTS_MANAGEMENT.label"),
      description: t("ACCOUNTS_MANAGEMENT.description"),
      icon: Users,
      color: "bg-orange-500/10 text-orange-700 border-orange-200",
    },
    {
      id: UserPermissions.FILE_MANAGER,
      label: t("FILE_MANAGER.label"),
      description: t("FILE_MANAGER.description"),
      icon: FolderOpen,
      color: "bg-purple-500/10 text-purple-700 border-purple-200",
    },
    {
      id: UserPermissions.SERVERS_VIEW,
      label: t("SERVERS_VIEW.label"),
      description: t("SERVERS_VIEW.description"),
      icon: Eye,
      color: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
    },
    {
      id: UserPermissions.SERVERS_CONTROL,
      label: t("SERVERS_CONTROL.label"),
      description: t("SERVERS_CONTROL.description"),
      icon: Power,
      color: "bg-blue-500/10 text-blue-700 border-blue-200",
    },
    {
      id: UserPermissions.SERVERS_CONFIGURE,
      label: t("SERVERS_CONFIGURE.label"),
      description: t("SERVERS_CONFIGURE.description"),
      icon: Settings,
      color: "bg-slate-500/10 text-slate-700 border-slate-200",
    },
    {
      id: UserPermissions.CREATE_SERVERS,
      label: t("CREATE_SERVERS.label"),
      description: t("CREATE_SERVERS.description"),
      icon: CirclePlus,
      color: "bg-green-500/10 text-green-700 border-green-200",
    },
    {
      id: UserPermissions.MANAGE_JAVA,
      label: t("MANAGE_JAVA.label"),
      description: t("MANAGE_JAVA.description"),
      icon: Coffee,
      color: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
    },
    {
      id: UserPermissions.MANAGE_PLUGINS,
      label: t("MANAGE_PLUGINS.label"),
      description: t("MANAGE_PLUGINS.description"),
      icon: Puzzle,
      color: "bg-pink-500/10 text-pink-700 border-pink-200",
    },
    {
      id: UserPermissions.KUBEK_SETTINGS,
      label: t("KUBEK_SETTINGS.label"),
      description: t("KUBEK_SETTINGS.description"),
      icon: Cog,
      color: "bg-red-500/10 text-red-700 border-red-200",
    },
    {
      id: UserPermissions.BACKUPS,
      label: t("BACKUPS.label"),
      description: t("BACKUPS.description"),
      icon: Archive,
      color: "bg-indigo-500/10 text-indigo-700 border-indigo-200",
    },
    {
      id: UserPermissions.SYSTEM_MONITORING,
      label: t("SYSTEM_MONITORING.label"),
      description: t("SYSTEM_MONITORING.description"),
      icon: Activity,
      color: "bg-teal-500/10 text-teal-700 border-teal-200",
    },
    {
      id: UserPermissions.SCHEDULER_MANAGEMENT,
      label: t("SCHEDULER_MANAGEMENT.label"),
      description: t("SCHEDULER_MANAGEMENT.description"),
      icon: CalendarClock,
      color: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    },
    {
      id: UserPermissions.AUDIT_LOG,
      label: t("AUDIT_LOG.label"),
      description: t("AUDIT_LOG.description"),
      icon: ScrollText,
      color: "bg-violet-500/10 text-violet-700 border-violet-200",
    },
  ];
};

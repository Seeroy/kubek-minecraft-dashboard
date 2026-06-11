import type { TranslationDictionary } from "../../locales/types";
import { auditLogTranslations } from "./modules/auditLog";
import { authTranslations } from "./modules/auth";
import { backupsTranslations } from "./modules/backups";
import { commandPaletteTranslations } from "./modules/commandPalette";
import { commonModalsTranslations } from "./modules/commonModals";
import { componentsTranslations } from "./modules/components";
import { consoleTranslations } from "./modules/console";
import { createUserModalTranslations } from "./modules/createUserModal";
import { dashboardTranslations } from "./modules/dashboard";
import { diagnosticsTranslations } from "./modules/diagnostics";
import { editUserModalTranslations } from "./modules/editUserModal";
import { extensionsTranslations } from "./modules/extensions";
import { filesTranslations } from "./modules/files";
import { headerTranslations } from "./modules/header";
import { javaManagerTranslations } from "./modules/javaManager";
import { logViewerTranslations } from "./modules/logViewer";
import { modsTranslations } from "./modules/mods";
import { newServerModalTranslations } from "./modules/newServerModal";
import { notificationsTranslations } from "./modules/notifications";
import { oobeTranslations } from "./modules/oobe";
import { pluginsTranslations } from "./modules/plugins";
import { schedulerTranslations } from "./modules/scheduler";
import { serverSettingsTranslations } from "./modules/serverSettings";
import { serverTypesTranslations } from "./modules/serverTypes";
import { settingsTranslations } from "./modules/settings";
import { sharedTranslations } from "./modules/shared";
import { sidebarTranslations } from "./modules/sidebar";
import { socketsTranslations } from "./modules/sockets";
import { systemMonitoringTranslations } from "./modules/systemMonitoring";
import { whatsNewTranslations } from "./modules/whatsNew";

export const usTranslations: TranslationDictionary = {
  common: {
    code: "us",
    name: "English",
    author: "Seeroy",
  },
  modules: {
    plugins: pluginsTranslations,
    mods: modsTranslations,
    auth: authTranslations,
    backups: backupsTranslations,
    components: componentsTranslations,
    console: consoleTranslations,
    createUserModal: createUserModalTranslations,
    editUserModal: editUserModalTranslations,
    files: filesTranslations,
    header: headerTranslations,
    javaManager: javaManagerTranslations,
    newServerModal: newServerModalTranslations,
    notifications: notificationsTranslations,
    oobe: oobeTranslations,
    serverSettings: serverSettingsTranslations,
    settings: settingsTranslations,
    shared: sharedTranslations,
    sidebar: sidebarTranslations,
    sockets: socketsTranslations,
    systemMonitoring: systemMonitoringTranslations,
    scheduler: schedulerTranslations,
    logViewer: logViewerTranslations,
    commonModals: commonModalsTranslations,
    commandPalette: commandPaletteTranslations,
    diagnostics: diagnosticsTranslations,
    dashboard: dashboardTranslations,
    auditLog: auditLogTranslations,
    extensions: extensionsTranslations,
    serverTypes: serverTypesTranslations,
    whatsNew: whatsNewTranslations,
  },
};


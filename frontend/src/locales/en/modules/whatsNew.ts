import type { TranslationDictionary } from "../../../locales/types";

export const whatsNewTranslations: TranslationDictionary = {
  title: "Kubek updated",
  subtitle: "Here's what's new in this version",
  gotIt: "Got it",
  fullChangelog: "Full changelog on GitHub",
  releases: {
    "4-1-0": {
      redesign: "Refreshed design with a smarter layout that makes better use of the screen",
      monitoring: "Updated monitoring with CPU and RAM usage for every server",
      assistant: "AI assistant that can manage your servers",
      backups: "S3 backups, retention policies and a journal",
      roles: "Roles and access levels: ready-made roles, view, change or manage for every area",
      players: "Players page: online, whitelist, operators and bans",
      modpacks: "Modpack import from Modrinth and .mrpack",
      notifications: "Notification center with channel settings",
      security: "Security fixes",
      agreement: "Updated license agreement",
    },
    "4-0-2": {
      windowsLaunch: "Fixed launching servers on Windows when the Java path contains spaces",
    },
    "4-0-1": {
      docker: "Run servers in Docker containers",
      builtinCores: "Built-in cores now run in Docker",
      pty: "PTY terminal emulator with server hints",
      customCore: "Upload your own core in server settings",
      sidebar: "Reworked sidebar logic",
    },
  },
};

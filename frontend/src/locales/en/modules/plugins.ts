import type { TranslationDictionary } from "../../../locales/types";

export const pluginsTranslations: TranslationDictionary = {
  dashboard: {
    header: {
      title: "Plugins",
      description: "Install and manage server plugins",
    },
    states: {
      noServer: {
        title: "Select a server to continue",
        description: "Choose a server from the sidebar to manage plugins",
      },
      notAvailable: {
        title: "Plugins not available",
        description:
          "Plugins are not supported for Bedrock Edition servers. Only Java Edition servers support plugins",
      },
    },
    tabs: {
      installed: "Installed",
      available: "Available",
    },
    actions: {
      refresh: "Refresh",
      refreshing: "Refreshing",
    },
    notifications: {
      loadInstalledFailed: "Failed to load installed plugins",
      selectServerFirst: "Select a server before installing plugins",
      missingProjectId: "Unable to determine plugin identifier",
      manualRemoveSuccess: (fileName: string) => `Removed ${ fileName }`,
      manualRemoveFailed: "Failed to remove manual plugin",
    },
  },
  installedTab: {
    kicker: "Plugins",
    title: "Installed plugins",
    loading: "Loading installed plugins…",
    emptyTitle: "No plugins installed yet",
    emptyDescription:
      "Switch to the Available tab to discover plugins and install them with a single click",
    table: {
      headers: {
        name: "Name",
        version: "Version",
        status: "Status",
        file: "File",
        installed: "Installed",
      },
    },
  },
  installedCard: {
    badges: {
      update: "Update available",
      manual: "Manual",
      dependency: "Dependency",
    },
    tooltips: {
      updateAvailable: "Newer version available",
      updateButton: "Update available",
      reinstallButton: "Reinstall",
      removeButton: "Remove plugin",
    },
    labels: {
      installedOn: (date: string) => `Installed ${ date }`,
      installedAt: (timestamp: string) => `Installed at ${ timestamp }`,
    },
  },
  availableTab: {
    kicker: "Plugins",
    title: "Modrinth catalog",
    description: "Search Modrinth for Paper & Bukkit-compatible plugins",
    inputPlaceholder: "Search Modrinth plugins…",
    summary: {
      projectsFound: (count: number) =>
        `${ count.toLocaleString() } project${ count === 1 ? "" : "s" } found`,
      none: "No projects found",
      showing: (count: number) => `Showing ${ count.toLocaleString() } results`,
    },
    loading: {
      searching: "Looking up Modrinth…",
      more: "Loading more plugins…",
      end: "No more plugins to load",
    },
    notifications: {
      searchFailed: "Failed to query Modrinth catalog",
    },
    tooltips: {
      disabledInstall: "Select a server to install this plugin",
      unsupported: "This plugin is not supported on the server side",
    },
    buttons: {
      install: "Install",
    },
    labels: {
      versions: "Versions:",
      downloads: (count: number) => `${ count.toLocaleString() } downloads`,
      followers: (count: number) => `${ count.toLocaleString() } followers`,
    },
  },
  catalogCard: {
    badges: {
      categoriesOverflow: (count: number) => `+${ count } more`,
      versionsOverflow: (count: number) => `+${ count } more`,
    },
  },
  modals: {
    install: {
      title: {
        install: "Install Plugin",
        update: "Update Plugin",
      },
      actionLabel: {
        install: "Install plugin",
        update: "Update plugin",
      },
      description: {
        default: "Select version and configure installation options",
        resolving: (title: string, versionLabel: string) =>
          `${ title } - ${ versionLabel }`,
        loadingVersionsFallback: "Loading versions...",
        selectVersionFallback: "Select version",
      },
      states: {
        loadingDetails: "Loading plugin details",
        noSelectionTitle: "No plugin selected",
        noSelectionDescription:
          "Choose a plugin from the catalog to begin installation",
      },
      sections: {
        versionSelection: "Version Selection",
        compatibility: "Compatibility",
        installDependencies: "Install Dependencies",
        changelog: "Changelog",
        manualDependenciesTitle: "Manual Installation Required",
        manualDependenciesDescription:
          "Some dependencies require manual installation:",
        unknownProject: "Unknown project",
        requiredDependencies: (count: number) =>
          `${ count } required dependenc${
            count === 1 ? "y" : "ies"
          } will be installed:`,
        noAutoDependencies: "No auto-installable dependencies found",
        versionDownloads: (count: number) =>
          `${ count.toLocaleString() } downloads`,
        moreCount: (count: number) => `+${ count } more`,
      },
      controls: {
        chooseVersion: "Choose version",
      },
      statuses: {
        loadingVersions: "Loading versions...",
        noVersions: "No versions available",
      },
      buttons: {
        cancel: "Cancel",
        install: "Install plugin",
        update: "Update plugin",
        installing: "Installing...",
        updating: "Updating...",
        viewModrinth: "View on Modrinth",
      },
      notifications: {
        loadProjectFailed: "Failed to load plugin data",
        loadVersionsFailed: "Failed to load plugin versions",
        missingServer: "Select a server and version to continue",
        missingIdentifier: "Plugin identifier is missing",
        installationScheduled: "Plugin installation scheduled",
        updateScheduled: "Plugin update scheduled",
        startFailed: "Failed to start installation",
      },
    },
    remove: {
      title: "Remove plugin",
      description: {
        withName: (name: string) => `This will delete ${ name } from the server`,
        fallback: "Confirm plugin removal",
      },
      summary: {
        unknownPlugin: "Unknown plugin",
        unknownVersion: "Unknown",
        version: (version: string) => `Version ${ version }`,
        emptyState: "Select a plugin to continue",
      },
      options: {
        removeDependants: "Remove dependent plugins",
        removeDependantsDescription:
          "Automatically remove plugins that were installed as dependencies",
      },
      buttons: {
        cancel: "Cancel",
        remove: "Remove plugin",
        removing: "Removing…",
      },
      notifications: {
        missingDetails: "Plugin details missing",
        removeFailed: "Failed to remove plugin",
      },
    },
  },
};

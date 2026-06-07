import type { TranslationDictionary } from "../../../locales/types";

export const modsTranslations: TranslationDictionary = {
  dashboard: {
    header: {
      title: "Mods",
      description: "Install and manage server mods",
    },
    states: {
      noServer: {
        title: "Select a server to continue",
        description: "Choose a server from the sidebar to manage mods",
      },
      notAvailable: {
        title: "Mods not available",
        description:
          "Mods are only supported on servers with a mod loader (Fabric)",
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
      loadInstalledFailed: "Failed to load installed mods",
      selectServerFirst: "Select a server before installing mods",
      missingProjectId: "Unable to determine mod identifier",
      manualRemoveSuccess: (fileName: string) => `Removed ${ fileName }`,
      manualRemoveFailed: "Failed to remove manual mod",
    },
  },
  installedTab: {
    kicker: "Mods",
    title: "Installed mods",
    loading: "Loading installed mods…",
    emptyTitle: "No mods installed yet",
    emptyDescription:
      "Switch to the Available tab to discover mods and install them with a single click",
  },
  installedCard: {
    badges: {
      update: "Update",
      manual: "Manual",
      dependency: "Dependency",
    },
    tooltips: {
      updateAvailable: "Newer version available",
      updateButton: "Update available",
      reinstallButton: "Reinstall",
      removeButton: "Remove mod",
    },
    labels: {
      installedOn: (date: string) => `Installed ${ date }`,
      installedAt: (timestamp: string) => `Installed at ${ timestamp }`,
    },
  },
  availableTab: {
    kicker: "Mods",
    title: "Modrinth catalog",
    description: "Search Modrinth for Fabric mods",
    inputPlaceholder: "Search Modrinth mods…",
    summary: {
      projectsFound: (count: number) =>
        `${ count.toLocaleString() } project${ count === 1 ? "" : "s" } found`,
      none: "No projects found",
      showing: (count: number) => `Showing ${ count.toLocaleString() } results`,
    },
    loading: {
      searching: "Looking up Modrinth…",
      more: "Loading more mods…",
      end: "No more mods to load",
    },
    notifications: {
      searchFailed: "Failed to query Modrinth catalog",
    },
    tooltips: {
      disabledInstall: "Select a server to install this mod",
      unsupported: "This mod is not supported on the server side",
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
        install: "Install Mod",
        update: "Update Mod",
      },
      actionLabel: {
        install: "Install mod",
        update: "Update mod",
      },
      description: {
        default: "Select version and configure installation options",
        resolving: (title: string, versionLabel: string) =>
          `${ title } - ${ versionLabel }`,
        loadingVersionsFallback: "Loading versions...",
        selectVersionFallback: "Select version",
      },
      states: {
        loadingDetails: "Loading mod details",
        noSelectionTitle: "No mod selected",
        noSelectionDescription:
          "Choose a mod from the catalog to begin installation",
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
        install: "Install mod",
        update: "Update mod",
        installing: "Installing...",
        updating: "Updating...",
        viewModrinth: "View on Modrinth",
      },
      notifications: {
        loadProjectFailed: "Failed to load mod data",
        loadVersionsFailed: "Failed to load mod versions",
        missingServer: "Select a server and version to continue",
        missingIdentifier: "Mod identifier is missing",
        installationScheduled: "Mod installation scheduled",
        updateScheduled: "Mod update scheduled",
        startFailed: "Failed to start installation",
      },
    },
    remove: {
      title: "Remove mod",
      description: {
        withName: (name: string) => `This will delete ${ name } from the server`,
        fallback: "Confirm mod removal",
      },
      summary: {
        unknownPlugin: "Unknown mod",
        unknownVersion: "Unknown",
        version: (version: string) => `Version ${ version }`,
        emptyState: "Select a mod to continue",
      },
      options: {
        removeDependants: "Remove dependent mods",
        removeDependantsDescription:
          "Automatically remove mods that were installed as dependencies",
      },
      buttons: {
        cancel: "Cancel",
        remove: "Remove mod",
        removing: "Removing…",
      },
      notifications: {
        missingDetails: "Mod details missing",
        removeFailed: "Failed to remove mod",
      },
    },
  },
};

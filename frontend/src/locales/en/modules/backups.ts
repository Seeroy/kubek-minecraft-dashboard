import type { TranslationDictionary } from "../../../locales/types";

export const backupsTranslations: TranslationDictionary = {
  page: {
    noServerSelected: "Please select a server to view backups",
    header: {
      kicker: "Backups",
      title: "Backup Management",
      description: "Create and manage server backups",
      createButton: "Create Backup",
    },
    loading: "Loading backups...",
  },
  table: {
    headers: {
      name: "Name",
      type: "Type",
      status: "Status",
      created: "Created",
      size: "Size",
      files: "Files",
    },
    actions: {
      download: "Download",
      restore: "Restore",
      delete: "Delete",
    },
    types: {
      full: "Full",
      partial: "Partial",
    },
  },
  filters: {
    searchPlaceholder: "Search backups...",
    status: {
      all: "All Status",
      completed: "Completed",
      creating: "Creating",
      failed: "Failed",
      paused: "Paused",
    },
  },
  emptyState: {
    noBackups: {
      title: "No backups yet",
      description: "Create your first backup to get started with backup management",
      createButton: "Create Backup",
    },
    noMatches: {
      title: "No backups found",
      description: "No backups match your current filters. Try adjusting your search criteria",
    },
  },
  modals: {
    createBackup: {
      title: "Create New Backup",
      description: "Configure your backup settings. The backup will be created in the background",
      form: {
        name: {
          label: "Backup Name *",
          placeholder: "Enter backup name",
        },
        description: {
          label: "Description",
          placeholder: "Optional description",
        },
        type: {
          label: "Backup Type",
          options: {
            full: "Full Backup",
            partial: "Partial Backup",
          },
        },
        advanced: {
          title: "Advanced Settings",
          format: {
            label: "Format",
            options: {
              zip: "ZIP",
              tarGz: "TAR.GZ",
            },
          },
          compressionRatio: {
            label: (value: number) => `Compression Ratio: ${ value }`,
            min: "Fast (1)",
            max: "Best (9)",
          },
          exclusions: {
            label: "Exclude Files/Directories (Glob Patterns)",
            placeholder: "e.g., *.log, cache/**, temp/*",
            addButton: "Add",
            description: "Use glob patterns to exclude files or directories from the backup. Examples: *.log (all log files), cache/** (cache directory and contents)",
          },
        },
        selectionMode: {
          label: "Selection Mode",
          options: {
            all: "All Files",
            custom: "Custom Selection",
          },
        },
        fileSelection: {
          label: "Select Files",
          loading: "Loading files...",
          selected: "Selected",
          count: (count: number) => `${ count } file(s) selected`,
        },
        buttons: {
          cancel: "Cancel",
          create: "Create Backup",
          creating: "Creating…",
        },
      },
      notifications: {
        loadFilesFailed: "Failed to load files",
        loadFilesFailedMessage: "Could not load server files for selection",
        noServerSelected: "No server selected",
        noServerSelectedMessage: "Please select a server before creating a backup",
        createFailed: "Failed to create backup",
        createFailedMessage: "Something went wrong while creating the backup",
      },
    },
    backupInfo: {
      types: {
        full: "Full Backup",
        partial: "Partial Backup",
      },
      sections: {
        created: "Created",
        sizeAndFiles: "Size & Files",
        format: "Format",
        serverId: "Server ID",
        additionalInfo: "Additional Information",
        backupId: "Backup ID:",
        path: "Path:",
        compressionRatio: "Compression Ratio:",
        compressionRatioValue: (ratio: number) => `${ ratio }/9`,
        excludedPatterns: "Excluded Patterns:",
        timestamps: "Timestamps",
        lastUpdated: "Last Updated:",
      },
      formats: {
        zip: "ZIP",
        tarGz: "TAR.GZ",
      },
      fileCount: (count: number) => `${ count } file${ count === 1 ? '' : 's' }`,
      lastUpdatedFormat: (date: string, time: string) => `${ date } at ${ time }`,
    },
  },
  notifications: {
    loadFailed: "Failed to load backups",
    loadFailedMessage: "Could not load backup history",
    downloadFailed: "Download failed",
    downloadFailedMessage: "Could not download the backup file",
    restoreStarted: "Restore started",
    restoreStartedMessage: (name: string) => `Restoration of "${ name }" has been queued`,
    restoreFailed: "Restore failed",
    restoreFailedMessage: "Could not start backup restoration",
    deleteStarted: "Deletion started",
    deleteStartedMessage: (name: string) => `Deletion of "${ name }" has been queued`,
    deleteFailed: "Deletion failed",
    deleteFailedMessage: "Could not start backup deletion",
  },
  validations: {
    nameRequired: "Backup name is required",
    nameMax: "Backup name must be less than 100 characters",
    descriptionMax: "Description must be less than 500 characters",
    typeRequired: "Backup type is required",
    compressionRatioRange: "Compression ratio must be between 1 and 9",
    formatRequired: "Format is required",
    selectionModeRequired: "Selection mode is required",
    exclusionEmpty: "Exclusion pattern cannot be empty",
    exclusionMax: "Exclusion pattern must be less than 200 characters",
    exclusionInvalid: "Exclusion pattern contains invalid characters",
    customSelectionRequired: "At least one file must be selected for custom partial backups",
  },
};
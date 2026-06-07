import type { TranslationDictionary } from "../../../locales/types";

export const createUserModalTranslations: TranslationDictionary = {
  modal: {
    title: "Create New User",
    description: "Add a new user account with specific permissions and server access",
    sections: {
      basicInfo: {
        title: "Basic Information",
        description: "User credentials and details",
        username: {
          label: "Username",
          placeholder: "Enter username"
        },
        password: {
          label: "Password",
          placeholder: "Enter password",
          editLabel: "(leave empty to keep current)",
          editPlaceholder: "Leave empty to keep current password"
        }
      },
      serverAccess: {
        title: "Server Access",
        description: "Control which servers user can access",
        restrictAccess: "Restrict Access",
        picker: {
          placeholder: "Select servers",
          selectedCount: (count: number) => `${ count } server${ count === 1 ? '' : 's' } selected`,
          search: "Search servers...",
          selectAll: "Select all",
          clear: "Clear",
          notFound: "No servers found",
          noServers: "No servers available",
          remove: "Remove server"
        },
        emptyState: {
          title: "No servers selected",
          description: "Choose the servers this user will have access to"
        }
      },
      permissions: {
        title: "Permissions",
        description: "Select user access permissions",
        selectedCount: (count: number) => `${ count } selected`,
        list: {
          ACCOUNTS_MANAGEMENT: {
            label: "Accounts",
            description: "Manage user accounts"
          },
          FILE_MANAGER: {
            label: "File Manager",
            description: "Access file management"
          },
          SERVERS_VIEW: {
            label: "View Servers",
            description: "View server list, status, and logs"
          },
          SERVERS_CONTROL: {
            label: "Control Servers",
            description: "Start, stop, restart servers and send console commands"
          },
          SERVERS_CONFIGURE: {
            label: "Configure Servers",
            description: "Edit server properties, settings, icon, and delete servers"
          },
          CREATE_SERVERS: {
            label: "Create Servers",
            description: "Create new servers"
          },
          MANAGE_JAVA: {
            label: "Java",
            description: "Manage Java versions"
          },
          MANAGE_PLUGINS: {
            label: "Plugins",
            description: "Install and manage plugins"
          },
          KUBEK_SETTINGS: {
            label: "System Settings",
            description: "Access panel settings"
          },
          BACKUPS: {
            label: "Backups",
            description: "Create and manage backups"
          },
          SYSTEM_MONITORING: {
            label: "System Monitoring",
            description: "Monitor system resources"
          },
          SCHEDULER_MANAGEMENT: {
            label: "Task Scheduler",
            description: "Create and manage scheduled tasks"
          },
          AUDIT_LOG: {
            label: "Audit Log",
            description: "View the action history / audit log"
          }
        }
      }
    },
    buttons: {
      cancel: "Cancel",
      create: {
        default: "Create User",
        loading: "Creating..."
      }
    }
  },
  validation: {
    username: {
      min: "Username must be at least 3 characters",
      max: "Username must be at most 32 characters",
      regex: "Username can only contain letters, numbers and underscores"
    },
    password: {
      min: "Password must be at least 6 characters",
      max: "Password must be at most 64 characters",
      edit: "Password must be at least 6 characters and at most 64 characters"
    },
    servers: {
      empty: "Server name cannot be empty"
    },
    permissions: {
      min: "At least one permission is required"
    }
  }
};
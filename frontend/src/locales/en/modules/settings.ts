import type { TranslationDictionary } from "../../../locales/types";

export const settingsTranslations: TranslationDictionary = {
  header: {
    title: "Panel Settings",
    description: "Configure global panel preferences, security, and integrations",
  },
  general: {
    colorTheme: {
      title: "Color Theme",
      description: "Choose a color scheme for the application"
    },
    language: {
      title: "Language",
      description: "Select your preferred language",
      placeholder: "Choose language"
    },
    notifications: {
      title: "Notifications",
      description: "Personal browser preferences for notifications",
      sound: {
        label: "Notification sound",
        description: "Play a sound when a notification arrives while the tab is in the background"
      }
    },
    panelConfiguration: {
      title: "Panel Configuration",
      description: "Basic panel settings and network configuration",
      port: {
        label: "Panel Port",
        description: "Port on which the panel will be accessible"
      }
    },
    ftp: {
      title: "FTP Service",
      description: "Configure FTP file access settings",
      enable: {
        label: "Enable FTP Service",
        description: "Allow file access via FTP protocol"
      },
      username: "FTP Username",
      password: "FTP Password",
      passwordPlaceholder: "Enter password",
      port: "FTP Port",
      connectionDetails: {
        title: "FTP Connection Details",
        description: "Use these details to connect with an external FTP client",
        host: "Host",
        port: "Port",
        username: "Username",
        password: "Your panel password",
        instructions: "Use an external FTP client (like FileZilla, WinSCP, or Cyberduck) to connect using your panel username and password. The FTP server provides access to your server files organized by server ID"
      }
    }
  },
  security: {
    title: "Security Settings",
    description: "Configure access control and network restrictions",
    authorization: {
      label: "Authorization Required",
      description: "Require users to log in to access the panel"
    },
    subnets: {
      label: "Subnet Access Restriction",
      description: "Restrict access to specific IP subnets",
      allowed: "Allowed Subnets",
      add: "Add Subnet",
      example: "e.g., 192.168.1.0/24",
      empty: {
        title: "No subnets configured",
        description: "Add subnets to restrict access"
      }
    },
    telemetry: {
      title: "Telemetry",
      description: "Anonymous usage statistics and diagnostics",
      toggleLabel: "Send anonymous statistics",
      toggleDescriptionStart: "Disable to stop sending any data. Can also be forced off via the",
      toggleDescriptionEnd: "environment variable"
    }
  },
  telegram: {
    title: "Telegram Bot",
    beta: "Beta",
    description: "Configure Telegram bot notifications",
    enable: {
      label: "Enable Telegram Bot",
      description: "Receive notifications via Telegram bot"
    },
    token: {
      label: "Bot Token",
      placeholder: "Enter your bot token",
      help: "Get this from @BotFather on Telegram"
    },
    botInfo: {
      title: "Bot Information",
      validating: "Validating token...",
      valid: "Token is valid",
      error: "Failed to fetch bot info"
    },
    linking: {
      title: "Telegram Account Linking",
      generateOtp: "Generate OTP",
      otp: {
        code: "OTP Code:",
        expiresIn: "Expires in:",
        unit: "seconds",
        help: "Send this code to your Telegram bot to link your account"
      }
    },
    users: {
      title: "Authorized Telegram Users",
      loading: "Loading linked users...",
      table: {
        avatar: "Avatar",
        username: "Username",
        telegramId: "Telegram ID",
        createdAt: "Created At",
        createdBy: "Created By",
        actions: "Actions",
        remove: "Remove"
      },
      empty: {
        title: "No users linked yet",
        description: "Users can link their accounts using the OTP above"
      }
    }
  },
  users: {
    title: "User Accounts",
    description: "Manage all user accounts and their permissions",
    add: "Add User",
    empty: {
      title: "No users found",
      description: "Create your first user to start managing server access and permissions",
      create: "Create First User"
    }
  },
  accountCard: {
    admin: "Admin",
    serverAccess: "Server Access: ",
    noServers: "No servers allowed",
    allServers: "All Servers",
    permissions: "Permissions",
    noPermissions: "No permissions assigned",
    edit: "Edit",
    delete: "Delete"
  },
  tabs: {
    general: "General",
    security: "Security",
    telegram: "Telegram",
    users: "Users",
    sessions: "Sessions",
    about: "About"
  },
  about: {
    info: {
      tagline: "Open-source control panel for game servers",
      checking: "Checking for updates…",
      upToDate: "You're on the latest version",
      updateAvailable: "Update available",
      updateCta: "Open release",
      checkFailed: "Could not check for updates",
      links: {
        github: "Repository",
        releases: "All releases",
        issues: "Report an issue"
      }
    },
    changelog: {
      header: {
        kicker: "Updates",
        title: "Changelog",
        description: "Latest releases from the GitHub repository"
      },
      latest: "Latest",
      prerelease: "Pre-release",
      viewOnGithub: "View on GitHub",
      empty: "No releases published yet",
      error: "Failed to load the changelog",
      retry: "Retry"
    }
  },
  sessions: {
    header: {
      kicker: "Security",
      title: "Active Sessions",
      description: "Devices currently signed in to your account",
    },
    buttons: {
      signOutOther: "Sign out other sessions",
      revoke: "Revoke",
    },
    notifications: {
      revoked: "Session revoked",
      revokeOthers: "All other sessions revoked",
    },
    labels: {
      thisDevice: "This device",
      ip: "IP",
      unknown: "unknown",
      unknownDevice: "Unknown device",
      unknownOs: "Unknown OS",
      justNow: "just now",
      lastSeen: "Last seen",
      created: "Created",
    },
    empty: "No active sessions",
  },
  notifications: {
    settingsSaved: "Settings saved successfully",
    userCreated: "User created successfully",
    userUpdated: "User updated successfully",
    userDeleted: "User deleted successfully",
  },
  twoFactorTab: {
    loading: "Loading…",
    header: {
      kicker: "Two-factor authentication",
      title: "Two-factor authentication",
      description: "Extra sign-in protection via a TOTP app or Telegram",
    },
    totp: {
      title: "TOTP app",
      enabled: "enabled",
      disabled: "disabled",
      description: "Google Authenticator, 1Password, Authy and other RFC 6238-compatible apps.",
      disable: "Disable",
      connect: "Set up",
    },
    telegram: {
      title: "Telegram confirmation",
      enabled: "enabled",
      disabled: "disabled",
      available: "The bot will send a request with Approve / Deny buttons",
      unavailable: "Link a Telegram account in the Telegram tab first.",
    },
    primary: {
      label: "Primary method",
      hint: "Used by default at sign-in.",
    },
    notifications: {
      kicker: "Notifications",
      title: "Task notifications",
      description: "Send scheduler task results to Telegram",
      toggleLabel: "Notify about tasks",
      available: "Messages about finished tasks will arrive in the linked Telegram account",
      unavailable: "Link a Telegram account in the Telegram tab first.",
    },
    setupDialog: {
      title: "Set up TOTP",
      description: "Scan the QR code in your authenticator app and enter the 6-digit code.",
      manualHint: "If you can't scan it, enter the key manually:",
      codeLabel: "Code from the app",
      cancel: "Cancel",
      confirm: "Confirm",
    },
    disableDialog: {
      title: "Disable TOTP",
      description: "Confirm the action with your password.",
      passwordLabel: "Password",
      cancel: "Cancel",
      disable: "Disable",
    },
    toasts: {
      setupFailed: "Failed to start setup",
      totpEnabled: "TOTP enabled",
      invalidCode: "Invalid code",
      totpDisabled: "TOTP disabled",
      invalidPassword: "Invalid password",
      telegramEnabled: "Telegram 2FA enabled",
      telegramDisabled: "Telegram 2FA disabled",
      toggleFailed: "Failed to change the setting",
      saveFailed: "Failed to save",
    },
  },
  buttons: {
    save: "Save Changes",
    saving: "Saving...",
    saved: "Saved!",
    error: "Error!"
  },
  loading: "Loading settings...",
  themes: {
    default: "Default",
    amber: "Amber",
    amethyst: "Amethyst",
    cosmicNight: "Cosmic night",
    mocha: "Mocha",
    green: "Emerald"
  },
  validation: {
    ftp: {
      usernameRequired: "Username is required when FTP is enabled",
      passwordRequired: "Password is required when FTP is enabled",
      portRequired: "Port is required when FTP is enabled",
      portRange: "Port must be between 1 and 65535"
    },
    subnets: {
      required: "At least one subnet is required when restriction is enabled"
    },
    telegram: {
      tokenRequired: "Token is required when Telegram bot is enabled"
    },
    port: {
      required: "Port is required",
      range: "Port must be between 1 and 65535"
    }
  }
};
import type { TranslationDictionary } from "../../../locales/types";

export const consoleTranslations: TranslationDictionary = {
  commandInput: {
    placeholder: "Enter command",
  },
  header: {
    kicker: "Console",
    title: "Server Console",
    description: "View live logs and run commands on the selected server",
  },
  console: {
    noServerSelected: "No server selected",
    noLogs: "No logs yet. Server logs will appear here",
    cards: {
      address: "Address",
      copyAddress: "Copy address",
      version: "Version",
      players: "Players",
      playersOnline: "Players online",
      serverEmpty: "Server is empty",
      status: "Status",
      uptime: "Uptime",
      lastUpdate: "Updated",
      bufferedLogs: "Log buffer",
    },
    status: {
      online: "Online",
      offline: "Offline",
      running: "Running",
      stopped: "Stopped",
      active: "Active",
      inactive: "Inactive",
      starting: "Starting",
      restarting: "Restarting",
      stopping: "Stopping",
      error: "Error",
      crashed: "Crashed",
      unknown: "Unknown",
    },
  },
  kubekLogLine: {
    notSpecified: "Not specified",
    unknownUser: "Unknown user",
    badges: {
      telegram: "Telegram",
      kubek: "Kubek",
    },
    userInput: {
      executedCommand: " executed command: ",
      labels: {
        user: "👤 User:",
        id: "🆔 ID:",
        exactTime: "🕒 Exact time:",
      },
    },
    statusChange: {
      statusChanged: "Server status changed: ",
      labels: {
        status: "📊 Status:",
        exactTime: "🕒 Exact time:",
      },
    },
    stop: {
      serverStopped: "Server stopped",
      exitCode: "(exit code: ",
      labels: {
        cause: "🛑 Cause:",
        exitCode: "🔢 Exit code:",
        exactTime: "🕒 Exact time:",
      },
    },
    restartFailed: {
      failedToRestart: "Failed to restart server after ",
      attempts: " attempts",
      labels: {
        attempts: "⚠️ Attempts:",
        exactTime: "🕒 Exact time:",
      },
    },
    botControl: {
      controlledViaTelegram: " controlled server via Telegram: ",
      labels: {
        user: "👤 User:",
        userId: "🆔 User ID:",
        telegramId: "🤖 Telegram ID:",
        action: "🎮 Action:",
        exactTime: "🕒 Exact time:",
      },
    },
  },
};

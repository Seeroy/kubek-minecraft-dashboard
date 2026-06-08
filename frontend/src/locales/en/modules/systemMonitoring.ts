import type { TranslationDictionary } from "../../../locales/types";

export const systemMonitoringTranslations: TranslationDictionary = {
  header: {
    title: "System Monitoring",
    description: "Real-time overview of system resources and performance",
  },
  dashboard: {
    loadError: "Failed to load system monitoring data",
  },
  cpu: {
    title: "CPU Usage",
    noData: "No CPU usage data available",
    overallUsage: "Overall Usage",
    usageOverTime: "Usage Over Time",
    tooltip: "CPU Usage",
  },
  ram: {
    title: "RAM Usage",
    noData: "No RAM usage data available",
    memoryUsage: "Memory Usage",
    used: "used",
    free: "free",
    total: "Total",
    usedLabel: "Used",
    available: "Available",
    swapUsage: "Swap Usage",
    usageOverTime: "Usage Over Time",
    tooltip: "RAM Usage",
  },
  disk: {
    used: "Used",
    usedPercent: "used",
    free: "free",
    available: "Available",
    total: "Total",
  },
  systemInfo: {
    title: "System Information",
    noData: "No system information available",
    hostname: "Hostname",
    platform: "Platform",
    architecture: "Architecture",
    release: "Release",
    uptime: "Uptime",
    cpuModel: "CPU Model",
    cpuCores: "CPU Cores",
  },
  hook: {
    fetchError: "Failed to fetch system monitoring data",
  },
  window: {
    now: "Now",
    "1h": "1 hour",
    "6h": "6 hours",
    "12h": "12 hours",
    "24h": "24 hours",
  },
  history: {
    kicker: "History",
    title: "Resource usage",
    description: "CPU and RAM over the selected period",
    cpu: "CPU",
    ram: "RAM",
    noData: "No data",
    loading: "Loading history...",
  },
};
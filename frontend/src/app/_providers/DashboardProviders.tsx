"use client";
import { CommandPaletteProvider } from "@/modules/command-palette";
import { ExtensionRuntimeProvider } from "@/modules/extensions";
import { ServerStatusNotifier, TaskNotificationsBridge } from "@/modules/notifications";
import { ServerCreationBridge } from "@/modules/server";
import { HostMetricsBridge } from "@/modules/system-monitoring/ui/HostMetricsBridge";
import { WhatsNewBridge } from "@/modules/whats-new";
import { GlobalModalsRegistration } from "./GlobalModals";

// Everything that only makes sense signed in, kept out of the login bundle
export function DashboardProviders() {
  return (
    <>
      <GlobalModalsRegistration />
      <WhatsNewBridge />
      <TaskNotificationsBridge />
      <ServerCreationBridge />
      <ServerStatusNotifier />
      <CommandPaletteProvider />
      <ExtensionRuntimeProvider />
      <HostMetricsBridge />
    </>
  );
}

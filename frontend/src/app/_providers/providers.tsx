import DocumentTitle from "@/app/_layout/DocumentTitle";
import { CommandPaletteProvider } from "@/modules/command-palette";
import { ExtensionRuntimeProvider } from "@/modules/extensions";
import {
  GlobalErrorNotifier,
  NotificationCenter,
  NotificationProvider,
  NotificationSoundBridge,
  ServerStatusNotifier,
  TaskNotificationsBridge,
  ToastBusBridge,
} from "@/modules/notifications";
import { ServerCreationBridge, ServerProvider } from "@/modules/server";
import { AuthProvider } from "@/shared/context/auth-context";
import { LanguageProvider } from "@/shared/context/language-context";
import { SocketProvider } from "@/shared/context/socket-context";
import { ColorThemeProvider } from "@/shared/context/theme-context";
import { ModalProvider } from "@/shared/providers/ModalProvider";
import { ReactQueryProvider } from "@/shared/queries/query-client";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import type { FC, PropsWithChildren } from "react";
import { GlobalModalsRegistration } from "./GlobalModals";

const Providers: FC<PropsWithChildren> = ({ children }) => {
  return (
    <LanguageProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ReactQueryProvider>
          <AuthProvider>
            <SocketProvider>
              <ServerProvider>
                <ColorThemeProvider>
                  <NotificationProvider>
                    <ToastBusBridge/>
                    <ModalProvider/>
                    <GlobalModalsRegistration/>
                    <NotificationCenter/>
                    <TaskNotificationsBridge/>
                    <ServerCreationBridge/>
                    <ServerStatusNotifier/>
                    <GlobalErrorNotifier/>
                    <NotificationSoundBridge/>
                    <DocumentTitle/>
                    <CommandPaletteProvider/>
                    <ExtensionRuntimeProvider/>

                    { children }
                  </NotificationProvider>
                </ColorThemeProvider>
              </ServerProvider>
            </SocketProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default Providers;

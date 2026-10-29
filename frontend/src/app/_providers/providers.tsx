import ClientStatsReporter from "@/app/_layout/ClientStatsReporter";
import DocumentTitle from "@/app/_layout/DocumentTitle";
import {
  GlobalErrorNotifier,
  NotificationCenter,
  NotificationSoundBridge,
  ToastBusBridge,
} from "@/modules/notifications";
import { ServerProvider } from "@/modules/server";
import { LanguageProvider } from "@/shared/context/language-context";
import { SocketProvider } from "@/shared/context/socket-context";
import { SharedModalsRegistration } from "@/shared/modals";
import { ReactQueryProvider } from "@/shared/queries/query-client";
import { ThemeProvider } from "next-themes";
import type { FC, PropsWithChildren } from "react";
import { AuthGate } from "./AuthGate";
import { ModalProvider } from "./ModalProvider";

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
          <AuthGate/>
          <SocketProvider>
            <ServerProvider>
              <ToastBusBridge/>
              <ModalProvider/>
              <SharedModalsRegistration/>
              <NotificationCenter/>
              <GlobalErrorNotifier/>
              <NotificationSoundBridge/>
              <DocumentTitle/>
              <ClientStatsReporter/>

              { children }
            </ServerProvider>
          </SocketProvider>
        </ReactQueryProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

export default Providers;

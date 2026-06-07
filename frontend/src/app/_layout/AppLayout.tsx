"use client";
import OOBE from "@/modules/oobe";
import { Sidebar } from "@/modules/sidebar";
import { SocketStatusBar } from "@/modules/sockets";
import { useOOBE } from "@/shared/hooks/useOOBE";
import ContentView from "@/shared/ui/ContentView";
import MobileHeader from "@/shared/ui/MobileHeader";
import PagePreloader from "@/shared/ui/PagePreloader";
import React, { ViewTransition } from "react";

const AppLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { needsOOBE, isLoading } = useOOBE();

  return (
    <ViewTransition enter="app-enter" default="none">
      <SocketStatusBar />

      {needsOOBE ? (
        <OOBE />
      ) : (
        <div className="flex h-screen min-h-0 md:grid md:grid-cols-[330px_1fr]">
          <PagePreloader />

          <Sidebar />

          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
            <MobileHeader />
            <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
              <ContentView>{children}</ContentView>
            </main>
          </div>
        </div>
      )}
    </ViewTransition>
  );
};

export default AppLayout;

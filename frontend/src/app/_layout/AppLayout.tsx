"use client";
import OOBE from "@/modules/oobe";
import { Sidebar } from "@/modules/sidebar";
import { RouteAccessGate } from "@/modules/sidebar/ui/RouteAccessGate";
import { SocketStatusBar } from "@/modules/sockets";
import { Topbar } from "@/modules/topbar";
import { useOOBE } from "@/shared/hooks/useOOBE";
import ContentView from "@/shared/ui/ContentView";
import PagePreloader from "@/shared/ui/PagePreloader";
import { PageWidthToggle } from "@/shared/ui/PageWidthToggle";
import React, { ViewTransition } from "react";

const AppLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { needsOOBE } = useOOBE();

  return (
    <ViewTransition enter="app-enter" default="none">
      <SocketStatusBar />

      {needsOOBE ? (
        <OOBE />
      ) : (
        <div className="grid h-dvh min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[var(--sbw)_minmax(0,1fr)] md:transition-[grid-template-columns] md:duration-250 md:ease-smooth in-[.sb-dragging]:transition-none">
          <PagePreloader />
          <Sidebar />
          <div className="@container/content relative flex min-h-0 min-w-0 flex-col">
            <Topbar />
            <main className="min-h-0 flex-1 scrollbar-thin overflow-auto px-4 pt-4 md:px-6 md:pt-5">
              {/* bottom gap lives on the page root, main's padding is lost once content overflows this h-full box */}
              <div className="mx-auto h-full *:pb-8 page-contained:max-w-[1248px]">
                <ContentView>
                  <RouteAccessGate>{children}</RouteAccessGate>
                </ContentView>
              </div>
            </main>
            <PageWidthToggle />
          </div>
        </div>
      )}
    </ViewTransition>
  );
};

export default AppLayout;

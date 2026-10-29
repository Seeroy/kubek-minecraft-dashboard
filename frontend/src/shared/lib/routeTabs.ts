// Section of the panel a path belongs to, "/panel-settings/telegram" -> "/panel-settings"
export const sectionPath = (pathname: string | null): string => `/${(pathname ?? "/").split("/")[1] ?? ""}`;

// Static export pages for /section and /section/<tab>, every tab is prerendered
export const tabStaticParams = (tabs: readonly string[]) => [{ tab: [] as string[] }, ...tabs.map((tab) => ({ tab: [tab] }))];

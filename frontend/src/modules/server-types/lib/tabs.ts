export const SERVER_TYPE_TABS = ["installed", "catalog"] as const;
export type ServerTypeTab = (typeof SERVER_TYPE_TABS)[number];

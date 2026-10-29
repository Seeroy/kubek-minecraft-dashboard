export const JAVA_TABS = ["installed", "available", "custom", "usage"] as const;
export type JavaTab = (typeof JAVA_TABS)[number];

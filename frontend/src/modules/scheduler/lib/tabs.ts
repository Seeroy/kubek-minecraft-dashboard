export const SCHEDULER_TABS = ["tasks", "runs"] as const;
export type SchedulerTab = (typeof SCHEDULER_TABS)[number];

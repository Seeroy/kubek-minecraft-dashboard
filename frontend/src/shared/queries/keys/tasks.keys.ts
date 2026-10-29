export const tasksKeys = {
  all: ["tasks"] as const,
  byId: (id: string) => [...tasksKeys.all, "one", id] as const,
} as const;

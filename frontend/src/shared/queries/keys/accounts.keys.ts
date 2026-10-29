export const accountsKeys = {
  all: ["accounts"] as const,
  list: () => [...accountsKeys.all, "list"] as const,
  // Under accounts so account edits refresh role member counts too
  roles: () => [...accountsKeys.all, "roles"] as const,
  permissions: () => [...accountsKeys.all, "permissions"] as const,
} as const;

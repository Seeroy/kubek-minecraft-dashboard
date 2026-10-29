import type { UserProfile } from "@/api";
import { authAdapter, type SafeUser } from "@/shared/queries/auth.adapter";
import type { AccessArea, AccessLevel } from "@shared/access/areas";
import { can, canOnServer, hasExtPermission, reachesServer, seesServers } from "@shared/access/can";
import { isLegacyPermission, legacyFromAccess } from "@shared/access/legacy";
import type { IUser } from "@shared/types/user.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type IUserSafe = SafeUser;

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: IUserSafe | null;
  isHydrated: boolean;

  login: (token: string, user: UserProfile) => void;
  logout: () => Promise<void>;
  clearAuth: () => void;
  setUser: (user: UserProfile) => void;
  getToken: () => string | null;
  getUser: () => IUserSafe | null;
  /** Level in a panel or server area, ignoring the server list */
  can: (area: AccessArea, level: AccessLevel) => boolean;
  /** Level in a server area on that server */
  canOnServer: (area: AccessArea, level: AccessLevel, serverId: string) => boolean;
  /** Read in any server area */
  seesServers: () => boolean;
  /** Extension item gate, an old flat key or an extension key, none means open */
  canAccessItem: (permission?: string | null) => boolean;
  /** Same as canAccessItem, kept for extensions written before access levels */
  hasPermission: (permission: string) => boolean;
  hasServerAccess: (serverId: string) => boolean;
  isUserAdmin: () => boolean;
  updateUser: (user: Partial<IUserSafe>) => void;
  setHydrated: (isHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      user: null,
      isHydrated: false,

      login: (token: string, user: UserProfile) => {
        set({
          token,
          isAuthenticated: true,
          user: authAdapter.toInternal(user),
        });
      },

      logout: async () => {
        const token = get().token;
        if (!token) return;
        try {
          // Lazy import to avoid a module-init cycle
          const { authApi } = await import("@/api/auth/auth.api");
          await authApi.logout();
        } catch {
          // best-effort: clear local state regardless
        }
        get().clearAuth();
      },

      clearAuth: () => {
        set({
          token: null,
          isAuthenticated: false,
          user: null,
        });
      },

      setUser: (user: UserProfile) => {
        set({
          user: authAdapter.toInternal(user),
          isAuthenticated: true,
        });
      },

      getToken: () => get().token,
      getUser: () => get().user,

      can: (area, level) => can(get().user, area, level),
      canOnServer: (area, level, serverId) => canOnServer(get().user, area, level, serverId),
      seesServers: () => seesServers(get().user),

      canAccessItem: (permission?: string | null) => {
        if (!permission) return true;
        const user = get().user;
        if (!user) return false;
        if (isLegacyPermission(permission)) return !!user.isAdmin || legacyFromAccess(user.access.levels).includes(permission);
        return hasExtPermission(user, permission);
      },

      hasPermission: (permission: string) => get().canAccessItem(permission),

      hasServerAccess: (serverId: string) => reachesServer(get().user, serverId),

      isUserAdmin: () => get().user?.isAdmin ?? false,

      updateUser: (updatedUser: Partial<IUser>) => {
        const currentUser = get().user;
        if (!currentUser) return;
        set({
          user: { ...currentUser, ...updatedUser },
        });
      },

      setHydrated: (isHydrated: boolean) => {
        set({ isHydrated });
      },
    }),
    {
      name: "auth-storage",
      version: 4,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
      // Before v3 the 2FA secret was kept too, before v4 the user had flat permissions
      // instead of access, so the cached user goes and the profile is loaded again
      migrate: (persistedState, version) => {
        const p = persistedState as Record<string, unknown>;
        if (version === 4) return p;
        const rest = { ...p };
        delete rest.secret;
        delete rest.user;
        return rest;
      },
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

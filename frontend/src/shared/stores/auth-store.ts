import type { UserProfile } from "@/api";
import { authAdapter, type SafeUser } from "@/shared/queries/auth.adapter";
import { IUser, UserPermissions } from "@shared/types/user.types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type IUserSafe = SafeUser;

export interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: IUserSafe | null;
  isLoading: boolean;
  isHydrated: boolean;

  login: (token: string, user: UserProfile) => void;
  logout: () => Promise<void>;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setUser: (user: UserProfile) => void;
  getToken: () => string | null;
  getUser: () => IUserSafe | null;
  hasPermission: (permission: UserPermissions) => boolean;
  canAccessItem: (permission?: string | null) => boolean;
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
      isLoading: false,
      isHydrated: false,

      login: (token: string, user: UserProfile) => {
        set({
          token,
          isAuthenticated: true,
          user: authAdapter.toInternal(user),
          isLoading: false,
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
          isLoading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setUser: (user: UserProfile) => {
        set({
          user: authAdapter.toInternal(user),
          isAuthenticated: true,
        });
      },

      getToken: () => get().token,
      getUser: () => get().user,

      hasPermission: (permission: UserPermissions) => {
        const user = get().user;
        if (!user) return false;
        if (user.isAdmin) return true;
        return user.permissions.includes(permission);
      },

      // Like hasPermission but for optionally-gated items (no permission means open to all)
      canAccessItem: (permission?: string | null) => {
        if (!permission) return true;
        const user = get().user;
        if (!user) return false;
        if (user.isAdmin) return true;
        return user.permissions.includes(permission as UserPermissions);
      },

      hasServerAccess: (serverId: string) => {
        const user = get().user;
        if (!user) return false;
        if (user.isAdmin) return true;
        if (!user.serversRestrict.enabled) return true;
        return user.serversRestrict.allowed.includes(serverId);
      },

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
      version: 3,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
        }
      },
      migrate: (persistedState, version) => {
        const p = persistedState as Record<string, any>;
        if (version === 3) return p;
        const { secret, ...rest } = p;
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

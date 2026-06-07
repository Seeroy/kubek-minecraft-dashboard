"use client";

import { useProfileQuery } from "@/modules/auth/api/auth.queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useRouter } from "next/navigation";
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
} from "react";

const AuthContext = createContext<null>(null);

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  const { data, isFetching } = useProfileQuery();

  useEffect(() => {
    setLoading(isFetching);
  }, [isFetching, setLoading]);

  useEffect(() => {
    if (data) {
      setUser(data);
    }
  }, [data, setUser]);

  // Redirect to login when there is no token
  useEffect(() => {
    if (!isHydrated) return;
    if (token) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === "/login") return;
    router.push("/login");
  }, [isHydrated, token, router]);

  return <AuthContext.Provider value={null}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

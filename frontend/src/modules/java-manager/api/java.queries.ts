import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useJavaVersions() {
  return useQuery({
    queryKey: qk.java.list(),
    queryFn: () => api.java.getAllJavaVersions(),
  });
}

/**
 * Recommended major Java version for a Minecraft version (from Mojang manifest)
 */
export function useJavaVersionForGame(gameVersion?: string) {
  return useQuery({
    queryKey: qk.java.forGame(gameVersion ?? ""),
    queryFn: () => api.java.getJavaVersionForGame(gameVersion!),
    enabled: !!gameVersion,
    staleTime: Infinity,
    retry: false,
  });
}

export function useInstallJavaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: string) => api.java.installJavaVersion(version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.java.all }),
  });
}

export function useDeleteJavaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (version: string) => api.java.deleteJavaVersion(version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.java.all }),
  });
}

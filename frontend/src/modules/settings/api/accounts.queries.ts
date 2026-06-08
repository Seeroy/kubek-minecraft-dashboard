import type { Account, ChangePasswordDto, CreateAccountDto } from "@/api";
import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useAccounts() {
  return useQuery({
    queryKey: qk.accounts.list(),
    queryFn: () => api.accounts.getAllAccounts(),
  });
}

export function useAccount(username: string | undefined) {
  return useQuery({
    queryKey: qk.accounts.byUsername(username ?? ""),
    queryFn: () => api.accounts.getAccount(username!),
    enabled: !!username,
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountDto) => api.accounts.createAccount(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.accounts.all }),
  });
}

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      username,
      data,
    }: {
      username: string;
      data: Partial<Account>;
    }) => api.accounts.updateAccount(username, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.accounts.all }),
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => api.accounts.deleteAccount(username),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.accounts.all }),
  });
}

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: ({
      username,
      data,
    }: {
      username: string;
      data: ChangePasswordDto;
    }) => api.accounts.changePassword(username, data),
  });
}

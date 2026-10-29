import type { CreateAccountDto, UpdateAccountDto } from "@/api";
import { api } from "@/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/shared/queries/query-keys";

export function useAccounts() {
  return useQuery({
    queryKey: qk.accounts.list(),
    queryFn: () => api.accounts.getAllAccounts(),
  });
}

// The account form shows errors itself, access errors need their own wording
const silent = { silent: true };

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAccountDto) => api.accounts.createAccount(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.accounts.all }),
    meta: silent,
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
      data: UpdateAccountDto;
    }) => api.accounts.updateAccount(username, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: qk.accounts.all }),
    meta: silent,
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

// Profile and account list both show if an FTP password is set
function useFtpPasswordInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: qk.auth.profile() });
    void queryClient.invalidateQueries({ queryKey: qk.accounts.all });
  };
}

export function useIssueOwnFtpPasswordMutation() {
  const invalidate = useFtpPasswordInvalidation();
  return useMutation({
    mutationFn: () => api.accounts.issueOwnFtpPassword(),
    onSuccess: invalidate,
  });
}

export function useResetFtpPasswordMutation() {
  const invalidate = useFtpPasswordInvalidation();
  return useMutation({
    mutationFn: (username: string) => api.accounts.resetFtpPassword(username),
    onSuccess: invalidate,
  });
}

export function useRemoveFtpPasswordMutation() {
  const invalidate = useFtpPasswordInvalidation();
  return useMutation({
    mutationFn: (username: string) => api.accounts.removeFtpPassword(username),
    onSuccess: invalidate,
  });
}

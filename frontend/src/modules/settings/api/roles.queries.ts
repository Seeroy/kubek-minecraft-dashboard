import { api, type CreateRoleDto, type UpdateRoleDto } from "@/api";
import { qk } from "@/shared/queries/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Errors are shown by the forms with translated codes, not as a generic toast
const silent = { silent: true };

export function useRoles(enabled = true) {
  return useQuery({
    queryKey: qk.accounts.roles(),
    queryFn: () => api.roles.getRoles(),
    enabled,
  });
}

/** Extension permission keys with their labels */
export function useExtPermissions(enabled = true) {
  return useQuery({
    queryKey: qk.accounts.permissions(),
    queryFn: () => api.roles.getPermissions(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: qk.accounts.all });
}

export function useCreateRoleMutation() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (data: CreateRoleDto) => api.roles.createRole(data),
    onSuccess: invalidate,
    meta: silent,
  });
}

export function useUpdateRoleMutation() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleDto }) => api.roles.updateRole(id, data),
    onSuccess: invalidate,
    meta: silent,
  });
}

export function useDeleteRoleMutation() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (id: string) => api.roles.deleteRole(id),
    onSuccess: invalidate,
    meta: silent,
  });
}

export function useDuplicateRoleMutation() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (id: string) => api.roles.duplicateRole(id),
    onSuccess: invalidate,
    meta: silent,
  });
}

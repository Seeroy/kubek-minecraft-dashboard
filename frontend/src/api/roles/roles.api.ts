import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { CreateRoleDto, DuplicateRoleDto, PermissionDescriptor, Role, UpdateRoleDto } from "./roles.model";

export class RolesApi {
  constructor(private authHttp: AuthHttpClient) {}

  getRoles = (): Promise<Role[]> => this.authHttp.get<Role[]>("roles");

  createRole = (data: CreateRoleDto): Promise<Role> => this.authHttp.post<Role>("roles", { json: data });

  updateRole = (id: string, data: UpdateRoleDto): Promise<Role> => this.authHttp.put<Role>(`roles/${encodeURIComponent(id)}`, { json: data });

  deleteRole = (id: string): Promise<void> => this.authHttp.delete<void>(`roles/${encodeURIComponent(id)}`);

  duplicateRole = (id: string, data: DuplicateRoleDto = {}): Promise<Role> =>
    this.authHttp.post<Role>(`roles/${encodeURIComponent(id)}/duplicate`, { json: data });

  // Extension declared permissions, core areas live in @shared/access
  getPermissions = (): Promise<PermissionDescriptor[]> => this.authHttp.get<PermissionDescriptor[]>("permissions");
}

export const rolesApi = new RolesApi(authHttp);

import type { IServer } from "@shared/types/server/server.types";
import type { components } from "../types";

// Backend returns IServer, ServerEntity loses the status enum and variable types
export type Server = IServer;
export type ServerFull = IServer;
export type ServerCreatedResponse = Omit<
  components["schemas"]["ServerCreatedResponseDto"],
  "server"
> & { server: IServer };
export type BulkDeleteResult = components["schemas"]["BulkDeleteResultDto"];
export type UpdateServerSettingsDto =
  components["schemas"]["UpdateServerSettingsDto"];
export type CreateServerDto = components["schemas"]["CreateServerDto"];

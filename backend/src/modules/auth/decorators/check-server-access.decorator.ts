import { SERVER_ACCESS_KEY } from "@/modules/auth/guards/server-access.guard";
import { CustomDecorator, SetMetadata } from "@nestjs/common";

/**
 * Decorator for checking server access
 * @param idParamName field name or body object path (ex. "server.id"). Default = 'serverId'
 */
export const CheckServerAccess = (
  idParamName: string = "serverId",
): CustomDecorator<string> => {
  return SetMetadata(SERVER_ACCESS_KEY, idParamName);
};

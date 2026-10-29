import type { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import { BadRequestException } from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";

/**
 * Blueprint you can create a server on or switch to
 * With runtimeKind it has to support it too, servers keep their runtime
 */
export function assertBlueprintUsable(
  registry: ServerTypesRegistry,
  blueprintId: string,
  runtimeKind?: IServer["runtimeKind"],
): LoadedBlueprint {
  const blueprint = registry.get(blueprintId);
  if (!blueprint || !blueprint.valid) {
    throw new BadRequestException(
      `Unknown or invalid blueprint: ${blueprintId}`,
    );
  }
  if (!registry.isSupportedHere(blueprint.manifest)) {
    throw new BadRequestException(
      `Blueprint ${blueprintId} is not supported on this platform (${process.platform})`,
    );
  }

  if (runtimeKind === "docker" && !blueprint.manifest.dockerProfile) {
    throw new BadRequestException(
      "This core has no docker profile, recreate the server to switch to native",
    );
  }
  if (
    runtimeKind === "native" &&
    blueprint.manifest.runtime.kind === "docker"
  ) {
    throw new BadRequestException(
      "This core is docker-only, recreate the server to run it in Docker",
    );
  }
  return blueprint;
}

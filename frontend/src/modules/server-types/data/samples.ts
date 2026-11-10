import type { BlueprintSummary } from "@/shared/types/server-types.types";

const blueprint = (i: number, name: string): BlueprintSummary => ({
  // The ".custom" tail keeps the card on the generic icon, no image request
  id: `sample-${i}.custom`,
  name,
  description: "High performance Minecraft server with plugin support",
  game: "minecraft",
  version: "1.0.0",
  runtimeKind: "native",
  variables: [],
  ports: [],
  configFiles: [],
  features: ["console", "files", "backups", "players"],
  source: "bundled",
});

export const SAMPLE_BLUEPRINTS: BlueprintSummary[] = [blueprint(1, "Paper"), blueprint(2, "Fabric"), blueprint(3, "Velocity"), blueprint(4, "Vanilla"), blueprint(5, "Forge"), blueprint(6, "Bedrock")];

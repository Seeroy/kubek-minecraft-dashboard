import type { KnownPlayersPage, PlayersOverview } from "@/api";

// Dashes keep these off the head endpoint, they are never valid Minecraft names
const player = (i: number, name: string) => ({ uuid: `sample-${i}`, name });
const ban = (i: number, name: string) => ({
  ...player(i, name),
  reason: "Griefing spawn",
  source: "Server",
  createdAt: null,
  expiresAt: null,
});

export const SAMPLE_PLAYERS_OVERVIEW: PlayersOverview = {
  whitelist: [
    player(1, "sample-steve"),
    player(2, "sample-alex"),
    player(3, "sample-builder"),
    player(4, "sample-miner"),
  ],
  ops: [
    { ...player(1, "sample-steve"), level: 4, bypassesPlayerLimit: false },
    { ...player(2, "sample-alex"), level: 2, bypassesPlayerLimit: false },
  ],
  bans: [ban(5, "sample-griefer"), ban(6, "sample-cheater")],
  ipBans: [],
  settings: {
    whitelist: true,
    enforceWhitelist: false,
    onlineMode: true,
    opPermissionLevel: 4,
  },
  live: false,
};

export const SAMPLE_KNOWN_PAGE: KnownPlayersPage = {
  items: ["sample-steve", "sample-alex", "sample-builder", "sample-miner", "sample-farmer"].map((name, i) => ({ uuid: `sample-${i}`, name, savedAt: null })),
  total: 5,
};

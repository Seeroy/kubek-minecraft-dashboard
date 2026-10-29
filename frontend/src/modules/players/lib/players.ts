export const PLAYERS_TABS = ["online", "whitelist", "ops", "bans"] as const;

export type PlayersTab = (typeof PLAYERS_TABS)[number];

// Same rule as the backend, Floodgate prefixes Bedrock names with a dot
export const PLAYER_NAME = /^\.?[A-Za-z0-9_]{1,16}$/;

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]+(%\w+)?$/;

export const isIpAddress = (value: string) => IPV4.test(value) || (value.includes(":") && IPV6.test(value));

export const formatDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const matchesQuery = (query: string, ...fields: string[]) => !query || fields.some((field) => field.toLowerCase().includes(query));

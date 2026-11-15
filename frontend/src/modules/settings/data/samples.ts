import type { Account, AssistantSettingsResponse, Role, TwoFactorMethod } from "@/api";
import type { SessionPublicView } from "@shared/types/session.types";
import type { GithubRelease } from "../api/about.queries";
import type { MainConfigFormData } from "../validations/schema";

const sample = (i: number, username: string, roles: string[]): Account => ({
  id: `sample-${i}`,
  username,
  roles,
  grants: {},
  extPermissions: [],
  access: { levels: {}, ext: [] },
  serversRestrict: { enabled: false, allowed: [] },
  isAdmin: i === 1,
  oobeCompleted: true,
  // Not a valid Minecraft name, so no head request goes out for the skeleton
  skinName: "sample-head",
  ftpPasswordSetAt: null,
});

export const SAMPLE_ACCOUNTS: Account[] = [
  sample(1, "administrator", []),
  sample(2, "moderator", ["Moderator"]),
  sample(3, "builder_team", ["Builder"]),
];

const role = (i: number, name: string, members: number, builtin = false): Role => ({
  id: `sample-role-${i}`,
  name,
  description: "Can view the console and manage players",
  builtin,
  builtinKey: null,
  grants: { console: "read", players: "write" },
  ext: [],
  members,
  createdAt: 0,
  updatedAt: 0,
});

export const SAMPLE_ROLES: Role[] = [role(1, "Viewer", 3, true), role(2, "Moderator", 2, true), role(3, "Server admin", 1, true), role(4, "Builders", 4)];

const session = (i: number, userAgent: string, current: boolean): SessionPublicView => ({
  id: `sample-session-${i}`,
  ip: "192.168.1.24",
  userAgent,
  createdAt: 1_760_000_000_000,
  lastSeenAt: 1_760_000_000_000,
  expiresAt: null,
  current,
});

export const SAMPLE_SESSIONS: SessionPublicView[] = [
  session(1, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130.0", true),
  session(2, "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/131.0", false),
];

export const SAMPLE_TWOFA = { totp: true, telegram: false, primary: null as TwoFactorMethod | null };

export const SAMPLE_ASSISTANT_SETTINGS: AssistantSettingsResponse = {
  settings: {
    enabled: true,
    preset: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "sample-model-name",
    temperature: 0.4,
    maxSteps: 8,
    priceInput: 0,
    priceOutput: 0,
    apiKey: { set: true, hint: null },
  },
  presets: [
    { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", requiresKey: true, modelHint: "provider/model", local: false },
    { id: "ollama", label: "Ollama", baseUrl: "http://localhost:11434/v1", requiresKey: false, modelHint: "llama3", local: true },
  ],
};

export const SAMPLE_CONFIG_FORM: MainConfigFormData = {
  ftpd: { enabled: true, port: 21 },
  subnetsAccessRestriction: { enabled: false, subnets: [] },
  telegramBot: { enabled: true, token: "", chatIds: [] },
  telemetry: { enabled: true },
  serverStats: { enabled: true },
  port: 3000,
  skinName: "sample-head",
};

export const SAMPLE_PANEL_VERSION = "4.1.1";

const release = (id: number, tagName: string): GithubRelease => ({
  id,
  tagName,
  name: `Kubek ${tagName}`,
  body: "- Faster server start\n- Fixed file manager uploads on Windows\n- Updated translations",
  htmlUrl: "",
  publishedAt: "2026-01-01T00:00:00Z",
  prerelease: false,
});

export const SAMPLE_RELEASES: GithubRelease[] = [release(1, "v4.1.1"), release(2, "v4.1.0"), release(3, "v4.0.2")];

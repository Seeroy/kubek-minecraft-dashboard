import type { IConfiguration } from "@/core/types/config";
import { fake } from "@/testing/fake";
import { describe, expect, test } from "bun:test";
import { mergeSecrets, readSecret, toConfigView } from "./config-view";

// older configs still carry the global FTP login
const legacyFtp = { enabled: true, username: "admin", password: "hunter2" };

const config = fake<IConfiguration>({
  ftpd: legacyFtp,
  telegramBot: { enabled: true, token: "123456:ABCDEFGHIJKLmnop" },
  twofaSetupSecret: "internal",
  port: 8000,
});

describe("toConfigView", () => {
  const view = toConfigView(config);

  test("blanks secret values", () => {
    expect(view.telegramBot.token).toBe("");
    expect(view.ftpd).toEqual({ enabled: true, port: undefined });
  });

  test("describes secrets, short ones without a hint", () => {
    expect(view.secrets["telegramBot.token"]).toEqual({
      set: true,
      hint: "mnop",
    });
    expect(Object.keys(view.secrets)).toEqual(["telegramBot.token"]);
  });

  test("drops internal keys", () => {
    expect(view.twofaSetupSecret).toBeUndefined();
  });
});

describe("mergeSecrets", () => {
  test("keeps the stored secret for a blank value", () => {
    const merged = mergeSecrets(config, {
      telegramBot: { enabled: false, token: "" },
    });
    expect(merged.telegramBot?.token).toBe("123456:ABCDEFGHIJKLmnop");
    expect(merged.telegramBot?.enabled).toBe(false);
  });

  test("replaces the secret with a new value", () => {
    const merged = mergeSecrets(config, {
      telegramBot: { enabled: true, token: "new" },
    });
    expect(merged.telegramBot?.token).toBe("new");
  });

  test("old global FTP credentials are not stored", () => {
    const ftpd = { enabled: true, port: 2121, username: "a", password: "b" };
    const merged = mergeSecrets(config, { ftpd });
    expect(merged.ftpd).toEqual({ enabled: true, port: 2121 });
  });

  test("ignores the secrets view and internal keys sent back", () => {
    const merged = mergeSecrets(config, {
      secrets: {},
      twofaSetupSecret: "x",
    });
    expect(merged).toEqual({});
  });
});

test("readSecret returns the plain value", () => {
  expect(readSecret(config, "telegramBot.token")).toBe(
    "123456:ABCDEFGHIJKLmnop",
  );
});

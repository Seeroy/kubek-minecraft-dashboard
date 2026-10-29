import { describe, expect, it } from "bun:test";
import {
  REDACTED,
  isSecretFile,
  redactSecrets,
  truncateOutput,
} from "./redact";

describe("redactSecrets", () => {
  it("hides rcon.password and keeps other properties", () => {
    const input = "enable-rcon=true\nrcon.password=hunter2\nrcon.port=25575";
    expect(redactSecrets(input)).toBe(
      `enable-rcon=true\nrcon.password=${REDACTED}\nrcon.port=25575`,
    );
  });

  it("keeps an empty password as it is", () => {
    expect(redactSecrets("rcon.password=\nmotd=hi")).toBe(
      "rcon.password=\nmotd=hi",
    );
  });

  it("hides the velocity secret in paper-global.yml", () => {
    const input =
      "proxies:\n  velocity:\n    enabled: true\n    secret: s3cr3t";
    expect(redactSecrets(input)).toBe(
      `proxies:\n  velocity:\n    enabled: true\n    secret: ${REDACTED}`,
    );
  });

  it("hides toml and env style keys", () => {
    expect(redactSecrets('forwarding-secret-file = "forwarding.secret"')).toBe(
      `forwarding-secret-file = ${REDACTED}`,
    );
    expect(redactSecrets("DISCORD_TOKEN=abc.def")).toBe(
      `DISCORD_TOKEN=${REDACTED}`,
    );
  });

  it("hides JSON values", () => {
    const input = '{\n  "apiKey": "sk-123",\n  "name": "x"\n}';
    expect(redactSecrets(input)).toBe(
      `{\n  "apiKey": "${REDACTED}",\n  "name": "x"\n}`,
    );
    expect(redactSecrets('{"token":"a\\"b","n":1}')).toBe(
      `{"token":"${REDACTED}","n":1}`,
    );
  });

  it("hides inline secret= fragments and bearer tokens", () => {
    expect(redactSecrets("GET /hook?secret=abc&x=1")).toBe(
      `GET /hook?secret=${REDACTED}&x=1`,
    );
    expect(redactSecrets("Authorization: Bearer abcdefgh123")).toBe(
      `Authorization: Bearer ${REDACTED}`,
    );
    expect(redactSecrets("sent Bearer abcdefgh123 to api")).toBe(
      `sent Bearer ${REDACTED} to api`,
    );
  });

  it("hides private keys", () => {
    const pem =
      "a\n-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----\nb";
    expect(redactSecrets(pem)).toBe(`a\n${REDACTED}\nb`);
  });

  it("leaves ordinary log lines alone", () => {
    const line = "[12:00:01 INFO]: Steve joined the game";
    expect(redactSecrets(line)).toBe(line);
  });
});

describe("isSecretFile", () => {
  it("matches forwarding.secret and key files", () => {
    expect(isSecretFile("forwarding.secret")).toBe(true);
    expect(isSecretFile("proxy/forwarding.secret")).toBe(true);
    expect(isSecretFile("certs/server.key")).toBe(true);
    expect(isSecretFile("server.properties")).toBe(false);
  });
});

describe("truncateOutput", () => {
  it("cuts long text with a note", () => {
    expect(truncateOutput("abcdef", 4)).toBe(
      "abcd\n[truncated 2 more characters]",
    );
    expect(truncateOutput("abc", 4)).toBe("abc");
  });
});

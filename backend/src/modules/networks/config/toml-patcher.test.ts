import { describe, expect, test } from "bun:test";
import { TomlPatcher, tomlValue } from "./toml-patcher";
import { VELOCITY_3_TEMPLATE as VELOCITY_TEMPLATE } from "./velocity-template";

const lines = (text: string) => text.split("\n");

describe("setTopLevel", () => {
  test("replaces only the value line", () => {
    const out = TomlPatcher.parse(VELOCITY_TEMPLATE)
      .setTopLevel("online-mode", "false")
      .toString();
    const before = lines(VELOCITY_TEMPLATE);
    const after = lines(out);
    expect(after.length).toBe(before.length);
    const changed = after.filter((line, i) => line !== before[i]);
    expect(changed).toEqual(["online-mode = false"]);
  });

  test("ignores the same key inside a table", () => {
    const text = "a = 1\n\n[query]\nport = 25565\n";
    const out = TomlPatcher.parse(text).setTopLevel("port", "1").toString();
    expect(out).toBe("a = 1\nport = 1\n\n[query]\nport = 25565\n");
  });

  test("replaces a multiline value as a whole", () => {
    const text = 'list = [\n  "a",\n  "b"\n]\nnext = 1\n';
    const out = TomlPatcher.parse(text).setTopLevel("list", "[]").toString();
    expect(out).toBe("list = []\nnext = 1\n");
  });

  test("adds a missing key after the last top level entry", () => {
    const text = "# head\na = 1\n\n[t]\nb = 2\n";
    const out = TomlPatcher.parse(text).setTopLevel("c", '"x"').toString();
    expect(out).toBe('# head\na = 1\nc = "x"\n\n[t]\nb = 2\n');
  });

  test("does not take a bracket in a string for a header", () => {
    const text = 'motd = "[hi]"\n[t]\n';
    const out = TomlPatcher.parse(text).setTopLevel("motd", '"x"').toString();
    expect(out).toBe('motd = "x"\n[t]\n');
  });
});

describe("replaceTable", () => {
  test("keeps leading and trailing comments of the table", () => {
    const out = TomlPatcher.parse(VELOCITY_TEMPLATE)
      .replaceTable("servers", [
        'a = "127.0.0.1:1"',
        `try = ${tomlValue.list(["a"])}`,
      ])
      .toString();
    expect(out).toContain(
      [
        "[servers]",
        "# Configure your servers here. Each key represents the server's name, and the value",
        "# represents the IP address of the server to connect to.",
        'a = "127.0.0.1:1"',
        "try = [",
        '    "a"',
        "]",
        "",
        "[forced-hosts]",
      ].join("\n"),
    );
    expect(out).not.toContain("lobby = ");
    expect(out).toContain('"lobby.example.com" = [');
  });

  test("leaves other tables untouched", () => {
    const out = TomlPatcher.parse(VELOCITY_TEMPLATE)
      .replaceTable("servers", [])
      .toString();
    const tail = (text: string) => text.slice(text.indexOf("[advanced]"));
    expect(tail(out)).toBe(tail(VELOCITY_TEMPLATE));
  });

  test("fills an empty table after its comments", () => {
    const text = "[t]\n# note\n\n[u]\nx = 1\n";
    const out = TomlPatcher.parse(text).replaceTable("t", ["a = 1"]).toString();
    expect(out).toBe("[t]\n# note\na = 1\n\n[u]\nx = 1\n");
  });

  test("appends a missing table", () => {
    const out = TomlPatcher.parse("a = 1\n\n")
      .replaceTable("t", ["b = 2"])
      .toString();
    expect(out).toBe("a = 1\n\n[t]\nb = 2\n");
  });

  test("result stays valid toml", () => {
    const out = TomlPatcher.parse(VELOCITY_TEMPLATE)
      .replaceTable("servers", [
        '"my server" = "h:1"',
        `try = ${tomlValue.list(["my server"])}`,
      ])
      .toString();
    const parsed = Bun.TOML.parse(out) as { servers: Record<string, unknown> };
    expect(parsed.servers).toEqual({ "my server": "h:1", try: ["my server"] });
  });
});

describe("setInTable", () => {
  test("replaces a key of the right table only", () => {
    const text = "port = 1\n\n[query]\nenabled = false\nport = 2\n";
    const out = TomlPatcher.parse(text)
      .setInTable("query", "port", "3")
      .toString();
    expect(out).toBe("port = 1\n\n[query]\nenabled = false\nport = 3\n");
  });

  test("adds a missing key after the last entry", () => {
    const text = "[advanced]\na = 1\n\n[query]\nb = 2\n";
    const out = TomlPatcher.parse(text)
      .setInTable("advanced", "c", "3")
      .toString();
    expect(out).toBe("[advanced]\na = 1\nc = 3\n\n[query]\nb = 2\n");
  });

  test("appends a missing table", () => {
    const out = TomlPatcher.parse("a = 1\n")
      .setInTable("query", "enabled", "true")
      .toString();
    expect(Bun.TOML.parse(out)).toEqual({ a: 1, query: { enabled: true } });
  });
});

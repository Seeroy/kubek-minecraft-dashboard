import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { BlueprintResolver } from "../blueprint-resolver.service";
import { HttpEngine } from "./http-engine.service";

let http: ReturnType<typeof Bun.serve>;
let hits: string[];
let base = "";
const engine = new HttpEngine(new BlueprintResolver());

beforeAll(() => {
  http = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      const { pathname, search } = new URL(req.url);
      hits.push(pathname + search);
      const page = Number(new URL(req.url).searchParams.get("page") ?? 1);
      if (pathname === "/link") {
        const headers: Record<string, string> = {};
        if (page < 3)
          headers.link = `<${base}/link?page=${page + 1}>; rel="next", <${base}/link?page=3>; rel="last"`;
        return Response.json([`v${page}a`, `v${page}b`], { headers });
      }
      if (pathname === "/body") {
        return Response.json({
          items: [`b${page}`],
          next: page < 5 ? `/body?page=${page + 1}` : null,
        });
      }
      if (pathname === "/builds") return Response.json({ builds: [1, 2, 3] });
      if (pathname === "/versions")
        return Response.json({ versions: ["1.20.1", "1.21.4", "1.19"] });
      return Response.json({ echo: pathname });
    },
  });
});

afterAll(() => {
  void http.stop(true);
});

beforeEach(() => {
  hits = [];
  base = `http://127.0.0.1:${http.port}`;
});

describe("HttpEngine paginate", () => {
  test("follows the Link header and joins pages", async () => {
    const list = await engine.listVersions(
      {
        request: { url: `${base}/link`, query: { per_page: "2" } },
        paginate: { nextSelect: "header:link" },
      },
      {},
    );
    expect(list).toEqual(["v1a", "v1b", "v2a", "v2b", "v3a", "v3b"]);
    // the query goes on the first request only, next links carry their own
    expect(hits).toEqual(["/link?per_page=2", "/link?page=2", "/link?page=3"]);
  });

  test("a body selector gives relative next urls and max caps the pages", async () => {
    const list = await engine.listVersions(
      {
        request: { url: `${base}/body` },
        select: "$.items",
        paginate: { nextSelect: "$.next", max: 3 },
      },
      {},
    );
    expect(list).toEqual(["b1", "b2", "b3"]);
    expect(hits).toHaveLength(3);
  });

  test("without paginate only one request is made", async () => {
    await engine.listVersions({ request: { url: `${base}/link` } }, {});
    expect(hits).toEqual(["/link"]);
  });
});

describe("HttpEngine picks", () => {
  test("then takes the first of a descending list", async () => {
    const url = await engine.resolveDownload(
      {
        request: { url: `${base}/versions` },
        select: "$.versions",
        sort: "semver-desc",
        then: { url: "dl/{{prev}}" },
      },
      {},
    );
    expect(url).toBe("dl/1.21.4");
  });

  test("then takes the last of an unsorted list, like build numbers", async () => {
    const url = await engine.resolveDownload(
      {
        request: { url: `${base}/builds` },
        select: "$.builds",
        then: { url: "build/{{prev}}" },
      },
      {},
    );
    expect(url).toBe("build/3");
  });

  test("a final list gives its first url, or the last when ascending", async () => {
    const step = { request: { url: `${base}/versions` }, select: "$.versions" };
    expect(await engine.resolveDownload(step, {})).toBe("1.20.1");
    expect(
      await engine.resolveDownload({ ...step, sort: "semver-asc" }, {}),
    ).toBe("1.21.4");
    expect(
      await engine.resolveDownload({ ...step, sort: "semver-desc" }, {}),
    ).toBe("1.21.4");
  });
});

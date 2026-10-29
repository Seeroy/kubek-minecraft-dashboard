import type { ExtHttpApi } from "@kubekpanel/extension-sdk";

/** http:outbound exposes fetch/post; http:routes adds registerRoutes */
export function createOutboundHttpApi(): Pick<ExtHttpApi, "fetch" | "post"> {
  return {
    fetch: (url, init) => fetch(url, init),
    post: (url, json) =>
      fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(json),
      }),
  };
}

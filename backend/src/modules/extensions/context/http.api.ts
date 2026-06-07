import type { ExtHttpApi, ExtRoute } from "@kubekpanel/extension-sdk";

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

export function createRoutesHttpApi(
  register: (routes: ExtRoute[]) => void,
): Pick<ExtHttpApi, "registerRoutes"> {
  return { registerRoutes: register };
}

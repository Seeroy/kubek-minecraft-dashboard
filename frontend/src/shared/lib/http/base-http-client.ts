import { HTTPError, type KyInstance, type Options } from "ky";
import { ApiError, type ApiErrorBody } from "./types";

/**
 * Thin HTTP client over a ky instance
 */
export class BaseHttpClient {
  constructor(protected readonly client: KyInstance) {}

  // Raw ky instance for binary responses (blobs, streams, downloads)
  get raw(): KyInstance {
    return this.client;
  }

  async request<T>(input: string, options?: Options): Promise<T> {
    try {
      const response = await this.client(input, options);
      if (response.status === 204) {
        return undefined as T;
      }
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }
      // Only JSON bodies are parsed
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return JSON.parse(text) as T;
      }
      return text as T;
    } catch (err) {
      if (err instanceof HTTPError) {
        let body: ApiErrorBody | undefined;
        try {
          body = await err.response.json<ApiErrorBody>();
        } catch {
          body = undefined;
        }
        if (body && typeof body === "object" && "message" in body) {
          throw new ApiError(body);
        }
        throw new Error(`Unexpected response: ${err.message}`);
      }
      throw err;
    }
  }

  get = <T>(url: string, options?: Options) =>
    this.request<T>(url, { ...options, method: "GET" });
  post = <T>(url: string, options?: Options) =>
    this.request<T>(url, { ...options, method: "POST" });
  put = <T>(url: string, options?: Options) =>
    this.request<T>(url, { ...options, method: "PUT" });
  patch = <T>(url: string, options?: Options) =>
    this.request<T>(url, { ...options, method: "PATCH" });
  delete = <T>(url: string, options?: Options) =>
    this.request<T>(url, { ...options, method: "DELETE" });
}

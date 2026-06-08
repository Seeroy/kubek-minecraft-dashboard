import { BaseHttpClient } from "./base-http-client";

/**
 * HTTP client backed by an auth-aware ky instance (attaches the Bearer token and
 * clears auth on 401)
 */
export class AuthHttpClient extends BaseHttpClient {}

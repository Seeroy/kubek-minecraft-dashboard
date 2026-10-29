/** Stored secret as seen through the API, the value itself is never returned */
export interface SecretHint {
  set: boolean;
  /** Last characters of the value, null for short secrets */
  hint: string | null;
}

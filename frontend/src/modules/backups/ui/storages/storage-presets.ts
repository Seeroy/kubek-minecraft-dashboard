export const STORAGE_PRESETS = {
  aws: { endpoint: "", region: "us-east-1", virtualHostedStyle: false },
  r2: { endpoint: "https://<account-id>.r2.cloudflarestorage.com", region: "auto", virtualHostedStyle: false },
  b2: { endpoint: "https://s3.<region>.backblazeb2.com", region: "<region>", virtualHostedStyle: false },
  minio: { endpoint: "http://localhost:9000", region: "us-east-1", virtualHostedStyle: false },
  yandex: { endpoint: "https://storage.yandexcloud.net", region: "ru-central1", virtualHostedStyle: false },
  custom: { endpoint: "", region: "", virtualHostedStyle: false },
} as const;

export type StoragePreset = keyof typeof STORAGE_PRESETS;

/** Best guess of the provider behind a saved endpoint */
export function presetOf(endpoint: string): StoragePreset {
  if (!endpoint) return "aws";
  if (endpoint.includes("r2.cloudflarestorage.com")) return "r2";
  if (endpoint.includes("backblazeb2.com")) return "b2";
  if (endpoint.includes("yandexcloud.net")) return "yandex";
  return "custom";
}

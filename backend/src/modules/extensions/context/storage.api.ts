import type { ExtensionKvRepository } from "@/modules/database/repositories/extension-kv.repository";
import type { KeyValueStore } from "@kubekpanel/extension-sdk";

/** Per-extension KV store backed by extension_kv, scoped to a single extension id */
export function createStorageApi(
  extId: string,
  kv: ExtensionKvRepository,
): KeyValueStore {
  return {
    get: (key) => kv.get(extId, key),
    set: (key, value) => kv.set(extId, key, value),
    delete: (key) => kv.delete(extId, key),
    keys: () => kv.keys(extId),
  };
}

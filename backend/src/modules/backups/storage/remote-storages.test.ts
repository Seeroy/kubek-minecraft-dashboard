import { describe, expect, test } from "bun:test";
import type { AppEventsService } from "@/core/events/app-events.service";
import { fake } from "@/testing/fake";
import type {
  BackupStoragesRepository,
  StoredStorage,
} from "../repositories/backup-storages.repository";
import { RemoteStorages } from "./remote-storages.service";

const storage: StoredStorage = {
  id: "s1",
  name: "Dead MinIO",
  driver: "s3",
  createdAt: 1,
  updatedAt: 1,
  config: {
    endpoint: "http://127.0.0.1:1",
    region: "us-east-1",
    bucket: "b",
    prefix: "",
    accessKeyId: "k",
    secretAccessKey: "s",
    virtualHostedStyle: false,
  },
};

describe("RemoteStorages", () => {
  test("reports a driver failure as an unreachable storage", async () => {
    const emitted: unknown[] = [];
    const remote = new RemoteStorages(
      fake<BackupStoragesRepository>({ findById: () => storage }),
      fake<AppEventsService>({
        emit: (name, payload) => void emitted.push({ name, payload }),
      }),
    );
    await expect(remote.remove("s1", "a/b.zip")).rejects.toThrow();
    expect(emitted).toMatchObject([
      {
        name: "storage.unreachable",
        payload: { storageId: "s1", storageName: "Dead MinIO" },
      },
    ]);
  });
});

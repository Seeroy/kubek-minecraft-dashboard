import { FileManagerService } from "@/modules/files/file-manager.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import type { AssistantToolPreview } from "@shared/types/assistant.types";
import { FileType } from "@shared/types/file.types";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { isSecretFile } from "../runner/redact";
import {
  type FileEdit,
  applyEdits,
  containsRedaction,
  looksBinary,
} from "./file-edits";
import { failure, json, relativePath, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const MAX_READ_BYTES = 256 * 1024;
const MAX_WRITE_CHARS = 512 * 1024;

const SECRET_FILE = "This file holds a secret and is hidden from the assistant";

const writeArgs = serverArgs({
  path: relativePath,
  content: z
    .string()
    .max(MAX_WRITE_CHARS)
    .optional()
    .describe("Whole new content, only for new or small files"),
  edits: z
    .array(z.object({ find: z.string().min(1), replace: z.string() }))
    .min(1)
    .max(20)
    .optional()
    .describe("Exact find and replace edits, preferred for existing files"),
}).refine((a) => (a.content === undefined) !== (a.edits === undefined), {
  message: "Pass either content or edits",
});

type WriteArgs = z.infer<typeof writeArgs>;

@Injectable()
export class FilesTools implements ToolGroup {
  constructor(private readonly files: FileManagerService) {}

  tools(): AssistantTool[] {
    return [this.listFiles(), this.readFile(), this.writeFile()];
  }

  private listFiles() {
    return defineTool({
      name: "list_files",
      description: "List a folder of the server, the root by default",
      kind: "read",
      access: [AccessArea.FILES, "read"],
      serverScoped: true,
      args: serverArgs({ path: relativePath.default("") }),
      run: async (_ctx, { serverId, path }) => {
        const items = await this.files.scanDirectory(serverId, path);
        return json(
          items.slice(0, 300).map((item) => ({
            name: item.name,
            dir: item.type === FileType.DIRECTORY,
            size: item.size,
          })),
        );
      },
    });
  }

  private readFile() {
    return defineTool({
      name: "read_file",
      description: "Read a text file of the server",
      kind: "read",
      access: [AccessArea.FILES, "read"],
      serverScoped: true,
      args: serverArgs({ path: relativePath.min(1) }),
      run: async (_ctx, { serverId, path }) => {
        if (isSecretFile(path)) return failure(SECRET_FILE);
        const buffer = await this.files.readFile(serverId, path);
        if (looksBinary(buffer)) return failure("Binary file, cannot show it");
        const head = buffer.subarray(0, MAX_READ_BYTES).toString("utf8");
        return text(
          buffer.length > MAX_READ_BYTES
            ? `${head}\n[file is ${buffer.length} bytes, only the start is shown]`
            : head,
        );
      },
    });
  }

  private writeFile() {
    return defineTool<WriteArgs>({
      name: "write_file",
      description:
        "Create or change a text file of the server. Use edits for existing files so unchanged parts stay intact",
      kind: "write",
      access: [AccessArea.FILES, "write"],
      serverScoped: true,
      args: writeArgs,
      preview: async (_ctx, args) => {
        const plan = await this.plan(args);
        return plan.preview;
      },
      run: async (_ctx, args) => {
        const plan = await this.plan(args);
        await this.files.writeFile(args.serverId, args.path, plan.after);
        return text(plan.preview.created ? "File created" : "File saved");
      },
      audit: (args) => ({
        action: AuditAction.FILE_WRITE,
        category: AuditCategory.SERVER,
        resourceName: args.path,
      }),
    });
  }

  private async plan(args: WriteArgs): Promise<{
    after: string;
    preview: Extract<AssistantToolPreview, { type: "diff" }>;
  }> {
    if (isSecretFile(args.path)) throw new Error(SECRET_FILE);
    const before = await this.current(args.serverId, args.path);
    const after =
      args.content ?? this.edited(before ?? "", args.edits as FileEdit[]);
    if (containsRedaction(after) && !containsRedaction(before ?? "")) {
      throw new Error(
        "The new content contains a [redacted] placeholder, use edits that leave secret lines untouched",
      );
    }
    return {
      after,
      preview: {
        type: "diff",
        path: args.path,
        before: before ?? "",
        after,
        created: before === null,
      },
    };
  }

  private edited(before: string, edits: FileEdit[]): string {
    const outcome = applyEdits(before, edits);
    if (!outcome.ok) throw new Error(outcome.error);
    return outcome.text;
  }

  private async current(
    serverId: string,
    path: string,
  ): Promise<string | null> {
    try {
      const buffer = await this.files.readFile(serverId, path);
      if (looksBinary(buffer)) throw new Error("Binary file, cannot edit it");
      return buffer.toString("utf8");
    } catch (err) {
      if (err instanceof NotFoundException) return null;
      throw err;
    }
  }
}

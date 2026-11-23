import type {
  KubekExtensionManifest,
  SettingField,
} from "@kubekpanel/extension-sdk";
import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

/** An installed extension record as returned by the management API */
export class ExtensionSummaryDto {
  @ApiProperty({ description: "Extension id" })
  id: string;

  @ApiProperty({ description: "Installed version" })
  version: string;

  @ApiProperty({ description: "Whether the extension is enabled" })
  enabled: boolean;

  @ApiProperty({
    type: Object,
    additionalProperties: true,
    description: "Extension manifest",
  })
  manifest: KubekExtensionManifest;

  @ApiProperty({
    type: [String],
    description: "Capabilities the user has granted",
  })
  grantedCapabilities: string[];

  @ApiProperty({
    enum: ["installed", "active", "disabled", "error"],
    description: "Lifecycle status",
  })
  status: "installed" | "active" | "disabled" | "error";

  @ApiProperty({
    required: false,
    description: "Error message when status is error",
  })
  error?: string;

  @ApiProperty({ description: "Install timestamp (ms epoch)" })
  installedAt: number;

  @ApiProperty({
    required: false,
    description: "Last update timestamp (ms epoch)",
  })
  updatedAt?: number;

  @ApiProperty({
    required: false,
    description:
      "Whether the extension is currently active in the runtime (present on list responses)",
  })
  active?: boolean;

  @ApiProperty({
    required: false,
    description: "Manifest icon inlined as a data URI",
  })
  icon?: string;
}

/** An active extension with a frontend half, shaped for the panel runtime to mount */
export class ExtensionRegistryEntryDto {
  @ApiProperty({ description: "Extension id" })
  id: string;

  @ApiProperty({ description: "Display name" })
  name: string;

  @ApiProperty({ description: "Extension version" })
  version: string;

  @ApiProperty({ required: false, description: "Icon asset URL" })
  icon?: string;

  @ApiProperty({ description: "URL of the frontend bundle to import" })
  bundleUrl: string;

  @ApiProperty({
    type: Object,
    additionalProperties: true,
    description: "Declared frontend contributions",
  })
  contributes: any;

  @ApiProperty({
    type: Object,
    additionalProperties: true,
    description: "Bundled locale dictionaries by language",
  })
  locales: any;
}

/** A command an extension registered, as the command palette lists it */
export class ExtensionCommandDto {
  @ApiProperty({ description: "Extension id" })
  extId: string;

  @ApiProperty({ description: "Extension display name" })
  extName: string;

  @ApiProperty({ description: "Command id inside the extension" })
  id: string;

  @ApiProperty({ description: "Title to show" })
  title: string;

  @ApiProperty({ required: false, description: "Lucide icon name" })
  icon?: string;

  @ApiProperty({
    required: false,
    description: "Extension permission needed to run it",
  })
  permission?: string;
}

/** Settings form of an extension, secret values are never included */
export class ExtensionSettingsDto {
  @ApiProperty({
    type: "array",
    items: { type: "object", additionalProperties: true },
    description: "settingsSchema fields from the manifest",
  })
  schema: SettingField[];

  @ApiProperty({
    type: Object,
    additionalProperties: true,
    description: "Every non secret field, saved value or the default, null when neither",
  })
  values: Record<string, unknown>;

  @ApiProperty({
    type: Object,
    additionalProperties: { type: "boolean" },
    description: "Secret fields and whether a value is saved",
  })
  secrets: Record<string, boolean>;
}

export class SaveExtensionSettingsDto {
  @ApiProperty({
    type: Object,
    additionalProperties: true,
    description:
      'Field values by key. Secrets: a non empty string sets, null clears, missing or "" keeps. null on other fields resets to the default',
  })
  @IsObject()
  values: Record<string, unknown>;
}

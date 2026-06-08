export interface IBuildTarget {
  platform: Bun.Build.Target;
  suffix: string;
  outputName: string;
  // Compile for the host platform instead of `platform` (used by `-p native`)
  native?: boolean;
}
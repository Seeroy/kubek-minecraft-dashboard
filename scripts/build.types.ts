export interface IBuildTarget {
  platform: Bun.Build.CompileTarget;
  suffix: string;
  outputName: string;
  // Compile for the host platform instead of `platform` (used by `-p native`)
  native?: boolean;
}
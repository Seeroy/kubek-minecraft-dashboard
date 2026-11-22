/** Heap size (MB) where Aikar's flags switch to large-heap tuning */
const AIKAR_LARGE_HEAP_MB = 12 * 1024;

/** Aikar's recommended JVM flags, a few G1GC values change past ~12 GB heap */
export function buildAikarFlags(maxMemoryMb: number): string[] {
  const largeHeap = maxMemoryMb >= AIKAR_LARGE_HEAP_MB;

  return [
    "-XX:+UseG1GC",
    "-XX:+ParallelRefProcEnabled",
    "-XX:MaxGCPauseMillis=200",
    "-XX:+UnlockExperimentalVMOptions",
    "-XX:+DisableExplicitGC",
    "-XX:+AlwaysPreTouch",
    `-XX:G1NewSizePercent=${largeHeap ? 40 : 30}`,
    `-XX:G1MaxNewSizePercent=${largeHeap ? 50 : 40}`,
    `-XX:G1HeapRegionSize=${largeHeap ? 16 : 8}M`,
    `-XX:G1ReservePercent=${largeHeap ? 15 : 20}`,
    "-XX:G1HeapWastePercent=5",
    "-XX:G1MixedGCCountTarget=4",
    `-XX:InitiatingHeapOccupancyPercent=${largeHeap ? 20 : 15}`,
    "-XX:G1MixedGCLiveThresholdPercent=90",
    "-XX:G1RSetUpdatingPauseTimePercent=5",
    "-XX:SurvivorRatio=32",
    "-XX:+PerfDisableSharedMem",
    "-XX:MaxTenuringThreshold=1",
    "-Dusing.aikars.flags=https://mcflags.emc.gs",
    "-Daikars.new.flags=true",
  ];
}

/** Velocity's recommended flags, Aikar's set is tuned for game servers and not for proxies */
export const PROXY_FLAGS = [
  "-XX:+AlwaysPreTouch",
  "-XX:+ParallelRefProcEnabled",
  "-XX:+UnlockExperimentalVMOptions",
  "-XX:+UseG1GC",
  "-XX:G1HeapRegionSize=4M",
  "-XX:MaxInlineLevel=15",
];

/** Proxy set for proxies, Aikar's for everything else */
export const buildTunedFlags = (maxMemoryMb: number, proxy: boolean): string[] =>
  proxy ? PROXY_FLAGS : buildAikarFlags(maxMemoryMb);

export const isProxyBlueprint = (blueprint: { tags?: string[] } | undefined) => !!blueprint?.tags?.includes("proxy");

export interface JvmArgsInput {
  maxMemoryMb: number;
  useAikarFlags: boolean;
  /** Takes the proxy set instead of Aikar's */
  proxy?: boolean;
  extraArguments: string[];
}

/** Tuned GC flags (when enabled) then custom args verbatim */
export function buildJvmArgs({
  maxMemoryMb,
  useAikarFlags,
  proxy = false,
  extraArguments,
}: JvmArgsInput): string[] {
  return [
    ...(useAikarFlags ? buildTunedFlags(maxMemoryMb, proxy) : []),
    ...extraArguments,
  ];
}

/** Whitespace separated user arguments */
export const splitArgs = (raw: string) => raw.split(/\s+/).filter(Boolean);

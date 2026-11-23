const ARCH_ALIASES: Record<string, string> = {
  x86_64: "amd64",
  aarch64: "arm64",
  armv7l: "arm/v7",
  armhf: "arm/v7",
  armv6l: "arm/v6",
};

/** Daemon platform from docker info, e.g. linux/amd64 */
export function daemonPlatform(
  osType: string | undefined,
  architecture: string | undefined,
): string | undefined {
  if (!osType || !architecture) return undefined;
  const arch = architecture.toLowerCase();
  return `${osType.toLowerCase()}/${ARCH_ALIASES[arch] ?? arch}`;
}

/** Whether an image built for these platforms runs on the daemon, no list or an unknown daemon pass */
export function dockerPlatformMatches(
  platforms: string[] | undefined,
  daemon: string | undefined,
): boolean {
  if (!platforms?.length || !daemon) return true;
  return platforms.some((raw) => {
    const p = raw.trim().toLowerCase();
    // linux/arm covers linux/arm/v7 and the other way round
    return (
      p === daemon || daemon.startsWith(`${p}/`) || p.startsWith(`${daemon}/`)
    );
  });
}

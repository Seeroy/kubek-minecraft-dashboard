// A process without a UTF-8 locale (slim Docker images, systemd units) makes Java print non ASCII text as "?"
export function withUtf8Locale(
  env: Record<string, string | undefined>,
  platform: NodeJS.Platform = process.platform,
): Record<string, string | undefined> {
  // macOS and Windows handle console encoding their own way
  if (platform !== "linux") return env;
  // LC_ALL wins over LC_CTYPE, which wins over LANG
  const active = env.LC_ALL || env.LC_CTYPE || env.LANG || "";
  if (/utf-?8/i.test(active)) return env;
  return { ...env, LANG: "C.UTF-8", LC_ALL: "C.UTF-8" };
}

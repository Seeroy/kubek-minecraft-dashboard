type PortHolder = { name: string; variables?: Record<string, unknown> };

const isPortVariable = (key: string) => /PORT$/i.test(key);

export function portOwners(servers: PortHolder[], isPortKey: (key: string) => boolean = isPortVariable) {
  const owners = new Map<number, string>();
  for (const server of servers)
    for (const [key, value] of Object.entries(server.variables ?? {})) if (isPortKey(key) && Number(value)) owners.set(Number(value), server.name);
  return owners;
}

export function nextFreePort(owners: ReadonlyMap<number, string>, from: number) {
  let port = from;
  while (owners.has(port)) port++;
  return port;
}

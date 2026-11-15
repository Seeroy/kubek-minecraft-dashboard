// Modrinth ids are lowercase, these brands are not a plain capital letter
const SPECIAL: Record<string, string> = {
  bungeecord: "BungeeCord",
  neoforge: "NeoForge",
  liteloader: "LiteLoader",
  modloader: "ModLoader",
  datapack: "Data Pack",
};

// Modrinth loader id as shown to users, folia becomes Folia
export function loaderName(id: string) {
  return SPECIAL[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}

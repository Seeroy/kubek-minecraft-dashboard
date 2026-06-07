// Cross-cutting query hooks that don't belong to a single module live here;
// domain-specific queries live under their owning module's api/ folder.
export * from "./config.queries";
export * from "./modrinth-content.queries";
export { qk } from "./query-keys";

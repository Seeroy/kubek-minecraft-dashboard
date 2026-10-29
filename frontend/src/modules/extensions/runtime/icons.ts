// The full lucide set is only needed once an extension is active, so it lives in its own chunk
let pending: Promise<typeof import("lucide-react")> | null = null;

export const loadIcons = () => (pending ??= import("lucide-react"));

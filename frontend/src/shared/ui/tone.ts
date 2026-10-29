export type Tone =
  | "green"
  | "blue"
  | "purple"
  | "amber"
  | "pink"
  | "cyan"
  | "red"
  | "orange"
  | "gray"
  | "primary"

// Literal class names so Tailwind can see every tone
export const toneClass: Record<Tone, string> = {
  green: "tone-green",
  blue: "tone-blue",
  purple: "tone-purple",
  amber: "tone-amber",
  pink: "tone-pink",
  cyan: "tone-cyan",
  red: "tone-red",
  orange: "tone-orange",
  gray: "tone-gray",
  primary: "tone-primary",
}

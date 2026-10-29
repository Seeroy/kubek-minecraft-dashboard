/** Names an account can have */
export const MOJANG_NAME = /^[A-Za-z0-9_]{1,16}$/;

// Offline servers and Floodgate also see a leading dot for Bedrock players
export const PLAYER_NAME = /^\.?[A-Za-z0-9_]{1,16}$/;

export const DEFAULT_OP_LEVEL = 4;

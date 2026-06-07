import { SetMetadata } from "@nestjs/common";

/**
 * Key used to store public route metadata
 */
export const IS_PUBLIC_KEY = "isPublic";

/**
 * Decorator to mark a route as public (no authentication required)
 * @returns Custom decorator
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

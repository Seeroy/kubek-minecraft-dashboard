import type { ArgumentsHost } from "@nestjs/common";

// Nest keeps it out of the package exports
export type HttpArgumentsHost = ReturnType<ArgumentsHost["switchToHttp"]>;

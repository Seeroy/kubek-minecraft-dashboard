import { Injectable } from "@nestjs/common";

@Injectable()
export class ErrorRecognizerService {
  /**
   * Predefined error patterns for Minecraft server logs
   */
  private readonly errorDefinitions = [
    {
      type: "out_of_memory",
      severity: "critical" as const,
      patterns: [
        /java\.lang\.OutOfMemoryError/i,
        /Exception in thread .* java\.lang\.OutOfMemoryError/i,
        /There is insufficient memory for the Java Runtime Environment/i,
      ],
    },
    {
      type: "port_bind_failed",
      severity: "high" as const,
      patterns: [
        /Address already in use/i,
        /Failed to bind to port/i,
        /java\.net\.BindException/i,
        /Caused by: java\.net\.BindException/i,
      ],
    },
    {
      type: "world_corruption",
      severity: "high" as const,
      patterns: [
        /Corrupt chunk found/i,
        /World corruption detected/i,
        /Failed to load world/i,
        /Exception loading world/i,
      ],
    },
    {
      type: "plugin_error",
      severity: "medium" as const,
      patterns: [
        /Could not load .* plugin/i,
        /Plugin .* has failed to register/i,
        /Error occurred while enabling .* plugin/i,
        /Plugin .* threw an exception/i,
      ],
    },
    {
      type: "disk_space",
      severity: "high" as const,
      patterns: [
        /No space left on device/i,
        /Disk full/i,
        /Insufficient disk space/i,
      ],
    },
    {
      type: "network_error",
      severity: "medium" as const,
      patterns: [
        /Connection reset/i,
        /Network is unreachable/i,
        /Failed to connect/i,
        /SocketException/i,
      ],
    },
    {
      type: "configuration_error",
      severity: "medium" as const,
      patterns: [
        /Invalid configuration/i,
        /Malformed configuration/i,
        /Error loading configuration/i,
        /server\.properties.*error/i,
      ],
    },
    {
      type: "java_version_incompatible",
      severity: "high" as const,
      patterns: [
        /UnsupportedClassVersionError/i,
        /Java version.*not supported/i,
        /Incompatible Java version/i,
        /requires running the server with Java/i,
        /Unsupported Java detected/i,
        /Only up to Java \d+ is supported/i,
      ],
    },
    {
      type: "file_permission_error",
      severity: "medium" as const,
      patterns: [
        /Permission denied/i,
        /Access is denied/i,
        /Cannot create directory/i,
        /Cannot write to file/i,
      ],
    },
    {
      type: "mod_conflict",
      severity: "medium" as const,
      patterns: [
        /Mod .* conflict/i,
        /Incompatible mods/i,
        /Mod loading error/i,
        /Forge mod .* failed/i,
      ],
    },
  ];

  /**
   * Analyze a log line for potential errors
   * @param line The log line to analyze
   * @returns Error recognition result or null if no error detected
   */
  recognizeError(line: string) {
    if (!line || !line.trim()) {
      return null;
    }

    const trimmedLine = line.trim();

    for (const definition of this.errorDefinitions) {
      for (const pattern of definition.patterns) {
        if (pattern.test(trimmedLine)) {
          return {
            type: "error",
            errorType: definition.type,
            severity: definition.severity,
          };
        }
      }
    }

    return null;
  }

  /**
   * Get all predefined error definitions
   * @returns Array of error definitions
   */
  getErrorDefinitions() {
    return this.errorDefinitions.map((def) => ({
      type: def.type,
      severity: def.severity,
    }));
  }
}

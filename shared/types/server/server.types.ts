// Known official core identifiers (For legacy migration)
export type OfficialCoreType =
  | "paper"
  | "purpur"
  | "waterfall"
  | "velocity"
  | "vanilla"
  | "fabric"
  | "spigot"
  | "folia"
  | "bedrock"
  | "beammp";

export type ServerCoreType = OfficialCoreType | "custom";

export type ServerCoreSource =
  | {
      kind: "official";
      version: string;
      metadata?: Record<string, any>;
    }
  | {
      kind: "custom";
      originalName: string;
      size: number;
      fileName: string;
      sha256: string;
      metadata?: Record<string, any>;
    };

export type ServerVariableValue = string | number | boolean;

export interface IServer {
  id: string;
  name: string;
  status: ServerStatus;
  restartOnError: ServerRestartProps;
  folderId?: string | null;

  blueprintId: string;
  blueprintVersion?: string;
  variables: Record<string, ServerVariableValue>;
  runtimeKind?: "native" | "docker";
}

export interface NewServerProps {
  name: string;
  blueprintId: string;
  variables: Record<string, ServerVariableValue>;
  /** Per-server runtime override, falls back to the global serverRuntime setting when omitted */
  runtime?: "native" | "docker";
}

export type ServerRestartProps = {
  enabled: boolean;
  attempts: number;
};

export enum ServerStatus {
  STOPPED = "stopped",
  RUNNING = "running",
  STARTING = "starting",
  STOPPING = "stopping",
}

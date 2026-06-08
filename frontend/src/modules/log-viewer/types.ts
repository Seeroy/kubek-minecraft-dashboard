export interface ILogFile {
  name: string;
  path: string;
  size: number;
  modify: string;
  gzipped: boolean;
}

export interface ILogSearchResult {
  lineNumber: number;
  line: string;
}

export type LogLineLevel = "INFO" | "WARN" | "ERROR" | "DEBUG" | "OTHER";

export interface ParsedLogLine {
  raw: string;
  time?: string;
  source?: string;
  level: LogLineLevel;
  message: string;
}

export interface LogFileDto {
  name: string;
  path: string;
  size: number;
  modify: string;
  gzipped: boolean;
}

export interface LogSearchResultDto {
  lineNumber: number;
  line: string;
}

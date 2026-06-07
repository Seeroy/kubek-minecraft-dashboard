export interface Server {
  id: string;
  name: string;
  type?: string;
  core?: any;
  status?: string;

  [key: string]: any;
}

export interface ServerStatusData {
  serverId: string;
  status: string;
  players?: {
    online: number;
    max: number;
    list?: string[];
  };
  runtime?: {
    playersOnline?: number;
    startedAt?: string;
  };
  version?: string;
  timestamp?: string;
}

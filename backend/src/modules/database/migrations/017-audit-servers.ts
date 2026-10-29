import type { Database } from "bun:sqlite";

// Entries name the server they touched and keep a before and after diff.
// Old rows get the server from what they already recorded
export function auditServers(db: Database): void {
  db.run("ALTER TABLE audit_logs ADD COLUMN serverId TEXT");
  db.run("ALTER TABLE audit_logs ADD COLUMN serverName TEXT");
  db.run("ALTER TABLE audit_logs ADD COLUMN changes TEXT");

  db.run(`UPDATE audit_logs SET serverId = resourceId, serverName = resourceName
    WHERE resourceType = 'server' AND resourceId IS NOT NULL`);
  db.run(`UPDATE audit_logs SET serverId = json_extract(details, '$.serverId')
    WHERE serverId IS NULL AND json_valid(details)
      AND json_type(details, '$.serverId') = 'text'`);
  db.run(`UPDATE audit_logs
    SET serverId = (SELECT serverId FROM backups WHERE backups.id = audit_logs.resourceId)
    WHERE serverId IS NULL AND resourceType = 'backup'`);
  // Policy entries used the server as their resource id
  db.run(`UPDATE audit_logs SET serverId = resourceId
    WHERE serverId IS NULL AND resourceType = 'backup_policy'
      AND resourceId IN (SELECT id FROM servers)`);
  db.run(`UPDATE audit_logs
    SET serverName = (SELECT name FROM servers WHERE servers.id = audit_logs.serverId)
    WHERE serverId IS NOT NULL AND serverName IS NULL`);

  db.run("CREATE INDEX idx_audit_logs_server_id ON audit_logs (serverId)");
}

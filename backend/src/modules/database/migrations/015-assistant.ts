import type { Database } from "bun:sqlite";

// Assistant chats. Tool calls get their own table: each one is confirmed,
// run and audited on its own, and the provider tool messages are rebuilt
// from them instead of being stored twice
export function assistant(db: Database): void {
  db.run(`CREATE TABLE assistant_conversations (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    serverId TEXT REFERENCES servers(id) ON DELETE SET NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  db.run(
    "CREATE INDEX idx_assistant_conversations_user ON assistant_conversations (userId, updatedAt DESC)",
  );

  db.run(`CREATE TABLE assistant_messages (
    id TEXT PRIMARY KEY,
    conversationId TEXT NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL DEFAULT '',
    error TEXT,
    createdAt INTEGER NOT NULL
  )`);
  db.run(
    "CREATE UNIQUE INDEX idx_assistant_messages_seq ON assistant_messages (conversationId, seq)",
  );

  // Ids are minted by the panel, providers may repeat their own. args is the
  // opaque provider payload, preview a snapshot taken when the call paused
  db.run(`CREATE TABLE assistant_tool_calls (
    id TEXT PRIMARY KEY,
    messageId TEXT NOT NULL REFERENCES assistant_messages(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    name TEXT NOT NULL,
    args TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'error', 'rejected')),
    result TEXT,
    preview TEXT
  )`);
  db.run(
    "CREATE UNIQUE INDEX idx_assistant_tool_calls_position ON assistant_tool_calls (messageId, position)",
  );
}

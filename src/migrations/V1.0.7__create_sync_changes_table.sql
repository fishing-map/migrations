-- Migration: V1.0.7__create_sync_changes_table
-- Timestamp: 1764190648214
-- Cria tabela para sincronização de mudanças entre cliente e servidor

CREATE TABLE IF NOT EXISTS sync_changes (
  seq BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_public_id VARCHAR(255) NOT NULL,
  op VARCHAR(20) NOT NULL CHECK (op IN ('upsert', 'delete')),
  payload JSONB NOT NULL DEFAULT '{}',
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  client_generated_id VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sync_changes_seq ON sync_changes (seq);
CREATE INDEX IF NOT EXISTS idx_sync_changes_user_id ON sync_changes (user_id);
CREATE INDEX IF NOT EXISTS idx_sync_changes_entity ON sync_changes (entity_type, entity_public_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_changes_user_client_id ON sync_changes (COALESCE(user_id, 0), client_generated_id);
CREATE INDEX IF NOT EXISTS idx_sync_changes_created_at ON sync_changes (created_at);

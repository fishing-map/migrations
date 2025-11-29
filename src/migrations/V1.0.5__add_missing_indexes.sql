-- Migration: V1.0.5__add_missing_indexes
-- Timestamp: 1763555932835
-- Adiciona índices para melhorar performance de queries

-- Índices em Foreign Keys
CREATE INDEX IF NOT EXISTS idx_spots_created_by ON spots (created_by);
CREATE INDEX IF NOT EXISTS idx_catches_spot_id ON catches (spot_id);
CREATE INDEX IF NOT EXISTS idx_catches_created_by ON catches (created_by);
CREATE INDEX IF NOT EXISTS idx_comments_spot_id ON comments (spot_id);
CREATE INDEX IF NOT EXISTS idx_comments_incident_id ON comments (incident_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON comments (created_by);
CREATE INDEX IF NOT EXISTS idx_confirmations_incident_id ON confirmations (incident_id);
CREATE INDEX IF NOT EXISTS idx_confirmations_user_id ON confirmations (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);

-- Índices Compostos para Queries Frequentes
CREATE INDEX IF NOT EXISTS idx_incidents_status_created_at ON incidents (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spots_privacy_created_at ON spots (privacy, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_gamification_points_level ON user_gamification (points DESC, level DESC);
CREATE INDEX IF NOT EXISTS idx_catches_captured_at ON catches (captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- Migration: V1.0.3__fix_refresh_tokens_column_names
-- Timestamp: 1763519058748
-- Padroniza nomes de colunas da tabela refresh_tokens para snake_case

ALTER TABLE refresh_tokens RENAME COLUMN "expiresAt" TO expires_at;
ALTER TABLE refresh_tokens RENAME COLUMN "createdAt" TO created_at;
ALTER TABLE refresh_tokens RENAME COLUMN "revokedAt" TO revoked_at;
ALTER TABLE refresh_tokens RENAME COLUMN "createdByIp" TO created_by_ip;
ALTER TABLE refresh_tokens RENAME COLUMN "revokedByIp" TO revoked_by_ip;

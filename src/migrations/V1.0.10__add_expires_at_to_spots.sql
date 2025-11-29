-- Migration: V1.0.10__add_expires_at_to_spots
-- Timestamp: 1764284929267
-- Adiciona coluna expires_at à tabela spots

ALTER TABLE spots
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

UPDATE spots
SET expires_at = created_at + INTERVAL '30 minutes'
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_spots_expires_at
ON spots(expires_at)
WHERE expires_at IS NOT NULL;

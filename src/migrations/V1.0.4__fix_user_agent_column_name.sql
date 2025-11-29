-- Migration: V1.0.4__fix_user_agent_column_name
-- Timestamp: 1763519317654
-- Padroniza nome da coluna userAgent para snake_case

ALTER TABLE refresh_tokens RENAME COLUMN "userAgent" TO user_agent;

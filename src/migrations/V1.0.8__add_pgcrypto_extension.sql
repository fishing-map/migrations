-- Migration: V1.0.8__add_pgcrypto_extension
-- Timestamp: 1764207588273
-- Adiciona extensão pgcrypto para funções de criptografia

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

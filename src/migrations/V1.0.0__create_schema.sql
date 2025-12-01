-- Migration: V1.0.0__create_schema
-- Timestamp: 1733142000000
-- Cria o schema inicial da aplicação FishingMap

-- Criar schema da aplicação
CREATE SCHEMA IF NOT EXISTS fishing_map;

-- Garantir que as extensões estejam disponíveis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;

-- Comentário do schema
COMMENT ON SCHEMA fishing_map IS 'Schema principal da aplicação FishingMap';


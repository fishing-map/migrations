-- Migration: V1.0.9__update_null_nicknames
-- Timestamp: 1764283870639
-- Atualiza nicknames NULL com a primeira parte do nome

UPDATE users
SET nickname = SPLIT_PART(name, ' ', 1)
WHERE nickname IS NULL;

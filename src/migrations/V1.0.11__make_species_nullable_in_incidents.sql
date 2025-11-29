-- Migration: V1.0.11__make_species_nullable_in_incidents
-- Timestamp: 1764287537939
-- Torna coluna species nullable e remove species_list

ALTER TABLE incidents
ALTER COLUMN species DROP NOT NULL;

ALTER TABLE incidents
DROP COLUMN IF EXISTS species_list;

-- Migration: V1.0.6__add_unique_constraint_to_species_statistics
-- Timestamp: 1763597911254
-- Adiciona índice único composto em species_statistics (species, grid_cell)

CREATE UNIQUE INDEX IF NOT EXISTS idx_26ee15f4ba38c421e98877bb03 ON species_statistics (species, grid_cell);

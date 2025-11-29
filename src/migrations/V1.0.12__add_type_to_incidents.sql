-- Migration: V1.0.12__add_type_to_incidents
-- Timestamp: 1764290524517
-- Adiciona coluna incident_type à tabela incidents

ALTER TABLE incidents
ADD COLUMN incident_type VARCHAR(50);

UPDATE incidents
SET incident_type = CASE
    WHEN species IS NOT NULL AND species != '' THEN 'fish_catch'
    ELSE 'danger_alert'
END;

ALTER TABLE incidents
ALTER COLUMN incident_type SET NOT NULL;

ALTER TABLE incidents
ADD CONSTRAINT chk_incident_type
CHECK (incident_type IN ('fish_catch', 'danger_alert', 'weather_warning', 'suggestion'));

CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);

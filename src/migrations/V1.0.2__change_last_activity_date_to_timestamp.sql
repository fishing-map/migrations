-- Migration: V1.0.2__change_last_activity_date_to_timestamp
-- Timestamp: 1763517615887
-- Altera coluna last_activity_date de DATE para TIMESTAMP

ALTER TABLE user_gamification ALTER COLUMN last_activity_date TYPE TIMESTAMP USING last_activity_date::timestamp;

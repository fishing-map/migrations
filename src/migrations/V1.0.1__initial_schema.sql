-- Migration: V1.0.1__initial_schema
-- Timestamp: 1763427065214
-- Cria o schema inicial do banco de dados FishingMap

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

-- Criar ENUM para tipo de água
CREATE TYPE incidents_water_type_enum AS ENUM('fresh', 'salt', 'brackish');

-- Tabela: confirmations
CREATE TABLE confirmations (
  id BIGSERIAL NOT NULL,
  public_id TEXT,
  choice SMALLINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  incident_id BIGINT,
  user_id BIGINT,
  CONSTRAINT uq_confirmation_incident_user UNIQUE (incident_id, user_id),
  CONSTRAINT pk_8a3991e9a203e6460dcb9048746 PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_5702be95a0f0a8800ba718359a ON confirmations (public_id);

-- Tabela: incidents
CREATE TABLE incidents (
  id BIGSERIAL NOT NULL,
  public_id TEXT,
  species TEXT NOT NULL,
  species_list TEXT[] NOT NULL DEFAULT '{}',
  bait_used TEXT,
  description TEXT,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  accuracy DOUBLE PRECISION,
  depth DOUBLE PRECISION,
  water_type incidents_water_type_enum NOT NULL DEFAULT 'fresh',
  water_temperature DOUBLE PRECISION,
  weather_conditions TEXT,
  weather_temperature DOUBLE PRECISION,
  weather_condition TEXT,
  weather_wind_speed DOUBLE PRECISION,
  weather_pressure DOUBLE PRECISION,
  weather_humidity INTEGER,
  weather_moon_phase DOUBLE PRECISION,
  view_count INTEGER NOT NULL DEFAULT 0,
  confirmation_count INTEGER NOT NULL DEFAULT 0,
  positive_votes INTEGER NOT NULL DEFAULT 0,
  negative_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  notify_count INTEGER NOT NULL DEFAULT 0,
  dismiss_at TIMESTAMP WITH TIME ZONE,
  client_local_id TEXT,
  reporter_id BIGINT,
  CONSTRAINT pk_ccb34c01719889017e2246469f9 PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_7149e32c7c4f7d0c7e30c6597a ON incidents (public_id);
CREATE INDEX idx_7f493bb8565fbaf82991acc774 ON incidents USING GiST (geom);
CREATE INDEX idx_6fa7e61c79777de95b6a4ecd63 ON incidents (status);
CREATE INDEX idx_b6a413b8f2c780643fd7674e5f ON incidents (client_local_id);

-- Tabela: refresh_tokens
CREATE TABLE refresh_tokens (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  token VARCHAR(500) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "revokedAt" TIMESTAMP,
  "createdByIp" VARCHAR(45),
  "revokedByIp" VARCHAR(45),
  "userAgent" VARCHAR(255),
  user_id BIGINT,
  CONSTRAINT pk_7d8bee0204106019488c4c50ffa PRIMARY KEY (id)
);

-- Tabela: users
CREATE TABLE users (
  id BIGSERIAL NOT NULL,
  public_id TEXT,
  name TEXT NOT NULL,
  nickname TEXT,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  avatar_url TEXT,
  last_location GEOGRAPHY(Point, 4326),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT pk_a3ffb1c0c8416b9fc6f907b7433 PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_97672ac88f789774dd47f7c8be ON users (email);

-- Tabela: spots
CREATE TABLE spots (
  id BIGSERIAL NOT NULL,
  public_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  type_of_water TEXT,
  privacy TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by BIGINT NOT NULL,
  CONSTRAINT pk_cc8c0341ef60619746e42815cf4 PRIMARY KEY (id)
);

-- Tabela: species_statistics
CREATE TABLE species_statistics (
  id BIGSERIAL NOT NULL,
  species TEXT NOT NULL,
  geom GEOGRAPHY(Point, 4326) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  sighting_count INTEGER NOT NULL DEFAULT 0,
  catch_count INTEGER NOT NULL DEFAULT 0,
  confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  common_baits TEXT[] NOT NULL DEFAULT '{}',
  water_type TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  grid_cell TEXT NOT NULL,
  CONSTRAINT pk_6a9cfb9a4dafcc403862b45d6be PRIMARY KEY (id)
);

CREATE INDEX idx_389faa3da2f72de883b7649e31 ON species_statistics (species);
CREATE INDEX idx_d40e0d2392af33beafc012e86c ON species_statistics USING GiST (geom);
CREATE INDEX idx_09c0cbee863f6810faa8986d3c ON species_statistics (grid_cell);

-- Tabela: user_gamification
CREATE TABLE user_gamification (
  id BIGSERIAL NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  badges TEXT[] NOT NULL DEFAULT '{}',
  streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_spots INTEGER NOT NULL DEFAULT 0,
  total_votes INTEGER NOT NULL DEFAULT 0,
  total_comments INTEGER NOT NULL DEFAULT 0,
  votes_received INTEGER NOT NULL DEFAULT 0,
  positive_votes_received INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id BIGINT NOT NULL,
  CONSTRAINT rel_dbbacb32749a0f1b1639e1f6c1 UNIQUE (user_id),
  CONSTRAINT pk_db92d24015cda11113d1a3cad80 PRIMARY KEY (id)
);

-- Tabela: comments
CREATE TABLE comments (
  id BIGSERIAL NOT NULL,
  public_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  spot_id BIGINT,
  incident_id BIGINT,
  created_by BIGINT NOT NULL,
  CONSTRAINT uq_a37022e07d609269ec72c36c845 UNIQUE (public_id),
  CONSTRAINT pk_8bf68bc960f2b69e818bdb90dcb PRIMARY KEY (id)
);

-- Tabela: catches
CREATE TABLE catches (
  id BIGSERIAL NOT NULL,
  public_id TEXT NOT NULL,
  species TEXT NOT NULL,
  weight NUMERIC,
  length NUMERIC,
  method TEXT,
  weather TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  spot_id BIGINT NOT NULL,
  created_by BIGINT NOT NULL,
  CONSTRAINT uq_23cab7667f84c66f78d7f5c3ab3 UNIQUE (public_id),
  CONSTRAINT pk_e454682026631f20fc9cf55bf4f PRIMARY KEY (id)
);

-- Foreign Keys
ALTER TABLE confirmations ADD CONSTRAINT fk_a5cc325372b04a48da3a40d07df FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE;
ALTER TABLE confirmations ADD CONSTRAINT fk_1064a35689548a606231b93db2c FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE incidents ADD CONSTRAINT fk_997933e2e9897cd680e453805ca FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE refresh_tokens ADD CONSTRAINT fk_3ddc983c5f7bcf132fd8732c3f4 FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE spots ADD CONSTRAINT fk_0f1442216fcee3f59b615a43bdc FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE user_gamification ADD CONSTRAINT fk_dbbacb32749a0f1b1639e1f6c1d FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE comments ADD CONSTRAINT fk_3a03cf3c94fe9625d49c6f5a07f FOREIGN KEY (spot_id) REFERENCES spots(id);
ALTER TABLE comments ADD CONSTRAINT fk_a8b2a88ffa993f53b2861c5bf4a FOREIGN KEY (incident_id) REFERENCES incidents(id);
ALTER TABLE comments ADD CONSTRAINT fk_980bfefe00ed11685f325d0bd4c FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE catches ADD CONSTRAINT fk_066f39ec4066760019131ddc40a FOREIGN KEY (spot_id) REFERENCES spots(id);
ALTER TABLE catches ADD CONSTRAINT fk_c2a3ff4ded79ca97d5920f7dee0 FOREIGN KEY (created_by) REFERENCES users(id);

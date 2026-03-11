-- Hena Wadeena — Database Initialization
-- Runs once on first Postgres container start (docker-entrypoint-initdb.d)
-- Creates all required schemas and enables extensions

-- Enable extensions (database-level, available to all schemas)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create per-service schemas
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS market;
CREATE SCHEMA IF NOT EXISTS guide_booking;
CREATE SCHEMA IF NOT EXISTS map;
CREATE SCHEMA IF NOT EXISTS ai;

-- Grant schema permissions to app user
GRANT ALL PRIVILEGES ON SCHEMA identity TO hena;
GRANT ALL PRIVILEGES ON SCHEMA market TO hena;
GRANT ALL PRIVILEGES ON SCHEMA guide_booking TO hena;
GRANT ALL PRIVILEGES ON SCHEMA map TO hena;
GRANT ALL PRIVILEGES ON SCHEMA ai TO hena;

-- Default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT ALL ON TABLES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA market GRANT ALL ON TABLES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA guide_booking GRANT ALL ON TABLES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA map GRANT ALL ON TABLES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai GRANT ALL ON TABLES TO hena;

-- Sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT ALL ON SEQUENCES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA market GRANT ALL ON SEQUENCES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA guide_booking GRANT ALL ON SEQUENCES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA map GRANT ALL ON SEQUENCES TO hena;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai GRANT ALL ON SEQUENCES TO hena;

-- Set search_path comment for documentation
COMMENT ON SCHEMA identity IS 'Identity service: users, auth, KYC, notifications, saved items';
COMMENT ON SCHEMA market IS 'Market service: listings, price index, business directory, reviews, investments';
COMMENT ON SCHEMA guide_booking IS 'Guide-Booking service: guides, tours, packages, bookings';
COMMENT ON SCHEMA map IS 'Map service: POIs, carpool rides, routes';
COMMENT ON SCHEMA ai IS 'AI service: chat sessions, knowledge base documents';

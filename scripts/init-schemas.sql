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

-- ---------------------------------------------------------------------------
-- Per-service roles
-- Each service role has USAGE on its own schema only, keeping blast radius
-- small if credentials for one service are compromised.
-- ---------------------------------------------------------------------------

-- identity_svc
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'identity_svc') THEN
    CREATE ROLE identity_svc LOGIN;
  END IF;
END $$;

-- market_svc
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'market_svc') THEN
    CREATE ROLE market_svc LOGIN;
  END IF;
END $$;

-- guide_booking_svc
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'guide_booking_svc') THEN
    CREATE ROLE guide_booking_svc LOGIN;
  END IF;
END $$;

-- map_svc
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'map_svc') THEN
    CREATE ROLE map_svc LOGIN;
  END IF;
END $$;

-- ai_svc
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ai_svc') THEN
    CREATE ROLE ai_svc LOGIN;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Schema-level grants — each role can only see its own schema
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA identity       TO identity_svc;
GRANT USAGE ON SCHEMA market         TO market_svc;
GRANT USAGE ON SCHEMA guide_booking  TO guide_booking_svc;
GRANT USAGE ON SCHEMA map            TO map_svc;
GRANT USAGE ON SCHEMA ai             TO ai_svc;

-- ---------------------------------------------------------------------------
-- Table and sequence grants for current and future objects
-- ---------------------------------------------------------------------------

-- identity_svc
GRANT ALL ON ALL TABLES IN SCHEMA identity    TO identity_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA identity TO identity_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT ALL ON TABLES    TO identity_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT ALL ON SEQUENCES TO identity_svc;

-- market_svc
GRANT ALL ON ALL TABLES IN SCHEMA market    TO market_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA market TO market_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA market GRANT ALL ON TABLES    TO market_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA market GRANT ALL ON SEQUENCES TO market_svc;

-- guide_booking_svc
GRANT ALL ON ALL TABLES IN SCHEMA guide_booking    TO guide_booking_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA guide_booking TO guide_booking_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA guide_booking GRANT ALL ON TABLES    TO guide_booking_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA guide_booking GRANT ALL ON SEQUENCES TO guide_booking_svc;

-- map_svc
GRANT ALL ON ALL TABLES IN SCHEMA map    TO map_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA map TO map_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA map GRANT ALL ON TABLES    TO map_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA map GRANT ALL ON SEQUENCES TO map_svc;

-- ai_svc
GRANT ALL ON ALL TABLES IN SCHEMA ai    TO ai_svc;
GRANT ALL ON ALL SEQUENCES IN SCHEMA ai TO ai_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai GRANT ALL ON TABLES    TO ai_svc;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai GRANT ALL ON SEQUENCES TO ai_svc;

-- ---------------------------------------------------------------------------
-- Schema documentation
-- ---------------------------------------------------------------------------
COMMENT ON SCHEMA identity      IS 'Identity service: users, auth, KYC, notifications, saved items';
COMMENT ON SCHEMA market        IS 'Market service: listings, price index, business directory, reviews, investments';
COMMENT ON SCHEMA guide_booking IS 'Guide-Booking service: guides, tours, packages, bookings';
COMMENT ON SCHEMA map           IS 'Map service: POIs, carpool rides, routes';
COMMENT ON SCHEMA ai            IS 'AI service: chat sessions, knowledge base documents';

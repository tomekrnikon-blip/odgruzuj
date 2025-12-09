-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move uuid-ossp extension to extensions schema (if exists in public)
DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- Move pgcrypto extension to extensions schema (if exists in public)
DROP EXTENSION IF EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" SCHEMA extensions;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
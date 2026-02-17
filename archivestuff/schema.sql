-- Postgres schema for forms and responses

-- enable uuid and pgcrypto for optional server-side encryption
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Accounts (minimal)
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Forms table stores the form schema in jsonb
CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  name text,
  schema jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Responses table stores each submission as jsonb plus some indexed metadata
CREATE TABLE IF NOT EXISTS responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_id uuid REFERENCES forms(id) ON DELETE CASCADE,
  response jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  respondent_ip inet,
  respondent_hash text, -- optional hashed identifier (e.g., HMAC of IP/email)
  email text -- optional extracted email for indexing
);

-- Indexes for querying json fields and metadata
CREATE INDEX IF NOT EXISTS idx_forms_schema ON forms USING gin (schema);
CREATE INDEX IF NOT EXISTS idx_responses_response ON responses USING gin (response);
CREATE INDEX IF NOT EXISTS idx_responses_form_id_created_at ON responses (form_id, created_at);
CREATE INDEX IF NOT EXISTS idx_responses_email ON responses (email);

-- Example helper: extract a common field into a computed column (materialized via trigger or application)
-- For high-traffic queries, consider storing frequently queried fields (email, phone) in separate columns and keep their encrypted values.

-- Notes:
-- - Use application-layer encryption for per-field encryption where possible (e.g., AES-GCM with a key management system).
-- - If using pgcrypto, store ciphertext and IV in dedicated columns, or use pgcrypto functions to encrypt/decrypt per-row.
-- - Keep encryption keys out of the DB and rotate keys periodically.
-- - Consider hashing IPs for rate-limiting while keeping raw IPs out of plaintext storage.

-- Up
-- Create auth_tokens table for secure token storage
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  provider_id VARCHAR(255) NOT NULL,
  encrypted_token TEXT NOT NULL,
  token_type VARCHAR(20) NOT NULL CHECK (token_type IN ('oauth', 'api')),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one token per user-provider combination
  CONSTRAINT auth_tokens_user_provider_unique UNIQUE (user_id, provider_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS auth_tokens_user_id_idx ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS auth_tokens_provider_id_idx ON auth_tokens(provider_id);
CREATE INDEX IF NOT EXISTS auth_tokens_expires_at_idx ON auth_tokens(expires_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auth_tokens_updated_at BEFORE UPDATE
    ON auth_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down
DROP TABLE IF EXISTS auth_tokens;

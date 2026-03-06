-- Enums
CREATE TYPE account_type AS ENUM ('checking', 'savings', 'credit_card', 'investment');
CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');

-- Account
CREATE TABLE account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type account_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Category
CREATE TABLE category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Transaction
CREATE TABLE transaction (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  description_raw text NOT NULL,
  description_clean text NOT NULL,
  amount decimal(12, 2) NOT NULL,
  account_id uuid NOT NULL REFERENCES account(id),
  category_id uuid REFERENCES category(id),
  status transaction_status NOT NULL DEFAULT 'approved',
  statement_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, date, amount, description_raw)
);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to account
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON account
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Apply trigger to transaction
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON transaction
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

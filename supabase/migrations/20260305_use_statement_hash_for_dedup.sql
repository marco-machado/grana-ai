-- Drop the old unique constraint
ALTER TABLE transaction DROP CONSTRAINT transaction_account_id_date_amount_description_raw_key;

-- For transactions WITH a statement_hash (e.g., Nubank Checking with Identificador)
CREATE UNIQUE INDEX transaction_account_statement_hash_idx
  ON transaction (account_id, statement_hash)
  WHERE statement_hash IS NOT NULL;

-- For transactions WITHOUT a statement_hash (e.g., credit card)
CREATE UNIQUE INDEX transaction_account_date_amount_desc_idx
  ON transaction (account_id, date, amount, description_raw)
  WHERE statement_hash IS NULL;

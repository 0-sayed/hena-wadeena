ALTER TABLE identity.users ADD CONSTRAINT users_balance_non_negative CHECK (balance_piasters >= 0);

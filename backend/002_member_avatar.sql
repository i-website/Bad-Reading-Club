-- Apply once to databases created before avatar support was added.
ALTER TABLE members ADD COLUMN avatar JSON DEFAULT NULL;

-- Apply once to an existing member database.
ALTER TABLE members
    MODIFY token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
    ADD COLUMN email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL UNIQUE,
    ADD COLUMN password_hash VARCHAR(255) DEFAULT NULL;

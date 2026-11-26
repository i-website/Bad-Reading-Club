CREATE TABLE IF NOT EXISTS email_login_codes (
    email VARCHAR(254)
        CHARACTER SET ascii
        COLLATE ascii_general_ci
        NOT NULL PRIMARY KEY,
    code_hash CHAR(64)
        CHARACTER SET ascii
        COLLATE ascii_bin
        DEFAULT NULL,
    expires_at BIGINT NOT NULL,
    sent_at BIGINT NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at BIGINT NOT NULL,
    sends_in_window INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

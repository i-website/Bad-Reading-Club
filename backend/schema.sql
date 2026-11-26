-- Run in an existing database dedicated to the club's member accounts.
CREATE TABLE IF NOT EXISTS auth_attempts (
    ip VARCHAR(45) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempted_at BIGINT NOT NULL,
    INDEX auth_attempts_time (attempted_at),
    INDEX auth_attempts_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auth_rate_limits (
    ip VARCHAR(45) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    window_started_at BIGINT NOT NULL,
    attempts INT UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    avatar JSON DEFAULT NULL,
    email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL UNIQUE,
    password_hash VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS member_ratings (
    member_id BIGINT UNSIGNED NOT NULL,
    book_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    review TEXT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, book_id),
    INDEX member_ratings_book (book_id),
    CONSTRAINT member_ratings_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT member_ratings_score_check CHECK (score BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    slug VARCHAR(160) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    cover_path VARCHAR(255) DEFAULT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    initial_rating DECIMAL(4,2) NOT NULL DEFAULT 0,
    initial_votes INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (initial_rating BETWEEN 0 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    book_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    starts_at VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
    place VARCHAR(500) DEFAULT NULL,
    place_url VARCHAR(2048) DEFAULT NULL,
    price DECIMAL(10,2) DEFAULT NULL,
    notes TEXT NOT NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    is_past BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX meetings_book (book_id),
    CONSTRAINT meetings_book_fk FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CHECK (price IS NULL OR price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS club_settings (
    id INT NOT NULL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    links JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO club_settings (id, name, description, links) VALUES (1, 'BAD READING CLUB', '', JSON_ARRAY());

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
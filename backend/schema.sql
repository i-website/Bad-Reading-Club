-- Run in an existing database dedicated to the club's member accounts.
CREATE TABLE IF NOT EXISTS auth_attempts (
    ip VARCHAR(45) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempted_at BIGINT NOT NULL,
    INDEX auth_attempts_time (attempted_at),
    INDEX auth_attempts_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    avatar JSON DEFAULT NULL,
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
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

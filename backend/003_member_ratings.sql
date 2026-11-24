CREATE TABLE IF NOT EXISTS member_ratings (
    member_id BIGINT UNSIGNED NOT NULL,
    book_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    score TINYINT UNSIGNED NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (member_id, book_id),
    INDEX member_ratings_book (book_id),
    CONSTRAINT member_ratings_member_fk FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
    CONSTRAINT member_ratings_score_check CHECK (score BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

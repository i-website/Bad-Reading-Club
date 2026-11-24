-- Apply once to databases created before reviews were added.
ALTER TABLE member_ratings ADD COLUMN review TEXT NULL AFTER score;

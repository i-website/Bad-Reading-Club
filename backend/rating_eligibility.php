<?php
declare(strict_types=1);

function meetingDateEligible(?string $startsAt, bool $isPast, DateTimeZone $timezone, DateTimeImmutable $now): bool {
    if ($startsAt === null || $startsAt === '') return $isPast;
    try {
        $nextDay = (new DateTimeImmutable($startsAt, $timezone))->setTimezone($timezone)->setTime(0, 0)->modify('+1 day');
        return $now >= $nextDay;
    } catch (Exception $e) {
        return false;
    }
}

/** Check published MySQL meetings; return null if the authoritative source is unavailable. */
function ratingEligible(string $bookId, array $config, ?DateTimeImmutable $now = null, ?PDO $db = null): ?bool {
    if (!$db) return null;
    try {
        $timezone = new DateTimeZone($config['club_timezone'] ?? 'Asia/Irkutsk');
        $current = $now ?? new DateTimeImmutable('now', $timezone);
        $query = $db->prepare('SELECT m.starts_at, m.is_past FROM meetings m JOIN books b ON b.id = m.book_id WHERE m.book_id = ? AND m.published = 1 AND b.published = 1');
        $query->execute([$bookId]);
        while ($meeting = $query->fetch(PDO::FETCH_ASSOC)) {
            if (meetingDateEligible($meeting['starts_at'], (bool) $meeting['is_past'], $timezone, $current)) return true;
        }
        return false;
    } catch (Throwable $e) {
        error_log((string) $e);
        return null;
    }
}

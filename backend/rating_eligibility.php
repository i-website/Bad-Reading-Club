<?php
declare(strict_types=1);

/** Returns null when the authoritative schedule is unavailable. */
function ratingEligible(string $bookId, array $config, ?DateTimeImmutable $now = null): ?bool {
    $source = $config['ratings_schedule_source'] ?? null;
    if ($source === 'demo') {
        // These are the fixed past meetings from src/lib/mockData.ts.
        if (preg_match('/^club-past-([1-9]|1[0-9]|2[0-7])$/D', $bookId)) return true;
        $dates = [
            'winter-white-fang' => '2026-12-13',
            'demo-book-1' => '2027-01-10',
            'winter-smoke' => '2027-01-31',
            'winter-one-hundred-years' => '2027-02-21',
        ];
        if (!isset($dates[$bookId])) return false;
        $timezone = new DateTimeZone($config['club_timezone'] ?? 'Asia/Irkutsk');
        $endOfDay = (new DateTimeImmutable($dates[$bookId], $timezone))->modify('+1 day');
        return ($now ?? new DateTimeImmutable('now', $timezone)) >= $endOfDay;
    }
    if ($source !== 'supabase') return null;
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iD', $bookId)) return false;
    $base = rtrim((string) ($config['supabase_url'] ?? ''), '/');
    $key = (string) ($config['supabase_publishable_key'] ?? '');
    if (!filter_var($base, FILTER_VALIDATE_URL) || parse_url($base, PHP_URL_SCHEME) !== 'https' || $key === '') return null;
    $query = http_build_query([
        'select' => 'starts_at,books!inner(published)',
        'book_id' => 'eq.' . $bookId,
        'published' => 'eq.true',
        'books.published' => 'eq.true',
    ], '', '&', PHP_QUERY_RFC3986);
    $context = stream_context_create(['http' => [
        'method' => 'GET',
        'header' => "apikey: $key\r\nAuthorization: Bearer $key\r\nAccept: application/json\r\n",
        'timeout' => 5,
        'ignore_errors' => true,
    ]]);
    $response = @file_get_contents($base . '/rest/v1/meetings?' . $query, false, $context);
    if ($response === false || !isset($http_response_header[0]) || !preg_match('/\s200\s/', $http_response_header[0])) return null;
    $meetings = json_decode($response, true);
    if (!is_array($meetings) || !array_is_list($meetings)) return null;
    $timezone = new DateTimeZone($config['club_timezone'] ?? 'Asia/Irkutsk');
    $current = $now ?? new DateTimeImmutable('now', $timezone);
    foreach ($meetings as $meeting) {
        $startsAt = $meeting['starts_at'] ?? null;
        if (!is_string($startsAt)) continue;
        try {
            $nextDay = (new DateTimeImmutable($startsAt))->setTimezone($timezone)->setTime(0, 0)->modify('+1 day');
            if ($current >= $nextDay) return true;
        } catch (Exception $error) {
            continue;
        }
    }
    return false;
}

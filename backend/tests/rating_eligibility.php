<?php
declare(strict_types=1);
require dirname(__DIR__) . '/rating_eligibility.php';

$config = ['ratings_schedule_source' => 'demo', 'club_timezone' => 'Asia/Irkutsk'];
$before = new DateTimeImmutable('2026-12-13 23:59:59', new DateTimeZone('Asia/Irkutsk'));
$after = new DateTimeImmutable('2026-12-14 00:00:00', new DateTimeZone('Asia/Irkutsk'));
$checks = [
    ratingEligible('club-past-1', $config, $before) === true,
    ratingEligible('club-past-27', $config, $before) === true,
    ratingEligible('club-past-28', $config, $before) === false,
    ratingEligible('winter-white-fang', $config, $before) === false,
    ratingEligible('winter-white-fang', $config, $after) === true,
    ratingEligible('unknown-book', $config, $after) === false,
    ratingEligible('unknown-book', [], $after) === null,
];
if (in_array(false, $checks, true)) {
    fwrite(STDERR, "Rating eligibility check failed.\n");
    exit(1);
}
echo "Rating eligibility checks passed.\n";

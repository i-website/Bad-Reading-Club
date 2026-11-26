<?php
declare(strict_types=1);

/** Atomically limit authentication attempts for one client address. */
function allowAuthAttempt(PDO $db, string $ip, int $now): bool {
    $db->beginTransaction();
    try {
        $query = $db->prepare('INSERT INTO auth_rate_limits (ip, window_started_at, attempts) VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE attempts = IF(window_started_at <= ?, 1, LEAST(attempts + 1, 21)),
            window_started_at = IF(window_started_at <= ?, ?, window_started_at)');
        $query->execute([$ip, $now, $now - 900, $now - 900, $now]);
        $query = $db->prepare('SELECT attempts FROM auth_rate_limits WHERE ip = ?');
        $query->execute([$ip]);
        $allowed = (int) $query->fetchColumn() <= 20;
        $db->commit();
        return $allowed;
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$email = strtolower(trim((string) getenv('BRC_ADMIN_EMAIL')));
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254) {
    fwrite(STDERR, "Set BRC_ADMIN_EMAIL to the email of an existing member.\n");
    exit(1);
}
try {
    $c = require __DIR__ . '/config.php';
    $db = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'], $c['database']), $c['username'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
    $query = $db->prepare('UPDATE members SET is_admin = 1 WHERE email = ?');
    $query->execute([$email]);
    $check = $db->prepare('SELECT is_admin FROM members WHERE email = ?');
    $check->execute([$email]);
    if ((int) $check->fetchColumn() !== 1) {
        fwrite(STDERR, "Member not found. Sign in and complete registration first.\n");
        exit(1);
    }
    echo "Administrator role assigned.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Could not assign administrator role. Check the database and migration.\n");
    exit(1);
}

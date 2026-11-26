<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$email = strtolower(trim((string) getenv('BRC_ADMIN_EMAIL')));
$password = (string) getenv('BRC_ADMIN_PASSWORD');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 || strlen($password) < 12 || strlen($password) > 72 || str_contains($password, "\0")) {
    fwrite(STDERR, "Set BRC_ADMIN_EMAIL and BRC_ADMIN_PASSWORD (12–72 bytes) in the environment.\n");
    exit(1);
}
try {
    $c = require __DIR__ . '/config.php';
    $db = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'], $c['database']), $c['username'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
    $query = $db->prepare('INSERT INTO admin_users (email, password_hash) VALUES (?, ?)');
    $query->execute([$email, password_hash($password, PASSWORD_DEFAULT)]);
    echo "Administrator created.\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Could not create administrator. Check the database and whether this email already exists.\n");
    exit(1);
}

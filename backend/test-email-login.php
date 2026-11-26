<?php

require_once __DIR__ . '/email_login.php';

$config = require __DIR__ . '/config.php';

$pdo = new PDO(
    'mysql:host=' . $config['host']
    . ';port=' . $config['port']
    . ';dbname=' . $config['database']
    . ';charset=utf8mb4',
    $config['username'],
    $config['password'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

$email = 'test-' . bin2hex(random_bytes(8)) . '@example.invalid';
$secret = $config['email_login_secret'];
$code = generateEmailLoginCode();

try {
    $pdo->beginTransaction();

    saveEmailLoginCode($pdo, $email, $code, $secret);
    echo "SAVE: OK\n";

    $valid = verifyEmailLoginCode($pdo, $email, $code, $secret);
    echo 'VERIFY: ' . ($valid ? 'OK' : 'FAIL') . PHP_EOL;

    $reused = verifyEmailLoginCode($pdo, $email, $code, $secret);
    echo 'REUSE: ' . (!$reused ? 'BLOCKED' : 'FAIL') . PHP_EOL;

    $email2 = 'test-' . bin2hex(random_bytes(8)) . '@example.invalid';

    saveEmailLoginCode($pdo, $email2, '123456', $secret);

    for ($i = 0; $i < 5; $i++) {
        verifyEmailLoginCode($pdo, $email2, '000000', $secret);
    }

    $blocked = !verifyEmailLoginCode(
        $pdo,
        $email2,
        '123456',
        $secret
    );

    echo 'BRUTE FORCE: '
        . ($blocked ? 'BLOCKED' : 'FAIL')
        . PHP_EOL;

    $email3 = 'test-' . bin2hex(random_bytes(8)) . '@example.invalid';

    saveEmailLoginCode($pdo, $email3, '123456', $secret);

    $stmt = $pdo->prepare(
        'UPDATE email_login_codes
         SET expires_at = ?
         WHERE email = ?'
    );

    $stmt->execute([time() - 1, $email3]);

    $expired = !verifyEmailLoginCode(
        $pdo,
        $email3,
        '123456',
        $secret
    );

    echo 'EXPIRED CODE: '
        . ($expired ? 'BLOCKED' : 'FAIL')
        . PHP_EOL;

    $email4 = 'test-' . bin2hex(random_bytes(8)) . '@example.invalid';

    saveEmailLoginCode($pdo, $email4, '123456', $secret);

    $blocked = false;

    try {
        saveEmailLoginCode($pdo, $email4, '654321', $secret);
    } catch (RuntimeException $e) {
        $blocked = true;
    }

    echo 'RESEND LIMIT: '
        . ($blocked ? 'BLOCKED' : 'FAIL')
        . PHP_EOL;

    cancelEmailLoginCode($pdo, $email4, '123456', $secret);
    saveEmailLoginCode($pdo, $email4, '654321', $secret);
    echo 'RETRY AFTER DELIVERY FAILURE: '
        . (verifyEmailLoginCode($pdo, $email4, '654321', $secret) ? 'OK' : 'FAIL')
        . PHP_EOL;

} finally {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
}

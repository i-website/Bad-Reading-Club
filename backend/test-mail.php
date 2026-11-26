<?php

require_once __DIR__ . '/email_login.php';

try {
    $code = generateEmailLoginCode();

    sendEmailLoginCode('skynekop@gmail.com', $code);

    echo 'SUCCESS: Code sent!' . PHP_EOL;
    echo 'Test code: ' . $code . PHP_EOL;

} catch (Throwable $e) {
    echo 'ERROR: ' . $e->getMessage() . PHP_EOL;
}
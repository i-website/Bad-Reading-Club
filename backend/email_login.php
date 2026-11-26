<?php

declare(strict_types=1);

require_once __DIR__ . '/mailer.php';

const EMAIL_LOGIN_CODE_TTL = 600;
const EMAIL_LOGIN_RESEND_DELAY = 60;
const EMAIL_LOGIN_MAX_ATTEMPTS = 5;
const EMAIL_LOGIN_MAX_SENDS = 5;
const EMAIL_LOGIN_SEND_WINDOW = 3600;

class EmailLoginRateLimit extends RuntimeException {}

function generateEmailLoginCode(): string {
    return str_pad(
        (string) random_int(0, 999999),
        6,
        '0',
        STR_PAD_LEFT
    );
}

function hashEmailLoginCode(
    string $email,
    string $code,
    string $secret
): string {
    return hash_hmac(
        'sha256',
        strtolower(trim($email)) . ':' . $code,
        $secret
    );
}

function sendEmailLoginCode(
    string $email,
    string $code
): void {
    $body = '<h2>BAD READING CLUB</h2>
        <p>Ваш код для входа:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;">'
        . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') .
        '</p>
        <p>Код действителен 10 минут.</p>
        <p>Никому не сообщайте этот код.</p>
        <p>Если вы не запрашивали код, проигнорируйте письмо.</p>';

    sendEmail(
        $email,
        'Bad Reading Club — код входа',
        $body
    );
}

function saveEmailLoginCode(
    PDO $pdo,
    string $email,
    string $code,
    string $secret
): void {
    $email = strtolower(trim($email));
    $now = time();
    $hash = hashEmailLoginCode($email, $code, $secret);

    $stmt = $pdo->prepare(
        'INSERT IGNORE INTO email_login_codes
        (email, expires_at, sent_at, window_started_at)
        VALUES (?, 0, 0, ?)'
    );

    $stmt->execute([$email, $now]);

    $stmt = $pdo->prepare(
        'UPDATE email_login_codes
         SET code_hash = ?,
             expires_at = ?,
             sent_at = ?,
             attempts = 0,
             sends_in_window = CASE
                 WHEN window_started_at <= ? THEN 1
                 ELSE sends_in_window + 1
             END,
             window_started_at = CASE
                 WHEN window_started_at <= ? THEN ?
                 ELSE window_started_at
             END
         WHERE email = ?
           AND sent_at <= ?
           AND (
               window_started_at <= ?
               OR sends_in_window < ?
           )'
    );

    $stmt->execute([
        $hash,
        $now + EMAIL_LOGIN_CODE_TTL,
        $now,
        $now - EMAIL_LOGIN_SEND_WINDOW,
        $now - EMAIL_LOGIN_SEND_WINDOW,
        $now,
        $email,
        $now - EMAIL_LOGIN_RESEND_DELAY,
        $now - EMAIL_LOGIN_SEND_WINDOW,
        EMAIL_LOGIN_MAX_SENDS
    ]);

    if ($stmt->rowCount() !== 1) {
        throw new EmailLoginRateLimit(
            'Слишком частые запросы кода. Попробуйте позже.'
        );
    }
}

/** Release the reservation only if it still belongs to the failed delivery. */
function cancelEmailLoginCode(PDO $pdo, string $email, string $code, string $secret): void {
    $stmt = $pdo->prepare(
        'UPDATE email_login_codes
         SET code_hash = NULL, expires_at = 0, sent_at = 0,
             sends_in_window = IF(sends_in_window > 0, sends_in_window - 1, 0)
         WHERE email = ? AND code_hash = ?'
    );
    $email = strtolower(trim($email));
    $stmt->execute([$email, hashEmailLoginCode($email, $code, $secret)]);
}

function verifyEmailLoginCode(
    PDO $pdo,
    string $email,
    string $code,
    string $secret
): bool {
    $email = strtolower(trim($email));

    if (!preg_match('/^[0-9]{6}$/D', $code)) {
        return false;
    }

    $hash = hashEmailLoginCode($email, $code, $secret);
    $own = !$pdo->inTransaction();

    if ($own) {
        $pdo->beginTransaction();
    }

    try {
        $stmt = $pdo->prepare(
            'SELECT code_hash, expires_at, attempts
             FROM email_login_codes
             WHERE email = ?
             FOR UPDATE'
        );

        $stmt->execute([$email]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        $valid = false;

        if (
            $row
            && $row['code_hash'] !== null
            && (int) $row['expires_at'] > time()
            && (int) $row['attempts'] < EMAIL_LOGIN_MAX_ATTEMPTS
        ) {
            $valid = hash_equals($row['code_hash'], $hash);

            $stmt = $pdo->prepare(
                $valid
                    ? 'UPDATE email_login_codes
                       SET code_hash = NULL, expires_at = 0
                       WHERE email = ?'
                    : 'UPDATE email_login_codes
                       SET attempts = attempts + 1
                       WHERE email = ?'
            );

            $stmt->execute([$email]);
        }

        if ($own) {
            $pdo->commit();
        }

        return $valid;

    } catch (Throwable $e) {
        if ($own && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $e;
    }
}

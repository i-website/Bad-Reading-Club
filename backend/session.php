<?php
declare(strict_types=1);

const MEMBER_SESSION_TTL = 90 * 24 * 60 * 60;

function startClubSession(): void {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string) MEMBER_SESSION_TTL);
    session_set_cookie_params([
        'lifetime' => MEMBER_SESSION_TTL,
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
    if (isset($_SESSION['member_id']) && (int) ($_SESSION['member_expires_at'] ?? 0) <= time()) {
        unset($_SESSION['member_id'], $_SESSION['member_expires_at']);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}

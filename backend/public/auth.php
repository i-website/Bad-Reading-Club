<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/rating_eligibility.php';

// Run with: php -S 127.0.0.1:8000 -t backend/public
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Lax', 'path' => '/']);
session_start();
function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function memberData(array $member): array {
    $member['avatar'] = isset($member['avatar']) ? json_decode($member['avatar'], true) : null;
    return $member;
}
function adminAuthorized(array $config): ?bool {
    $base = rtrim((string) ($config['supabase_url'] ?? ''), '/');
    $key = (string) ($config['supabase_publishable_key'] ?? '');
    if (!filter_var($base, FILTER_VALIDATE_URL) || parse_url($base, PHP_URL_SCHEME) !== 'https' || $key === '' || preg_match('/[\r\n]/', $key)) return null;
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!is_string($header) || !preg_match('/^Bearer ([A-Za-z0-9._-]{1,8192})$/D', $header, $match)) return false;
    $context = stream_context_create(['http' => [
        'method' => 'GET',
        'header' => "apikey: $key\r\nAuthorization: Bearer {$match[1]}\r\nAccept: application/json\r\n",
        'timeout' => 5,
        'ignore_errors' => true,
        'follow_location' => 0,
    ]]);
    $response = @file_get_contents($base . '/rest/v1/admin_users?select=user_id&limit=1', false, $context);
    if ($response === false || !isset($http_response_header[0])) return null;
    if (preg_match('/\s(?:401|403)\s/', $http_response_header[0])) return false;
    if (!preg_match('/\s200\s/', $http_response_header[0])) return null;
    $rows = json_decode($response, true);
    return is_array($rows) && array_is_list($rows) ? count($rows) === 1 : null;
}
try {
    $config = require dirname(__DIR__) . '/config.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
    $db = new PDO($dsn, $config['username'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $action = $_GET['action'] ?? 'session';
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'members') {
        $authorized = adminAuthorized($config);
        if ($authorized === null) respond(503, ['error' => 'Не удалось проверить права администратора.']);
        if (!$authorized) respond(403, ['error' => 'Нет доступа к списку участников.']);
        $members = array_map('memberData', $db->query('SELECT id, name, avatar FROM members ORDER BY name, id')->fetchAll(PDO::FETCH_ASSOC));
        respond(200, ['members' => $members]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'session') {
        $user = null;
        if (isset($_SESSION['member_id'])) {
            $query = $db->prepare('SELECT id, name, avatar FROM members WHERE id = ?');
            $query->execute([$_SESSION['member_id']]);
            $row = $query->fetch(PDO::FETCH_ASSOC);
            $user = $row ? memberData($row) : null;
        }
        respond(200, ['user' => $user, 'csrf' => $_SESSION['csrf']]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'ratings') {
        $aggregate = $db->query('SELECT book_id, COUNT(*) AS votes, SUM(score) AS total FROM member_ratings GROUP BY book_id')->fetchAll(PDO::FETCH_ASSOC);
        $mine = [];
        if (isset($_SESSION['member_id'])) {
            $query = $db->prepare('SELECT book_id, score, review FROM member_ratings WHERE member_id = ? ORDER BY updated_at DESC');
            $query->execute([$_SESSION['member_id']]);
            $mine = $query->fetchAll(PDO::FETCH_ASSOC);
        }
        respond(200, ['ratings' => $aggregate, 'mine' => $mine, 'signedIn' => isset($_SESSION['member_id']), 'csrf' => $_SESSION['csrf']]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'reviews') {
        $bookId = is_string($_GET['bookId'] ?? null) ? $_GET['bookId'] : '';
        if (!preg_match('/^[a-zA-Z0-9_-]{1,128}$/D', $bookId)) respond(400, ['error' => 'Книга не найдена.']);
        $query = $db->prepare("SELECT r.score, r.review, r.updated_at, m.name, m.avatar, (r.member_id = ?) AS is_mine FROM member_ratings r JOIN members m ON m.id = r.member_id WHERE r.book_id = ? AND r.review IS NOT NULL AND r.review <> '' ORDER BY r.updated_at DESC, r.member_id DESC");
        $query->execute([$_SESSION['member_id'] ?? 0, $bookId]);
        $reviews = array_map(static function (array $row): array {
            $row['avatar'] = isset($row['avatar']) ? json_decode($row['avatar'], true) : null;
            $row['is_mine'] = (bool) $row['is_mine'];
            return $row;
        }, $query->fetchAll(PDO::FETCH_ASSOC));
        respond(200, ['reviews' => $reviews]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'rating-eligibility') {
        $bookId = is_string($_GET['bookId'] ?? null) ? $_GET['bookId'] : '';
        if (!preg_match('/^[a-zA-Z0-9_-]{1,128}$/D', $bookId)) respond(400, ['error' => 'Книга не найдена.']);
        $eligible = ratingEligible($bookId, $config);
        if ($eligible === null) respond(503, ['error' => 'Не удалось проверить дату встречи. Попробуйте позже.']);
        respond(200, ['eligible' => $eligible]);
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(405, ['error' => 'Метод не поддерживается.']);
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) respond(403, ['error' => 'Сессия устарела. Обновите страницу.']);
    if ($action === 'logout') {
        $_SESSION = [];
        session_regenerate_id(true);
        respond(200, ['ok' => true]);
    }
    if ($action === 'rate') {
        if (!isset($_SESSION['member_id'])) respond(401, ['error' => 'Войдите в аккаунт, чтобы оценить книгу.']);
        $input = json_decode(file_get_contents('php://input'), true);
        $bookId = is_array($input) && is_string($input['bookId'] ?? null) ? $input['bookId'] : '';
        $score = is_array($input) ? ($input['score'] ?? null) : null;
        if (!preg_match('/^[a-zA-Z0-9_-]{1,128}$/D', $bookId) || !is_int($score) || $score < 1 || $score > 10) respond(400, ['error' => 'Выберите оценку от 1 до 10.']);
        $hasReview = array_key_exists('review', $input);
        if ($hasReview && (!is_string($input['review']) || strlen($input['review']) > 8000)) respond(400, ['error' => 'Отзыв слишком длинный.']);
        $review = $hasReview ? trim($input['review']) : null;
        $eligible = ratingEligible($bookId, $config);
        if ($eligible === null) respond(503, ['error' => 'Не удалось проверить дату встречи. Попробуйте позже.']);
        if (!$eligible) respond(403, ['error' => 'Оценить книгу можно на следующий день после встречи.']);
        if ($hasReview) {
            $query = $db->prepare('INSERT INTO member_ratings (member_id, book_id, score, review) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score), review = VALUES(review)');
            $query->execute([$_SESSION['member_id'], $bookId, $score, $review === '' ? null : $review]);
        } else {
            $query = $db->prepare('INSERT INTO member_ratings (member_id, book_id, score) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE score = VALUES(score)');
            $query->execute([$_SESSION['member_id'], $bookId, $score]);
        }
        respond(200, ['ok' => true]);
    }
    if ($action === 'profile') {
        if (!isset($_SESSION['member_id'])) respond(401, ['error' => 'Войдите в аккаунт.']);
        $input = json_decode(file_get_contents('php://input'), true);
        $name = trim(is_array($input) && is_string($input['name'] ?? null) ? $input['name'] : '');
        if ($name === '' || strlen($name) > 160) respond(400, ['error' => 'Укажите имя длиной не более 160 байт.']);
        $avatar = $input['avatar'] ?? null;
        if (!is_array($avatar) || !in_array($avatar['style'] ?? null, ['girl', 'man'], true)) respond(400, ['error' => 'Проверьте настройки аватарки.']);
        // Older clients and drafts do not yet contain individual accessory colors.
        $avatar += [
            'browColor' => $avatar['hair'] ?? '#5c2d0f',
            'glassesColor' => '#181615',
            'extraColor' => $avatar['hair'] ?? '#5c2d0f',
            'mouthColor' => '#bb1639',
        ];
        $limits = ['face' => 3, 'eyes' => $avatar['style'] === 'girl' ? 4 : 5, 'nose' => $avatar['style'] === 'girl' ? 4 : 5, 'mouth' => $avatar['style'] === 'girl' ? 5 : 4, 'brows' => 4, 'backHair' => 9, 'frontHair' => 9, 'clothes' => $avatar['style'] === 'girl' ? 6 : 3, 'glasses' => 4, 'extra' => $avatar['style'] === 'girl' ? 4 : 5];
        foreach ($limits as $part => $max) {
            $value = $avatar[$part] ?? null;
            if (!is_int($value) || $value < (in_array($part, ['glasses', 'extra'], true) ? 0 : 1) || $value > $max) respond(400, ['error' => 'Проверьте настройки аватарки.']);
        }
        foreach (['skin', 'hair', 'outfit', 'browColor', 'glassesColor', 'extraColor', 'mouthColor'] as $color) {
            if (!is_string($avatar[$color] ?? null) || !preg_match('/^#[0-9a-fA-F]{6}$/D', $avatar[$color])) respond(400, ['error' => 'Проверьте цвета аватарки.']);
        }
        $query = $db->prepare('UPDATE members SET name = ?, avatar = ? WHERE id = ?');
        $query->execute([$name, json_encode($avatar), $_SESSION['member_id']]);
        $query = $db->prepare('SELECT id, name, avatar FROM members WHERE id = ?');
        $query->execute([$_SESSION['member_id']]);
        $member = $query->fetch(PDO::FETCH_ASSOC);
        if (!$member) respond(401, ['error' => 'Аккаунт не найден.']);
        respond(200, ['user' => memberData($member), 'csrf' => $_SESSION['csrf']]);
    }
    if (!in_array($action, ['login', 'register'], true)) respond(404, ['error' => 'Действие не найдено.']);
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $now = time();
    $db->beginTransaction();
    $db->prepare('DELETE FROM auth_attempts WHERE attempted_at < ?')->execute([$now - 900]);
    $query = $db->prepare('SELECT COUNT(*) FROM auth_attempts WHERE ip = ?');
    $query->execute([$ip]);
    if ((int) $query->fetchColumn() >= 20) { $db->commit(); respond(429, ['error' => 'Слишком много попыток. Попробуйте через 15 минут.']); }
    $db->prepare('INSERT INTO auth_attempts (ip, attempted_at) VALUES (?, ?)')->execute([$ip, $now]);
    $db->commit();
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) respond(400, ['error' => 'Некорректный запрос.']);
    $email = strtolower(trim(is_string($input['email'] ?? null) ? $input['email'] : ''));
    $password = is_string($input['password'] ?? null) ? $input['password'] : '';
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) > 72) respond(400, ['error' => 'Проверьте email и пароль.']);
    if ($action === 'register') {
        $name = trim(is_string($input['name'] ?? null) ? $input['name'] : '');
        if ($name === '' || strlen($name) > 160 || strlen($password) < 8) respond(400, ['error' => 'Проверьте имя и пароль (не менее 8 байт).']);
        $db->beginTransaction();
        $query = $db->prepare('SELECT id FROM members WHERE email = ?');
        $query->execute([$email]);
        if ($query->fetchColumn()) { $db->rollBack(); respond(409, ['error' => 'Этот email уже зарегистрирован.']); }
        try {
            $query = $db->prepare('INSERT INTO members (name, email, password_hash) VALUES (?, ?, ?)');
            $query->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException $e) {
            if ($e->getCode() !== '23000') throw $e;
            $db->rollBack(); respond(409, ['error' => 'Этот email уже зарегистрирован.']);
        }
        $member = ['id' => $db->lastInsertId(), 'name' => $name, 'avatar' => null];
        $db->commit();
    } else {
        $query = $db->prepare('SELECT id, name, avatar, password_hash FROM members WHERE email = ?');
        $query->execute([$email]);
        $member = $query->fetch(PDO::FETCH_ASSOC);
        if (!$member || !password_verify($password, $member['password_hash'] ?? '')) respond(401, ['error' => 'Неверный email или пароль.']);
        unset($member['password_hash']);
    }
    session_regenerate_id(true);
    $_SESSION['member_id'] = (int) $member['id'];
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    respond(200, ['user' => memberData($member), 'csrf' => $_SESSION['csrf']]);
} catch (Throwable $e) {
    error_log((string) $e);
    respond(500, ['error' => 'Ошибка сервера. Попробуйте позже.']);
}

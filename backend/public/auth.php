<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/rating_eligibility.php';
require_once dirname(__DIR__) . '/auth_rate_limit.php';
require_once dirname(__DIR__) . '/admin_access.php';
require_once dirname(__DIR__) . '/session.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

startClubSession();

function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
    );
    exit;
}

function memberData(array $member): array {
    $member['avatar'] = isset($member['avatar'])
        ? json_decode($member['avatar'], true)
        : null;

    return $member;
}

try {
    $config = require dirname(__DIR__) . '/config.php';

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['host'],
        $config['port'],
        $config['database']
    );

    $db = new PDO(
        $dsn,
        $config['username'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );

    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));

    $action = $_GET['action'] ?? 'session';

    if (
        $_SERVER['REQUEST_METHOD'] === 'GET'
        && $action === 'members'
    ) {
        if (!memberIsAdmin($db)) {
            respond(403, [
                'error' => 'Нет доступа к списку участников.'
            ]);
        }

        $members = array_map(
            'memberData',
            $db->query(
                'SELECT id, name, avatar
                 FROM members
                 ORDER BY name, id'
            )->fetchAll(PDO::FETCH_ASSOC)
        );

        respond(200, ['members' => $members]);
    }

    if (
        $_SERVER['REQUEST_METHOD'] === 'GET'
        && $action === 'session'
    ) {
        $user = null;

        if (isset($_SESSION['member_id'])) {
            $query = $db->prepare(
                'SELECT id, name, avatar
                 FROM members
                 WHERE id = ?'
            );

            $query->execute([$_SESSION['member_id']]);

            $row = $query->fetch(PDO::FETCH_ASSOC);
            $user = $row ? memberData($row) : null;
        }

        respond(200, [
            'user' => $user,
            'csrf' => $_SESSION['csrf']
        ]);
    }

    if (
        $_SERVER['REQUEST_METHOD'] === 'GET'
        && $action === 'ratings'
    ) {
        $aggregate = $db->query(
            'SELECT r.book_id,
                    COUNT(*) AS votes,
                    SUM(r.score) AS total
             FROM member_ratings r
             JOIN books b ON b.id = r.book_id
             WHERE b.published = 1
             GROUP BY r.book_id'
        )->fetchAll(PDO::FETCH_ASSOC);

        $mine = [];

        if (isset($_SESSION['member_id'])) {
            $query = $db->prepare(
                'SELECT r.book_id, r.score, r.review
                 FROM member_ratings r
                 JOIN books b ON b.id = r.book_id
                 WHERE r.member_id = ?
                   AND b.published = 1
                 ORDER BY r.updated_at DESC'
            );

            $query->execute([$_SESSION['member_id']]);
            $mine = $query->fetchAll(PDO::FETCH_ASSOC);
        }

        respond(200, [
            'ratings' => $aggregate,
            'mine' => $mine,
            'signedIn' => isset($_SESSION['member_id']),
            'csrf' => $_SESSION['csrf']
        ]);
    }

    if (
        $_SERVER['REQUEST_METHOD'] === 'GET'
        && $action === 'reviews'
    ) {
        $bookId = is_string($_GET['bookId'] ?? null)
            ? $_GET['bookId']
            : '';

        if (!preg_match('/^[a-zA-Z0-9_-]{1,128}$/D', $bookId)) {
            respond(400, ['error' => 'Книга не найдена.']);
        }

        $query = $db->prepare(
            "SELECT r.score, r.review, r.updated_at,
                    m.name, m.avatar,
                    (r.member_id = ?) AS is_mine
             FROM member_ratings r
             JOIN members m ON m.id = r.member_id
             JOIN books b ON b.id = r.book_id
             WHERE b.published = 1
               AND r.book_id = ?
               AND r.review IS NOT NULL
               AND r.review <> ''
             ORDER BY r.updated_at DESC, r.member_id DESC"
        );

        $query->execute([
            $_SESSION['member_id'] ?? 0,
            $bookId
        ]);

        $reviews = array_map(
            static function (array $row): array {
                $row['avatar'] = isset($row['avatar'])
                    ? json_decode($row['avatar'], true)
                    : null;

                $row['is_mine'] = (bool) $row['is_mine'];

                return $row;
            },
            $query->fetchAll(PDO::FETCH_ASSOC)
        );

        respond(200, ['reviews' => $reviews]);
    }

    if (
        $_SERVER['REQUEST_METHOD'] === 'GET'
        && $action === 'rating-eligibility'
    ) {
        $bookId = is_string($_GET['bookId'] ?? null)
            ? $_GET['bookId']
            : '';

        if (!preg_match('/^[a-zA-Z0-9_-]{1,128}$/D', $bookId)) {
            respond(400, ['error' => 'Книга не найдена.']);
        }

        $eligible = ratingEligible(
            $bookId,
            $config,
            null,
            $db
        );

        if ($eligible === null) {
            respond(503, [
                'error' => 'Не удалось проверить дату встречи. Попробуйте позже.'
            ]);
        }

        respond(200, ['eligible' => $eligible]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, ['error' => 'Метод не поддерживается.']);
    }

    if (!hash_equals(
        $_SESSION['csrf'],
        $_SERVER['HTTP_X_CSRF_TOKEN'] ?? ''
    )) {
        respond(403, [
            'error' => 'Сессия устарела. Обновите страницу.'
        ]);
    }

    if ($action === 'logout') {
        unset(
            $_SESSION['member_id'],
            $_SESSION['member_expires_at'],
            $_SESSION['email_login_pending']
        );

        session_regenerate_id(true);

        respond(200, ['ok' => true]);
    }

    if ($action === 'rate') {
        if (!isset($_SESSION['member_id'])) {
            respond(401, [
                'error' => 'Войдите в аккаунт, чтобы оценить книгу.'
            ]);
        }

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        if (!is_array($input)) {
            respond(400, ['error' => 'Некорректный запрос.']);
        }

        $bookId = is_string($input['bookId'] ?? null)
            ? $input['bookId']
            : '';

        $score = $input['score'] ?? null;

        if (
            !preg_match('/^[a-zA-Z0-9_-]{1,128}$/D', $bookId)
            || !is_int($score)
            || $score < 1
            || $score > 10
        ) {
            respond(400, [
                'error' => 'Выберите оценку от 1 до 10.'
            ]);
        }

        $hasReview = array_key_exists('review', $input);

        if (
            $hasReview
            && (
                !is_string($input['review'])
                || strlen($input['review']) > 8000
            )
        ) {
            respond(400, [
                'error' => 'Отзыв слишком длинный.'
            ]);
        }

        $review = $hasReview
            ? trim($input['review'])
            : null;

        $eligible = ratingEligible(
            $bookId,
            $config,
            null,
            $db
        );

        if ($eligible === null) {
            respond(503, [
                'error' => 'Не удалось проверить дату встречи. Попробуйте позже.'
            ]);
        }

        if (!$eligible) {
            respond(403, [
                'error' => 'Оценить книгу можно на следующий день после встречи.'
            ]);
        }

        if ($hasReview) {
            $query = $db->prepare(
                'INSERT INTO member_ratings
                    (member_id, book_id, score, review)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    score = VALUES(score),
                    review = VALUES(review)'
            );

            $query->execute([
                $_SESSION['member_id'],
                $bookId,
                $score,
                $review === '' ? null : $review
            ]);
        } else {
            $query = $db->prepare(
                'INSERT INTO member_ratings
                    (member_id, book_id, score)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    score = VALUES(score)'
            );

            $query->execute([
                $_SESSION['member_id'],
                $bookId,
                $score
            ]);
        }

        respond(200, ['ok' => true]);
    }

    if ($action === 'profile') {
        if (!isset($_SESSION['member_id'])) {
            respond(401, ['error' => 'Войдите в аккаунт.']);
        }

        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        $name = trim(
            is_array($input)
            && is_string($input['name'] ?? null)
                ? $input['name']
                : ''
        );

        if ($name === '' || strlen($name) > 160) {
            respond(400, [
                'error' => 'Укажите имя длиной не более 160 байт.'
            ]);
        }

        $avatar = $input['avatar'] ?? null;

        if (
            !is_array($avatar)
            || !in_array(
                $avatar['style'] ?? null,
                ['girl', 'man'],
                true
            )
        ) {
            respond(400, [
                'error' => 'Проверьте настройки аватарки.'
            ]);
        }

        $avatar += [
            'browColor' => $avatar['hair'] ?? '#5c2d0f',
            'glassesColor' => '#181615',
            'extraColor' => $avatar['hair'] ?? '#5c2d0f',
            'mouthColor' => '#bb1639',
        ];

        $limits = [
            'face' => 3,
            'eyes' => $avatar['style'] === 'girl' ? 4 : 5,
            'nose' => $avatar['style'] === 'girl' ? 4 : 5,
            'mouth' => $avatar['style'] === 'girl' ? 5 : 4,
            'brows' => 4,
            'backHair' => 9,
            'frontHair' => 9,
            'clothes' => $avatar['style'] === 'girl' ? 6 : 3,
            'glasses' => 4,
            'extra' => $avatar['style'] === 'girl' ? 4 : 5
        ];

        foreach ($limits as $part => $max) {
            $value = $avatar[$part] ?? null;

            $min = in_array(
                $part,
                ['glasses', 'extra'],
                true
            ) ? 0 : 1;

            if (
                !is_int($value)
                || $value < $min
                || $value > $max
            ) {
                respond(400, [
                    'error' => 'Проверьте настройки аватарки.'
                ]);
            }
        }

        foreach ([
            'skin',
            'hair',
            'outfit',
            'browColor',
            'glassesColor',
            'extraColor',
            'mouthColor'
        ] as $color) {
            if (
                !is_string($avatar[$color] ?? null)
                || !preg_match(
                    '/^#[0-9a-fA-F]{6}$/D',
                    $avatar[$color]
                )
            ) {
                respond(400, [
                    'error' => 'Проверьте цвета аватарки.'
                ]);
            }
        }

        $query = $db->prepare(
            'UPDATE members
             SET name = ?, avatar = ?
             WHERE id = ?'
        );

        $query->execute([
            $name,
            json_encode($avatar),
            $_SESSION['member_id']
        ]);

        $query = $db->prepare(
            'SELECT id, name, avatar
             FROM members
             WHERE id = ?'
        );

        $query->execute([$_SESSION['member_id']]);

        $member = $query->fetch(PDO::FETCH_ASSOC);

        if (!$member) {
            respond(401, [
                'error' => 'Аккаунт не найден.'
            ]);
        }

        respond(200, [
            'user' => memberData($member),
            'csrf' => $_SESSION['csrf']
        ]);
    }

    if (!in_array(
        $action,
        [
            'request-code',
            'verify-code',
            'complete-registration'
        ],
        true
    )) {
        respond(404, [
            'error' => 'Действие не найдено.'
        ]);
    }

    require_once dirname(__DIR__) . '/email_login.php';

    $secret = $config['email_login_secret'] ?? '';

    if (
        !is_string($secret)
        || !preg_match('/^[a-f0-9]{64}$/D', $secret)
    ) {
        throw new RuntimeException(
            'Email login secret not configured'
        );
    }

    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    if (!allowAuthAttempt($db, $ip, time())) {
        respond(429, [
            'error' => 'Слишком много попыток. Попробуйте через 15 минут.'
        ]);
    }

    $input = json_decode(
        file_get_contents('php://input'),
        true
    );

    if (!is_array($input)) {
        respond(400, [
            'error' => 'Некорректный запрос.'
        ]);
    }

    if ($action === 'complete-registration') {
        $pending = $_SESSION['email_login_pending'] ?? null;

        if (
            !is_array($pending)
            || $pending['expires_at'] <= time()
        ) {
            unset($_SESSION['email_login_pending']);

            respond(410, [
                'error' => 'Подтверждение истекло. Запросите новый код.'
            ]);
        }

        $email = $pending['email'];

        $name = trim(
            is_string($input['name'] ?? null)
                ? $input['name']
                : ''
        );

        if ($name === '' || strlen($name) > 160) {
            respond(400, [
                'error' => 'Укажите имя длиной не более 160 байт.'
            ]);
        }

        $avatarStyle = $input['avatarStyle'] ?? null;
        if (!in_array($avatarStyle, ['girl', 'man'], true)) {
            respond(400, ['error' => 'Выберите пол для аватарки.']);
        }
        $avatar = json_encode(['style' => $avatarStyle], JSON_THROW_ON_ERROR);

        try {
            $query = $db->prepare(
                'INSERT INTO members (name, email, avatar)
                 VALUES (?, ?, ?)'
            );

            $query->execute([$name, $email, $avatar]);

        } catch (PDOException $e) {
            if ($e->getCode() !== '23000') {
                throw $e;
            }
        }

    } else {
        $email = strtolower(trim(
            is_string($input['email'] ?? null)
                ? $input['email']
                : ''
        ));

        if (
            strlen($email) > 254
            || !filter_var($email, FILTER_VALIDATE_EMAIL)
        ) {
            respond(400, [
                'error' => 'Проверьте email.'
            ]);
        }

        unset($_SESSION['email_login_pending']);

        if ($action === 'request-code') {
            $code = generateEmailLoginCode();

            try {
                saveEmailLoginCode(
                    $db,
                    $email,
                    $code,
                    $secret
                );

            } catch (EmailLoginRateLimit $e) {
                respond(429, [
                    'error' => $e->getMessage()
                ]);
            }

            try {
                sendEmailLoginCode($email, $code);

            } catch (Throwable $e) {
                cancelEmailLoginCode($db, $email, $code, $secret);

                error_log('Email login delivery failed: ' . $e->getMessage());

                respond(503, [
                    'error' => 'Не удалось отправить код. Попробуйте позже.'
                ]);
            }

            respond(200, ['ok' => true]);
        }

        $code = is_string($input['code'] ?? null)
            ? $input['code']
            : '';

        if (!verifyEmailLoginCode(
            $db,
            $email,
            $code,
            $secret
        )) {
            respond(401, [
                'error' => 'Код неверный, истёк или исчерпан лимит попыток.'
            ]);
        }
    }

    $query = $db->prepare(
        'SELECT id, name, avatar
         FROM members
         WHERE email = ?'
    );

    $query->execute([$email]);

    $member = $query->fetch(PDO::FETCH_ASSOC);

    if (!$member) {
        if ($action === 'complete-registration') {
            respond(409, [
                'error' => 'Не удалось создать аккаунт.'
            ]);
        }

        session_regenerate_id(true);

        $_SESSION['email_login_pending'] = [
            'email' => $email,
            'expires_at' => time() + 600
        ];

        $_SESSION['csrf'] = bin2hex(random_bytes(32));

        respond(200, [
            'user' => null,
            'csrf' => $_SESSION['csrf'],
            'needsName' => true
        ]);
    }

    unset($_SESSION['email_login_pending']);

    session_regenerate_id(true);

    $_SESSION['member_id'] = (int) $member['id'];
    $_SESSION['member_expires_at'] = time() + MEMBER_SESSION_TTL;
    $_SESSION['csrf'] = bin2hex(random_bytes(32));

    respond(200, [
        'user' => memberData($member),
        'csrf' => $_SESSION['csrf']
    ]);

} catch (Throwable $e) {
    error_log((string) $e);

    respond(500, [
        'error' => 'Ошибка сервера. Попробуйте позже.'
    ]);
}

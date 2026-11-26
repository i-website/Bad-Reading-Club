<?php
declare(strict_types=1);
require_once dirname(__DIR__) . '/auth_rate_limit.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_set_cookie_params(['httponly' => true, 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off', 'samesite' => 'Lax', 'path' => '/']);
session_start();

function answer(int $status, array $data): never {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function newId(): string { return bin2hex(random_bytes(16)); }
function textField(array $input, string $key, int $limit, bool $required = false): string {
    $value = $input[$key] ?? '';
    if (!is_string($value)) answer(400, ['error' => 'Проверьте заполненные поля.']);
    $value = trim($value);
    if (($required && $value === '') || strlen($value) > $limit || str_contains($value, "\0")) answer(400, ['error' => 'Проверьте заполненные поля.']);
    return $value;
}
function boolRows(array $rows): array {
    return array_map(static function (array $row): array {
        foreach (['published', 'is_past'] as $field) if (array_key_exists($field, $row)) $row[$field] = (bool) $row[$field];
        return $row;
    }, $rows);
}
function isAdmin(PDO $db): bool {
    if (!isset($_SESSION['admin_id'])) return false;
    $query = $db->prepare('SELECT 1 FROM admin_users WHERE id = ?');
    $query->execute([$_SESSION['admin_id']]);
    if ($query->fetchColumn()) return true;
    unset($_SESSION['admin_id']);
    return false;
}
function coverFile(string $path): ?string {
    if (!preg_match('/^covers\/[a-f0-9]{64}\.(?:jpg|png|webp)$/D', $path)) return null;
    return dirname(__DIR__) . '/storage/' . $path;
}
try {
    $config = require dirname(__DIR__) . '/config.php';
    $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $config['host'], $config['port'], $config['database']);
    $db = new PDO($dsn, $config['username'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
    $_SESSION['csrf'] ??= bin2hex(random_bytes(32));
    $action = $_GET['action'] ?? '';
    $admin = isAdmin($db);
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'session') answer(200, ['authenticated' => $admin, 'csrf' => $_SESSION['csrf']]);
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'public') {
        $books = boolRows($db->query('SELECT id, slug, title, author, description, cover_path, published, initial_rating, initial_votes FROM books WHERE published = 1 ORDER BY created_at, id')->fetchAll(PDO::FETCH_ASSOC));
        $meetings = boolRows($db->query('SELECT m.id, m.book_id, m.starts_at, m.place, m.place_url, m.price, m.notes, m.published, m.is_past FROM meetings m JOIN books b ON b.id = m.book_id WHERE m.published = 1 AND b.published = 1 ORDER BY m.starts_at, m.id')->fetchAll(PDO::FETCH_ASSOC));
        $settings = $db->query('SELECT name, description, links FROM club_settings WHERE id = 1')->fetch(PDO::FETCH_ASSOC);
        if ($settings) $settings['links'] = json_decode($settings['links'], true) ?: [];
        answer(200, ['books' => $books, 'meetings' => $meetings, 'settings' => $settings ?: null]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'admin-data') {
        if (!$admin) answer(403, ['error' => 'Нет доступа.']);
        $books = boolRows($db->query('SELECT id, slug, title, author, description, cover_path, published FROM books ORDER BY created_at, id')->fetchAll(PDO::FETCH_ASSOC));
        $meetings = boolRows($db->query('SELECT id, book_id, starts_at, place, place_url, price, notes, published, is_past FROM meetings ORDER BY starts_at, id')->fetchAll(PDO::FETCH_ASSOC));
        answer(200, ['books' => $books, 'meetings' => $meetings]);
    }
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'cover') {
        $path = is_string($_GET['path'] ?? null) ? $_GET['path'] : '';
        $file = coverFile($path);
        if (!$file) answer(404, ['error' => 'Обложка не найдена.']);
        if (!$admin) {
            $query = $db->prepare('SELECT 1 FROM books WHERE cover_path = ? AND published = 1 LIMIT 1');
            $query->execute([$path]);
            if (!$query->fetchColumn()) answer(404, ['error' => 'Обложка не найдена.']);
        }
        if (!is_file($file)) answer(404, ['error' => 'Обложка не найдена.']);
        $type = match (pathinfo($file, PATHINFO_EXTENSION)) { 'jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp' };
        header('Content-Type: ' . $type);
        header('Cache-Control: private, max-age=3600');
        readfile($file);
        exit;
    }
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') answer(405, ['error' => 'Метод не поддерживается.']);
    if (!hash_equals($_SESSION['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) answer(403, ['error' => 'Сессия устарела. Обновите страницу.']);
    if ($action === 'login') {
        if (!allowAuthAttempt($db, $_SERVER['REMOTE_ADDR'] ?? 'unknown', time())) answer(429, ['error' => 'Слишком много попыток. Попробуйте через 15 минут.']);
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) answer(400, ['error' => 'Некорректный запрос.']);
        $email = strtolower(textField($input, 'email', 254, true));
        $password = $input['password'] ?? null;
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !is_string($password) || strlen($password) > 72 || str_contains($password, "\0")) answer(400, ['error' => 'Проверьте email и пароль.']);
        $query = $db->prepare('SELECT id, password_hash FROM admin_users WHERE email = ?');
        $query->execute([$email]);
        $user = $query->fetch(PDO::FETCH_ASSOC);
        $valid = password_verify($password, $user['password_hash'] ?? '$2y$12$o7Jdf0INpQb0KPemCBj9eOfH5enJAnBRPe4H8wBQsKNHp5LwKkPFq');
        if (!$user || !$valid) answer(401, ['error' => 'Неверный email или пароль.']);
        session_regenerate_id(true);
        $_SESSION['admin_id'] = (int) $user['id'];
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        answer(200, ['ok' => true]);
    }
    if ($action === 'logout') {
        unset($_SESSION['admin_id']);
        session_regenerate_id(true);
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
        answer(200, ['ok' => true]);
    }
    if (!$admin) answer(403, ['error' => 'Нет доступа.']);
    if ($action === 'upload') {
        $upload = $_FILES['cover'] ?? null;
        if (!is_array($upload) || ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || ($upload['size'] ?? 0) < 1 || $upload['size'] > 10485760 || !is_uploaded_file($upload['tmp_name'])) answer(400, ['error' => 'Выберите изображение размером до 10 МБ.']);
        $image = @getimagesize($upload['tmp_name']);
        $extension = match ($image['mime'] ?? '') { 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', default => null };
        if (!$extension || ($image[0] ?? 0) > 12000 || ($image[1] ?? 0) > 12000) answer(400, ['error' => 'Выберите JPEG, PNG или WebP.']);
        $path = 'covers/' . bin2hex(random_bytes(32)) . '.' . $extension;
        $file = coverFile($path);
        $dir = dirname($file);
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) throw new RuntimeException('Cannot create cover directory');
        if (!move_uploaded_file($upload['tmp_name'], $file)) throw new RuntimeException('Cannot save cover');
        answer(200, ['path' => $path]);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) answer(400, ['error' => 'Некорректный запрос.']);
    if ($action === 'remove-cover') {
        $path = textField($input, 'path', 255, true);
        $file = coverFile($path);
        if (!$file) answer(400, ['error' => 'Некорректная обложка.']);
        $query = $db->prepare('SELECT 1 FROM books WHERE cover_path = ? LIMIT 1');
        $query->execute([$path]);
        if (!$query->fetchColumn() && is_file($file) && !unlink($file)) throw new RuntimeException('Cannot remove cover');
        answer(200, ['ok' => true]);
    }
    if ($action === 'save-meeting') {
        $id = $input['id'] ?? null;
        if ($id !== null && (!is_string($id) || !preg_match('/^[a-zA-Z0-9_-]{1,128}$/D', $id))) answer(400, ['error' => 'Некорректная встреча.']);
        $book = $input['book'] ?? null; $meeting = $input['meeting'] ?? null;
        if (!is_array($book) || !is_array($meeting) || !is_bool($book['published'] ?? null) || !is_bool($meeting['published'] ?? null)) answer(400, ['error' => 'Проверьте заполненные поля.']);
        $slug = textField($book, 'slug', 160, true);
        if (!preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug)) answer(400, ['error' => 'Некорректный адрес книги.']);
        $title = textField($book, 'title', 255, true); $author = textField($book, 'author', 255, true);
        $description = textField($book, 'description', 60000);
        $cover = $book['cover_path'] ?? null;
        if ($cover !== null && (!is_string($cover) || (!coverFile($cover) && !preg_match('/^book-covers\/[a-z0-9-]+\.jpg$/D', $cover)))) answer(400, ['error' => 'Некорректная обложка.']);
        if (is_string($cover) && coverFile($cover) && !is_file(coverFile($cover))) answer(400, ['error' => 'Обложка не найдена.']);
        $date = $meeting['starts_at'] ?? null;
        if ($date !== null && (!is_string($date) || !preg_match('/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2}))?$/D', $date) || !strtotime($date))) answer(400, ['error' => 'Проверьте дату встречи.']);
        $place = textField($meeting, 'place', 500); $placeUrl = textField($meeting, 'place_url', 2048); $notes = textField($meeting, 'notes', 60000);
        if ($placeUrl !== '' && (!filter_var($placeUrl, FILTER_VALIDATE_URL) || !in_array(strtolower((string) parse_url($placeUrl, PHP_URL_SCHEME)), ['http', 'https'], true))) answer(400, ['error' => 'Проверьте ссылку на место.']);
        $price = $meeting['price'] ?? null;
        if ($price !== null && (!is_numeric($price) || (float) $price < 0 || (float) $price > 99999999.99)) answer(400, ['error' => 'Проверьте стоимость.']);
        $db->beginTransaction();
        if ($id === null) {
            $bookId = newId(); $id = newId();
            $query = $db->prepare('INSERT INTO books (id, slug, title, author, description, cover_path, published) VALUES (?, ?, ?, ?, ?, ?, ?)');
            $query->execute([$bookId, $slug, $title, $author, $description, $cover, $book['published'] ? 1 : 0]);
            $query = $db->prepare('INSERT INTO meetings (id, book_id, starts_at, place, place_url, price, notes, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $query->execute([$id, $bookId, $date, $place ?: null, $placeUrl ?: null, $price, $notes, $meeting['published'] ? 1 : 0]);
        } else {
            $query = $db->prepare('SELECT book_id FROM meetings WHERE id = ? FOR UPDATE'); $query->execute([$id]); $bookId = $query->fetchColumn();
            if (!$bookId) { $db->rollBack(); answer(404, ['error' => 'Встреча не найдена.']); }
            $query = $db->prepare('UPDATE books SET slug = ?, title = ?, author = ?, description = ?, cover_path = ?, published = GREATEST(published, ?) WHERE id = ?');
            $query->execute([$slug, $title, $author, $description, $cover, $book['published'] ? 1 : 0, $bookId]);
            $query = $db->prepare('UPDATE meetings SET starts_at = ?, place = ?, place_url = ?, price = ?, notes = ?, published = ? WHERE id = ?');
            $query->execute([$date, $place ?: null, $placeUrl ?: null, $price, $notes, $meeting['published'] ? 1 : 0, $id]);
        }
        $db->commit();
        answer(200, ['id' => $id]);
    }
    if ($action === 'delete-meeting') {
        $id = textField($input, 'id', 128, true);
        $db->beginTransaction();
        $query = $db->prepare('SELECT book_id FROM meetings WHERE id = ? FOR UPDATE'); $query->execute([$id]); $bookId = $query->fetchColumn();
        if (!$bookId) { $db->rollBack(); answer(404, ['error' => 'Встреча не найдена.']); }
        $db->prepare('DELETE FROM meetings WHERE id = ?')->execute([$id]);
        $query = $db->prepare('SELECT COUNT(*) FROM meetings WHERE book_id = ?'); $query->execute([$bookId]);
        if ((int) $query->fetchColumn() === 0) {
            $db->prepare('DELETE FROM member_ratings WHERE book_id = ?')->execute([$bookId]);
            $db->prepare('DELETE FROM books WHERE id = ?')->execute([$bookId]);
        }
        $db->commit();
        answer(200, ['ok' => true]);
    }
    answer(404, ['error' => 'Действие не найдено.']);
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    if ($e instanceof PDOException && $e->getCode() === '23000') answer(409, ['error' => 'Книга с таким адресом уже существует.']);
    error_log((string) $e);
    answer(500, ['error' => 'Ошибка сервера. Попробуйте позже.']);
}

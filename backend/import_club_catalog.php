<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
try {
    $items = json_decode(file_get_contents(__DIR__ . '/club_catalog.json'), true, 512, JSON_THROW_ON_ERROR);
    $c = require __DIR__ . '/config.php';
    $db = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'], $c['database']), $c['username'], $c['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]);
    $db->beginTransaction();
    $insertBook = $db->prepare('INSERT IGNORE INTO books (id, slug, title, author, description, cover_path, published) VALUES (?, ?, ?, ?, ?, ?, 1)');
    $readBook = $db->prepare('SELECT title, author FROM books WHERE id = ?');
    $insertMeeting = $db->prepare('INSERT IGNORE INTO meetings (id, book_id, starts_at, place, place_url, notes, published, is_past) VALUES (?, ?, ?, ?, ?, ?, 1, ?)');
    $imported = 0; $skipped = 0;
    foreach ($items as $item) {
        $insertBook->execute([$item['id'], $item['slug'], $item['title'], $item['author'], $item['description'], $item['cover_path']]);
        $readBook->execute([$item['id']]); $book = $readBook->fetch(PDO::FETCH_ASSOC);
        if (!$book || $book['title'] !== $item['title'] || $book['author'] !== $item['author']) { $skipped++; continue; }
        $past = (bool) $item['is_past'];
        $insertMeeting->execute([($past ? 'past-meeting-' : 'winter-meeting-') . $item['id'], $item['id'], $item['starts_at'], $past ? null : 'Ресторан Премьера', $past ? null : 'https://2gis.ru/irkutsk/geo/70000001077483176?inv_by=ca0ced143c694df391a6b0a8c1e146a5&inv_ts=1795455530', '', $past ? 1 : 0]);
        $imported++;
    }
    $db->commit();
    echo "Catalog processed: $imported; skipped due to conflicts: $skipped. Existing records were not overwritten.\n";
} catch (Throwable $e) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    fwrite(STDERR, "Catalog import failed. Check the database configuration and migrations.\n");
    exit(1);
}

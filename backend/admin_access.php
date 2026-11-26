<?php
declare(strict_types=1);

function memberIsAdmin(PDO $db): bool {
    if (!isset($_SESSION['member_id'])) return false;
    $query = $db->prepare('SELECT is_admin FROM members WHERE id = ?');
    $query->execute([$_SESSION['member_id']]);
    return (int) $query->fetchColumn() === 1;
}

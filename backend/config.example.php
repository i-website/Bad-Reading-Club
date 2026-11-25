<?php
// Copy to config.php and enter the credentials of a dedicated MySQL user.
return [
    'host' => '127.0.0.1',
    'port' => 3306,
    'database' => 'bad_reading_club',
    'username' => 'brc_app',
    'password' => '',
    // Use 'demo' for the built-in schedule, or 'supabase' for published meetings.
    'ratings_schedule_source' => 'demo',
    'club_timezone' => 'Asia/Irkutsk',
    'supabase_url' => '',
    'supabase_publishable_key' => '',
];

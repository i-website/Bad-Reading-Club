<?php

declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

require_once __DIR__ . '/vendor/autoload.php';

function sendEmail(
    string $to,
    string $subject,
    string $body
): void {
    $config = require __DIR__ . '/smtp.config.php';

    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host = $config['host'];
    $mail->Port = $config['port'];
    $mail->SMTPAuth = true;
    $mail->Username = $config['username'];
    $mail->Password = $config['password'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;

    $mail->Hostname = gethostname() ?: 'localhost';

    $mail->CharSet = 'UTF-8';
    $mail->Timeout = 30;
    $mail->SMTPDebug = 0;

    $mail->setFrom(
        $config['from_email'],
        $config['from_name']
    );

    $mail->addAddress($to);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $body;
    $mail->AltBody = trim(strip_tags($body));

    $mail->send();
}
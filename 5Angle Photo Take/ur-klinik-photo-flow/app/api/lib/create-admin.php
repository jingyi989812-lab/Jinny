<?php
/**
 * Run once, on the server, to create the first admin account — there's no other way in,
 * since every other account is created by an existing admin, and there isn't one yet.
 *
 *   php create-admin.php <username> <password> ["Display Name"]
 */
require __DIR__ . '/../bootstrap.php';
if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script is for the command line only.\n");
}
pf_config();
$username    = isset($argv[1]) ? $argv[1] : null;
$password    = isset($argv[2]) ? $argv[2] : null;
$displayName = isset($argv[3]) ? $argv[3] : '';

if ($username === null || $password === null) {
    fwrite(STDERR, "Usage: php create-admin.php <username> <password> [\"Display Name\"]\n");
    exit(1);
}
try {
    $u = pf_user_create(array(
        'username' => $username, 'password' => $password, 'displayName' => $displayName,
        'role' => 'admin', 'outlets' => array(), 'actor' => 'cli-bootstrap',
    ));
    echo "Admin account created: {$u['username']} ({$u['displayName']}).\n";
} catch (Exception $e) {
    fwrite(STDERR, 'Failed: ' . $e->getMessage() . "\n");
    exit(1);
}

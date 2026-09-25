<?php
/**
 * POST login.php   { "username": "...", "password": "..." }
 * -> { ok:true, token:"...", user:{ username, displayName, role, outlets } }
 *
 * Every attempt is written to the audit trail, success or failure, so a run of wrong
 * passwords against an account shows up for an admin to notice.
 */
require __DIR__ . '/bootstrap.php';
pf_method('POST');
$cfg = pf_config();

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) {
    $in = $_POST;   // tolerate a plain form POST too
}
$username = isset($in['username']) ? trim((string)$in['username']) : '';
$password = isset($in['password']) ? (string)$in['password'] : '';

if ($username === '' || $password === '') {
    pf_fail(400, 'Enter a username and password.');
}

$u = pf_user_verify_password($username, $password);

pf_audit($cfg, array(
    'event'    => 'auth.login',
    'username' => pf_username_key($username),
    'result'   => $u ? 'success' : 'failed',
    'ip'       => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
));

if ($u === null) {
    pf_fail(401, 'Wrong username or password.');
}

$token = pf_session_create($u['username'], $cfg);
pf_json(200, array('ok' => true, 'token' => $token, 'user' => array(
    'username'    => $u['username'],
    'displayName' => $u['displayName'],
    'role'        => $u['role'],
    'outlets'     => $u['outlets'],
)));

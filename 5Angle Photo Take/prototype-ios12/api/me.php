<?php
/** GET me.php — who this session belongs to, so the app can confirm login on launch. */
require __DIR__ . '/bootstrap.php';
pf_method('GET');
$u = pf_require_login();
pf_json(200, array('ok' => true, 'user' => array(
    'username'    => $u['username'],
    'displayName' => $u['displayName'],
    'role'        => $u['role'],
    'outlets'     => $u['outlets'],
)));

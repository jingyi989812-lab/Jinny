<?php
/**
 * Lets the app tell whether it is running on the real server. Never touches the NAS or POS,
 * and needs no login, so it's cheap and safe to call on every launch, before anyone signs in.
 */
require __DIR__ . '/bootstrap.php';
pf_method('GET');

$cfg  = pf_config_or_null();
$body = array(
    'ok'         => true,
    'service'    => 'photoflow',
    'configured' => $cfg !== null,
);
if ($cfg !== null) {
    $driver = isset($cfg['pos']['driver']) ? strtolower((string)$cfg['pos']['driver']) : 'none';
    $body['pos'] = ($driver === '' || $driver === 'none') ? 'not-connected' : 'connected';
}
pf_json(200, $body);

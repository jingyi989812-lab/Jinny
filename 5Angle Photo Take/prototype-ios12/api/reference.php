<?php
/**
 * A customer's reference photo — the small front photo from their last BEFORE session — so the
 * therapist can recognise them before tapping "Yes, this is the customer".
 *
 *   GET reference.php?id=BM 4521        → image/jpeg, or 404 when there is none yet
 */
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/SynologyFileStation.php';

pf_method('GET');
$me   = pf_require_login();
$cfg  = pf_config();

$id = pf_normalize_id(isset($_GET['id']) ? $_GET['id'] : '');
if ($id === null) {
    pf_fail(400, 'That is not a membership ID.');
}
$outlet = pf_outlet_code($id);
pf_require_outlet($me, $outlet);
$nasCfg = pf_nas_config($cfg, $outlet);
if ($nasCfg === null) {
    pf_fail(400, "No NAS is configured for outlet \"{$outlet}\".");
}
$base = rtrim($nasCfg['base_path'], '/');

try {
    $nas = new SynologyFileStation($nasCfg);
    $nas->login();
    $folders = pf_customer_folders($nas, $base, $id, $cfg);
    if (count($folders) !== 1) {
        $nas->logout();
        pf_fail(count($folders) ? 409 : 404, count($folders) ? "There are several folders for {$id}." : 'No folder yet.');
    }
    $bytes = null;
    $type  = 'image/jpeg';
    foreach (array('jpg' => 'image/jpeg', 'png' => 'image/png') as $e => $t) {
        $bytes = $nas->download("{$base}/{$folders[0]}/_reference.{$e}");
        if ($bytes !== null) {
            $type = $t;
            break;
        }
    }
    $nas->logout();
} catch (Exception $e) {
    error_log("[photoflow] reference failed for {$id}: " . $e->getMessage());
    pf_fail(502, 'Could not load the reference photo: ' . $e->getMessage());
}

if ($bytes === null) {
    pf_fail(404, 'No reference photo yet.');
}
header('Content-Type: ' . $type);
header('Content-Length: ' . strlen($bytes));
header('Cache-Control: private, no-store');
echo $bytes;

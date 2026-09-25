<?php
/**
 * For admins: proves this server can log into each outlet's NAS and see its base folder.
 *
 *   curl -H "X-PhotoFlow-Session: <session token>" https://operation.urklinik.com/Jinny/app/api/nas-test.php
 *
 * Tests every outlet in config.php by default. To test just one (faster while troubleshooting
 * a single outlet), add its code:
 *
 *   .../nas-test.php?outlet=BM
 */
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/SynologyFileStation.php';
pf_method('GET');
$me  = pf_require_admin();
$cfg = pf_config();

$only    = isset($_GET['outlet']) ? strtoupper(trim((string)$_GET['outlet'])) : '';
$outlets = $only !== '' ? array($only) : pf_nas_outlet_codes($cfg);

if (count($outlets) === 0) {
    pf_fail(503, 'No NAS outlets are configured yet.');
}

$results = array();
$allOk   = true;
foreach ($outlets as $outlet) {
    $nasCfg = pf_nas_config($cfg, $outlet);
    if ($nasCfg === null) {
        $results[$outlet] = array('ok' => false, 'steps' => array(), 'error' => "No NAS is configured for outlet \"{$outlet}\".");
        $allOk = false;
        continue;
    }
    $steps = array();
    try {
        $nas = new SynologyFileStation($nasCfg);
        $nas->login();
        $steps[] = 'Logged into the NAS';

        $base = rtrim($nasCfg['base_path'], '/');
        if (!$nas->folderExists($base)) {
            $nas->logout();
            $results[$outlet] = array('ok' => false, 'steps' => $steps, 'error' => "Base folder not found: {$base}");
            $allOk = false;
            continue;
        }
        $steps[] = "Base folder found: {$base}";

        $nas->logout();
        $steps[] = 'Logged out';
        $results[$outlet] = array('ok' => true, 'steps' => $steps);
    } catch (Exception $e) {
        $results[$outlet] = array('ok' => false, 'steps' => $steps, 'error' => $e->getMessage());
        $allOk = false;
    }
}

pf_json($allOk ? 200 : 502, array('ok' => $allOk, 'outlets' => $results));

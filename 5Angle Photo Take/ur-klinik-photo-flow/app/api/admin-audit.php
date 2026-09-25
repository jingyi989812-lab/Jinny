<?php
/**
 * Admin only: the audit trail — every photo saved, every login, and every account change,
 * tagged by which account did it. Reads the same monthly JSONL files pf_audit() writes.
 *
 *   GET admin-audit.php?month=2026-09&outlet=BM&username=jessie.tan&limit=200
 */
require __DIR__ . '/bootstrap.php';
pf_method('GET');
$me  = pf_require_admin();
$cfg = pf_config();

$month = isset($_GET['month']) ? (string)$_GET['month'] : substr(pf_today($cfg), 0, 7);
if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
    pf_fail(400, 'Invalid month — use YYYY-MM.');
}
$outletFilter = isset($_GET['outlet']) ? strtoupper(trim((string)$_GET['outlet'])) : '';
$userFilter   = isset($_GET['username']) ? pf_username_key($_GET['username']) : '';
$limit = isset($_GET['limit']) ? max(1, min(1000, (int)$_GET['limit'])) : 200;

if (empty($cfg['audit_dir'])) {
    pf_json(200, array('ok' => true, 'month' => $month, 'entries' => array()));
}
$file = rtrim($cfg['audit_dir'], '/\\') . DIRECTORY_SEPARATOR . $month . '.jsonl';
$rows = array();
if (is_file($file) && ($fh = @fopen($file, 'r'))) {
    while (($line = fgets($fh)) !== false) {
        $e = json_decode($line, true);
        if (!is_array($e)) {
            continue;   // a half-written last line just fails to decode
        }
        if ($outletFilter !== '') {
            if (!isset($e['customerId']) || pf_outlet_code($e['customerId']) !== $outletFilter) {
                continue;
            }
        }
        if ($userFilter !== '') {
            $who = isset($e['username']) ? pf_username_key($e['username'])
                 : (isset($e['actor']) ? pf_username_key($e['actor']) : '');
            if ($who !== $userFilter) {
                continue;
            }
        }
        $rows[] = $e;
    }
    fclose($fh);
}
$rows = array_slice(array_reverse($rows), 0, $limit);   // newest first
pf_json(200, array('ok' => true, 'month' => $month, 'entries' => $rows));

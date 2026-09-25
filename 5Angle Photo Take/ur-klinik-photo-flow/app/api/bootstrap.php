<?php
/**
 * Shared setup for every Photo Flow endpoint.
 */
require __DIR__ . '/lib/Users.php';
require __DIR__ . '/lib/Sessions.php';

// A PHP notice printed into the response would corrupt the JSON the phone reads. Log instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

define('PF_SESSION_RE', '/^\d{6}$/');

/*
 * Membership IDs are an outlet code and a number: "BM 4521", "SS2 4521" (the POS writes them
 * "BM-4521"). The number is counted per outlet — BM 4521 and GL 4521 are two different people
 * (thousands of numbers are shared like this in the POS customer table) — so the outlet code
 * and the number together identify the customer. Never match on the number alone.
 *
 * PF_ID_PREFIX: letters ("BM", written with or without a space), or letters ending in a digit
 * ("SS2", which needs the space, or "SS24521" would be ambiguous).
 */
define('PF_ID_PREFIX', '(?:([A-Z]{1,5}[0-9])[ -]|([A-Z]{1,6})[ -]?)([0-9]{1,8})');

/**
 * Accept "BM4521", "bm-4521", "SS2 4521" and return the canonical "BM 4521". Letters, digits
 * and one space only, so an ID can never carry a slash, a dot, or a File Station wildcard.
 * Returns null if it isn't an ID.
 */
function pf_normalize_id($raw)
{
    $s = strtoupper(trim((string)$raw));
    if (!preg_match('/^' . PF_ID_PREFIX . '$/', $s, $m)) {
        return null;
    }
    return ($m[1] !== '' ? $m[1] : $m[2]) . ' ' . $m[3];
}

/** The customer number of a canonical ID or any folder name: "BM 04521" -> "4521". */
function pf_id_number($id)
{
    $parts = explode(' ', (string)$id);
    $n = ltrim((string)end($parts), '0');
    return $n === '' ? '0' : $n;
}

/** The membership ID a folder name starts with, e.g. "BM 6830 LIM SU ANN (JESSIE)" -> "BM 6830". */
function pf_folder_id($folderName)
{
    if (preg_match('/^\s*' . PF_ID_PREFIX . '(?:\s|$)/i', (string)$folderName, $m)) {
        return strtoupper($m[1] !== '' ? $m[1] : $m[2]) . ' ' . $m[3];
    }
    return null;
}

/** The form two IDs are compared in: outlet code + number without leading zeros. "BM 04521" -> "BM 4521" */
function pf_id_key($id)
{
    $parts = explode(' ', (string)$id);
    return strtoupper($parts[0]) . ' ' . pf_id_number($id);
}

/** Do an ID and a folder name belong to the same customer? Same outlet code and number. */
function pf_same_customer($id, $folderName)
{
    $fid = pf_folder_id($folderName);
    return $fid !== null && pf_id_key($fid) === pf_id_key($id);
}

/** The outlet code at the front of a membership ID, e.g. "BM 4521" -> "BM", "SS2 4521" -> "SS2". */
function pf_outlet_code($id)
{
    $parts = explode(' ', pf_id_key($id));
    return $parts[0];
}

/**
 * This outlet's NAS connection settings (host, base_path) merged with whatever every outlet
 * shares (account, password, port, scheme, timeout, ...). Null if this outlet has no NAS
 * configured — happens if the outlet code is mistyped, or a new outlet opened before its NAS
 * was added here.
 */
function pf_nas_config(array $cfg, $outlet)
{
    if (!isset($cfg['nas']['outlets'][$outlet])) {
        return null;
    }
    $shared = $cfg['nas'];
    unset($shared['outlets']);
    return $shared + $cfg['nas']['outlets'][$outlet];
}

/** Every outlet code this server has a NAS for, e.g. array('KW', 'BM', 'SS2', ...). */
function pf_nas_outlet_codes(array $cfg)
{
    return isset($cfg['nas']['outlets']) ? array_keys($cfg['nas']['outlets']) : array();
}

/** Is this an outlet Photo Flow actually has a NAS for? Other POS branch/department codes
 * (retail counters, other business units, HQ, ...) are never Photo Flow outlets at all, and
 * should never show up here even for an admin who's otherwise allowed to see everything. */
function pf_outlet_known(array $cfg, $outlet)
{
    return in_array($outlet, pf_nas_outlet_codes($cfg), true);
}

/** A customer name made safe to use in a new folder name, uppercased to match the existing folders. */
function pf_clean_name($raw)
{
    $n = trim((string)$raw);
    $n = function_exists('mb_strtoupper') ? mb_strtoupper($n, 'UTF-8') : strtoupper($n);
    // "~" delimiter, because the character class itself contains "/".
    $n = preg_replace('~[\\\\/:*?"<>|,\[\]\x00-\x1F\x7F]~u', '', $n);   // illegal in folder names, or wildcards
    if ($n === null) {
        return '';   // not valid UTF-8
    }
    $n = preg_replace('/\s+/u', ' ', $n);
    $n = function_exists('mb_substr') ? mb_substr($n, 0, 80, 'UTF-8') : substr($n, 0, 80);
    return trim(rtrim($n, ' .'));
}

/**
 * A label for a group of extra photos — hands, legs, a back, anything that isn't one of the five
 * face angles. Typed by the therapist, so it can be in any language; kept short, uppercased, and
 * stripped of everything a file name can't carry. Empty becomes "EXTRA".
 */
function pf_clean_label($raw)
{
    $n = trim((string)$raw);
    $n = function_exists('mb_strtoupper') ? mb_strtoupper($n, 'UTF-8') : strtoupper($n);
    $n = preg_replace('~[\\\\/:*?"<>|,\[\].\x00-\x1F\x7F]~u', ' ', $n);   // "." too: no ".." inside a file name
    if ($n === null) {
        return 'EXTRA';   // not valid UTF-8
    }
    $n = preg_replace('/[\s_]+/u', '-', trim($n));
    $n = function_exists('mb_substr') ? mb_substr($n, 0, 20, 'UTF-8') : substr($n, 0, 20);
    $n = trim($n, "-. \t");
    return $n === '' ? 'EXTRA' : $n;
}

/** Angle key => file name prefix, in capture order: one direction at a time. */
function pf_angles()
{
    return array(
        'front' => '1-FRONT',
        'l45'   => '2-LEFT-45',
        'lside' => '3-LEFT-SIDE',
        'r45'   => '4-RIGHT-45',
        'rside' => '5-RIGHT-SIDE',
    );
}

function pf_json($status, array $body)
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function pf_fail($status, $message)
{
    pf_json($status, array('ok' => false, 'error' => $message));
}

function pf_method($method)
{
    if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== $method) {
        header('Allow: ' . $method);
        pf_fail(405, "Use {$method}.");
    }
}

/** Where the credentials live — deliberately outside the website folder. */
function pf_config_path()
{
    $env = getenv('PHOTOFLOW_CONFIG');
    if ($env) {
        return $env;
    }
    return DIRECTORY_SEPARATOR === '\\' ? 'C:\\photoflow-config\\config.php' : '/etc/photoflow/config.php';
}

function pf_config_or_null()
{
    static $loaded = false, $cfg = null;
    if ($loaded) {
        return $cfg;
    }
    $loaded = true;
    $path = pf_config_path();
    if (!is_file($path)) {
        return null;
    }
    $c = require $path;
    $cfg = is_array($c) ? $c : null;
    return $cfg;
}

function pf_config()
{
    $cfg = pf_config_or_null();
    if ($cfg === null) {
        error_log('[photoflow] config not found at ' . pf_config_path());
        pf_fail(503, 'Photo Flow is not configured on this server yet.');
    }
    return $cfg;
}

/** The session token from this request's custom header, or ''. */
function pf_bearer_token()
{
    return isset($_SERVER['HTTP_X_PHOTOFLOW_SESSION']) ? trim((string)$_SERVER['HTTP_X_PHOTOFLOW_SESSION']) : '';
}

/** The signed-in, active account for this request, or null. One file read per request. */
function pf_current_user()
{
    static $checked = false, $user = null;
    if ($checked) {
        return $user;
    }
    $checked = true;
    $username = pf_session_username(pf_bearer_token());
    if ($username === null) {
        return null;
    }
    $u = pf_user_find($username);
    if ($u === null || empty($u['active'])) {
        return null;
    }
    return $user = $u;
}

/** Every endpoint but login.php calls this first. Returns the signed-in account, or fails 401. */
function pf_require_login()
{
    pf_config();
    $u = pf_current_user();
    if ($u === null) {
        pf_fail(401, 'Please sign in again.');
    }
    return $u;
}

/** For admin-only endpoints (managing accounts, the audit trail, cross-outlet diagnostics). */
function pf_require_admin()
{
    $u = pf_require_login();
    if ($u['role'] !== 'admin') {
        pf_fail(403, 'Admin access only.');
    }
    return $u;
}

/** May this account act on this outlet? Every admin may; a staff account only its assigned ones. */
function pf_user_can_outlet(array $user, $outlet)
{
    return $user['role'] === 'admin' || in_array($outlet, (array)$user['outlets'], true);
}

/** Fails the request with 403 unless this account may act on this outlet. */
function pf_require_outlet(array $user, $outlet)
{
    if (!pf_user_can_outlet($user, $outlet)) {
        pf_fail(403, "Your account doesn't have access to outlet \"{$outlet}\".");
    }
}

function pf_today(array $cfg)
{
    $tz = !empty($cfg['timezone']) ? $cfg['timezone'] : 'Asia/Kuala_Lumpur';
    $d = new DateTime('now', new DateTimeZone($tz));
    return $d->format('Y-m-d');
}

/** The audit file for a clinic-local date: one file per month. */
function pf_audit_file(array $cfg, $date)
{
    if (empty($cfg['audit_dir'])) {
        return null;
    }
    return rtrim($cfg['audit_dir'], '/\\') . DIRECTORY_SEPARATOR . substr($date, 0, 7) . '.jsonl';
}

/** One JSON line per saved photo, for the QA team. Never blocks a save. */
function pf_audit(array $cfg, array $entry)
{
    $file = pf_audit_file($cfg, pf_today($cfg));
    if ($file === null) {
        return;
    }
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0770, true)) {
        error_log('[photoflow] cannot create audit folder ' . $dir);
        return;
    }
    $line = json_encode(array('at' => gmdate('c'), 'date' => pf_today($cfg)) + $entry,
                        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
    if (@file_put_contents($file, $line, FILE_APPEND | LOCK_EX) === false) {
        error_log('[photoflow] cannot write audit log ' . $file);
    }
}

/**
 * What was photographed on $date, per customer, read back from the audit log:
 *   "BM 4521" => array('id', 'folder', 'before' => angles saved, 'after' => angles saved)
 * This is what the dashboard shows before the POS is connected.
 */
function pf_photographed_on(array $cfg, $date)
{
    $file = pf_audit_file($cfg, $date);
    $out = array();
    if ($file === null || !is_file($file)) {
        return $out;
    }
    $fh = @fopen($file, 'r');
    if (!$fh) {
        return $out;
    }
    $seen = array();
    $groups = array();
    $angles = pf_angles();
    while (($line = fgets($fh)) !== false) {
        $e = json_decode($line, true);   // a half-written last line just fails to decode
        if (!is_array($e) || !isset($e['event'], $e['date'], $e['customerId'], $e['phase'], $e['angle'])
            || $e['event'] !== 'photo.saved' || $e['date'] !== $date) {
            continue;
        }
        $id = pf_id_key($e['customerId']);
        if (!isset($out[$id])) {
            $out[$id] = array('id' => $e['customerId'], 'folder' => null, 'before' => 0, 'after' => 0,
                              'beforeExtra' => 0, 'afterExtra' => 0, 'groups' => array(), 'last' => '');
            $seen[$id] = array();
            $groups[$id] = array();
        }
        if (!empty($e['customerFolder'])) {
            $out[$id]['folder'] = $e['customerFolder'];
        }
        $extra = empty($e['angle']) || !isset($angles[$e['angle']]);
        $group = isset($e['group']) ? (int)$e['group'] : 0;
        $k = $e['phase'] . '/' . ($extra ? 'x' . $group . '/' . (isset($e['seq']) ? $e['seq'] : '?') : $e['angle']);
        if (empty($seen[$id][$k])) {
            $seen[$id][$k] = true;
            $which = $e['phase'] === 'AFTER' ? 'after' : 'before';
            if ($extra) {
                $out[$id][$which . 'Extra']++;
                // Which labels exist, so the AFTER session can offer the same ones back.
                $gk = $which . '/' . $group;
                if (!isset($groups[$id][$gk])) {
                    $groups[$id][$gk] = array('phase' => $which, 'group' => $group,
                                              'label' => isset($e['label']) ? (string)$e['label'] : 'EXTRA', 'count' => 0);
                }
                $groups[$id][$gk]['count']++;
            } else {
                $out[$id][$which]++;
            }
        }
        if (isset($e['at'])) {
            $out[$id]['last'] = $e['at'];
        }
    }
    fclose($fh);
    foreach ($out as $id => $row) {
        $list = array_values($groups[$id]);
        usort($list, function ($a, $b) { return $a['group'] - $b['group']; });
        $out[$id]['groups'] = $list;
    }
    return $out;
}

/**
 * Labels the clinic has used this month, most used first — what the phone offers as
 * one-tap suggestions instead of typing.
 */
function pf_recent_labels(array $cfg, $date, $limit = 8)
{
    $file = pf_audit_file($cfg, $date);
    if ($file === null || !is_file($file)) {
        return array();
    }
    $fh = @fopen($file, 'r');
    if (!$fh) {
        return array();
    }
    $count = array();
    while (($line = fgets($fh)) !== false) {
        $e = json_decode($line, true);
        if (!is_array($e) || empty($e['label']) || $e['label'] === 'EXTRA') {
            continue;
        }
        $l = (string)$e['label'];
        $count[$l] = isset($count[$l]) ? $count[$l] + 1 : 1;
    }
    fclose($fh);
    arsort($count);
    return array_slice(array_keys($count), 0, $limit);
}

/** Where server-side caches live (the folder list, the POS data). Outside the website. */
function pf_cache_dir(array $cfg)
{
    if (!empty($cfg['cache_dir'])) {
        return rtrim($cfg['cache_dir'], '/\\');
    }
    if (!empty($cfg['pos']['cache_dir'])) {
        return rtrim($cfg['pos']['cache_dir'], '/\\');
    }
    return dirname(pf_config_path()) . DIRECTORY_SEPARATOR . 'cache';
}

/**
 * Every customer folder in $base, as "BM 4521" => array(folder names), cached for a few minutes.
 *
 * This NAS's File Station crashes when a listing is filtered by name (Eric, Sep 2026), so the
 * only way to find a folder is to list all of them — thousands of names, several NAS calls.
 * Doing that for every photo and every reference picture would be slow, so the list is kept
 * in a file and rebuilt when it is older than 'folder_cache_minutes', or when a caller forces
 * it because the cached answer might be stale (see pf_customer_folders).
 */
function pf_folder_index(SynologyFileStation $nas, array $cfg, $base, $force = false)
{
    static $mem = array();
    $file = pf_cache_dir($cfg) . DIRECTORY_SEPARATOR . 'folders-' . substr(md5($base), 0, 8) . '.json';
    $ttl  = 60 * (isset($cfg['folder_cache_minutes']) ? max(0, (int)$cfg['folder_cache_minutes']) : 10);

    if (!$force && isset($mem[$file])) {
        return $mem[$file];
    }
    if (!$force && $ttl > 0 && is_file($file) && time() - filemtime($file) < $ttl) {
        $c = json_decode((string)@file_get_contents($file), true);
        if (is_array($c) && isset($c['index'])) {
            return $mem[$file] = $c['index'];
        }
    }
    $index = array();
    foreach ($nas->listFolderNames($base, '') as $name) {
        $fid = pf_folder_id($name);
        if ($fid !== null) {
            $index[pf_id_key($fid)][] = $name;
        }
    }
    foreach ($index as $k => $names) {
        sort($index[$k]);
    }
    $dir = dirname($file);
    if ((is_dir($dir) || @mkdir($dir, 0770, true))) {
        $json = json_encode(array('built' => time(), 'index' => $index), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if (@file_put_contents($file . '.part', $json) === false || !@rename($file . '.part', $file)) {
            @unlink($file . '.part');
            @file_put_contents($file, $json, LOCK_EX);
        }
    } else {
        error_log('[photoflow] cannot create cache folder ' . $dir);
    }
    return $mem[$file] = $index;
}

/**
 * The on-disk folder index for $base, but only if it's still fresh — never touches the NAS.
 * Null means "stale or missing"; the caller must then log into that outlet's NAS and call
 * pf_folder_index() to rebuild it. Used by the search view, which may need to check several
 * outlets' NASes at once and shouldn't log into ones whose index is already good.
 */
function pf_folder_index_if_fresh(array $cfg, $base)
{
    $file = pf_cache_dir($cfg) . DIRECTORY_SEPARATOR . 'folders-' . substr(md5($base), 0, 8) . '.json';
    $ttl  = 60 * (isset($cfg['folder_cache_minutes']) ? max(0, (int)$cfg['folder_cache_minutes']) : 10);
    if ($ttl > 0 && is_file($file) && time() - filemtime($file) < $ttl) {
        $c = json_decode((string)@file_get_contents($file), true);
        if (is_array($c) && isset($c['index'])) {
            return $c['index'];
        }
    }
    return null;
}

/** Remember a folder this app just created, so the next photo doesn't need a fresh listing. */
function pf_folder_index_add(SynologyFileStation $nas, array $cfg, $base, $folderName)
{
    $index = pf_folder_index($nas, $cfg, $base);
    $key = pf_id_key(pf_folder_id($folderName));
    if (!isset($index[$key]) || !in_array($folderName, $index[$key], true)) {
        pf_folder_index($nas, $cfg, $base, true);   // cheap enough, and exactly right
    }
}

/**
 * This customer's folders in $base: same outlet code and number, so "BM 4521" never picks up
 * "BM 45210", "BM 14521" or "GL 4521". Two or more means duplicate folders — callers refuse.
 *
 * $verify: the answer decides where a photo is saved, so don't trust a cached list blindly —
 * a folder missing from it may just have been made by hand, a listed one renamed, or two
 * duplicates merged. In those cases, re-list the NAS before answering.
 */
function pf_customer_folders(SynologyFileStation $nas, $base, $id, array $cfg = array(), $verify = false)
{
    $key = pf_id_key($id);
    $index = pf_folder_index($nas, $cfg, $base);
    $found = isset($index[$key]) ? $index[$key] : array();
    if ($verify) {
        // Anything but exactly one existing folder is re-checked: IT may just have made or merged one.
        $stale = count($found) !== 1 || !$nas->folderExists($base . '/' . $found[0]);
        if ($stale) {
            $index = pf_folder_index($nas, $cfg, $base, true);
            $found = isset($index[$key]) ? $index[$key] : array();
        }
    }
    return $found;
}

/** "BM 6830 LIM SU ANN (JESSIE)" -> "LIM SU ANN (JESSIE)" */
function pf_name_from_folder($folderName)
{
    return trim((string)preg_replace('/^\s*' . PF_ID_PREFIX . '\s*/i', '', (string)$folderName));
}

/** What a file really is, from its bytes — never the type the browser claims. */
function pf_sniff_mime($path)
{
    if (function_exists('finfo_open')) {
        $fi   = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($fi, $path);
        if (PHP_VERSION_ID < 80100) {
            finfo_close($fi);   // automatic since PHP 8.1, and deprecated in 8.5
        }
        return (string)$mime;
    }
    $head = (string)@file_get_contents($path, false, null, 0, 8);
    if (strncmp($head, "\xFF\xD8\xFF", 3) === 0) {
        return 'image/jpeg';
    }
    if (strncmp($head, "\x89PNG\r\n\x1A\n", 8) === 0) {
        return 'image/png';
    }
    return 'application/octet-stream';
}

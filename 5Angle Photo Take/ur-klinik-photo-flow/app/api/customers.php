<?php
/**
 * Finding customers. Works from the NAS alone today; adds the POS once it is connected
 * (see lib/Pos.php). The phone never learns a folder path — only folder names.
 *
 *   GET customers.php?view=today              today's bookings (POS) or who was photographed today
 *   GET customers.php?view=search&q=lee mei   by name, phone (POS only) or membership ID
 *   GET customers.php?view=lookup&id=BM 4521  one ID: does it have a folder, which one
 */
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/SynologyFileStation.php';
require __DIR__ . '/lib/Pos.php';

pf_method('GET');
$me   = pf_require_login();
$cfg  = pf_config();
$date = pf_today($cfg);
$view = isset($_GET['view']) ? (string)$_GET['view'] : '';

try {
    $pos = pf_pos($cfg);
} catch (Exception $e) {
    error_log('[photoflow] POS driver: ' . $e->getMessage());
    $pos = null;
    $posError = $e->getMessage();
}

/** The one customer shape the phone receives, whichever source it came from. */
function pf_out(array $c, $source)
{
    return array(
        'id'         => $c['id'],
        'name'       => isset($c['name']) ? $c['name'] : '',
        'phoneLast4' => isset($c['phoneLast4']) ? $c['phoneLast4'] : null,
        'time'       => isset($c['time']) ? $c['time'] : null,
        'lastVisit'  => isset($c['lastVisit']) ? $c['lastVisit'] : null,
        'folder'     => isset($c['folder']) ? $c['folder'] : null,
        'before'     => isset($c['before']) ? (int)$c['before'] : 0,
        'after'      => isset($c['after']) ? (int)$c['after'] : 0,
        // Photos that aren't face angles, and the label groups they belong to.
        'beforeExtra' => isset($c['beforeExtra']) ? (int)$c['beforeExtra'] : 0,
        'afterExtra'  => isset($c['afterExtra']) ? (int)$c['afterExtra'] : 0,
        'groups'      => isset($c['groups']) ? $c['groups'] : array(),
        'branch'     => isset($c['branch']) ? $c['branch'] : null,
        'status'     => isset($c['status']) ? $c['status'] : null,
        'source'     => $source,
    );
}

/**
 * One outlet's folder index for search: from cache if it's still fresh (no NAS touched at
 * all), otherwise logs into that outlet's NAS to rebuild it. Never throws — an outlet whose
 * NAS is unreachable right now is skipped (and logged), so one bad connection doesn't stop a
 * search that only needed to check the other eight.
 */
function pf_search_outlet_index(array $nasCfg, array $cfg, $outlet)
{
    $base  = rtrim($nasCfg['base_path'], '/');
    $fresh = pf_folder_index_if_fresh($cfg, $base);
    if ($fresh !== null) {
        return $fresh;
    }
    try {
        $nas = new SynologyFileStation($nasCfg);
        $nas->login();
        $index = pf_folder_index($nas, $cfg, $base);
        $nas->logout();
        return $index;
    } catch (Exception $e) {
        error_log("[photoflow] search: outlet {$outlet} NAS unreachable: " . $e->getMessage());
        return array();
    }
}

function pf_pos_call($fn)
{
    global $posError;
    try {
        return $fn();
    } catch (Exception $e) {
        error_log('[photoflow] POS call failed: ' . $e->getMessage());
        $posError = 'The POS could not be reached: ' . $e->getMessage();
        return null;
    }
}

$body = array('ok' => true, 'pos' => $pos ? 'connected' : 'not-connected', 'date' => $date);

// ---------------------------------------------------------------------------- today
if ($view === 'today') {
    $shot = pf_photographed_on($cfg, $date);
    $list = array();
    if ($pos) {
        $booked = pf_pos_call(function () use ($pos, $date) { return pf_pos_customers($pos->today($date)); });
        foreach ((array)$booked as $c) {
            $key = pf_id_key($c['id']);
            if (isset($shot[$key])) {
                $c = array_merge($c, array_diff_key($shot[$key], array('id' => 1)));
                unset($shot[$key]);
            }
            $list[] = pf_out($c, 'pos');
        }
    }
    // Photographed today but not booked (walk-ins), or everyone when there is no POS.
    foreach ($shot as $s) {
        $s['name'] = pf_name_from_folder($s['folder']);
        $list[] = pf_out($s, 'photos');
    }
    $body['customers'] = array_values(array_filter($list, function ($c) use ($me, $cfg) {
        $o = pf_outlet_code($c['id']);
        return pf_outlet_known($cfg, $o) && pf_user_can_outlet($me, $o);
    }));
    // Outlets with appointments today, so each phone can show only its own.
    $branches = array();
    foreach ($body['customers'] as $c) {
        if ($c['branch'] !== null) {
            $branches[$c['branch']] = true;
        }
    }
    ksort($branches);
    $body['branches'] = array_keys($branches);
    $body['labels'] = pf_recent_labels($cfg, $date);   // one-tap suggestions on the phone
}

// ---------------------------------------------------------------------------- search
elseif ($view === 'search') {
    $q = trim(isset($_GET['q']) ? (string)$_GET['q'] : '');
    if ((function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q)) < 2) {
        pf_fail(400, 'Type at least 2 letters or digits.');
    }
    $limit = 20;
    $found = array();

    if ($pos) {
        $hits = pf_pos_call(function () use ($pos, $q, $limit) { return pf_pos_customers($pos->search($q, $limit)); });
        foreach ((array)$hits as $c) {
            $o = pf_outlet_code($c['id']);
            if (pf_outlet_known($cfg, $o) && pf_user_can_outlet($me, $o)) {
                $found[pf_id_key($c['id'])] = pf_out($c, 'pos');
            }
        }
    }

    // The NAS folder names are a customer list too — including customers the POS doesn't know.
    // An ID finds that exact ID, on just that one outlet's NAS; any other text is matched
    // against folder names, which means checking every outlet's NAS, because this NAS can't
    // filter a listing itself (see listFolderNames). Either way, only outlets this account
    // may see are ever checked.
    $id     = pf_normalize_id($q);
    $needle = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $q));
    if (strlen($needle) >= 2) {
        $index = array();
        if ($id !== null) {
            // A specific membership ID: only that one outlet can possibly have it.
            $outlet = pf_outlet_code($id);
            $nasCfg = pf_user_can_outlet($me, $outlet) ? pf_nas_config($cfg, $outlet) : null;
            if ($nasCfg !== null) {
                $index = pf_search_outlet_index($nasCfg, $cfg, $outlet);
            }
        } else {
            // A name, phone or bare number: could be at any outlet this account can see.
            foreach (pf_nas_outlet_codes($cfg) as $outlet) {
                if (!pf_user_can_outlet($me, $outlet)) {
                    continue;
                }
                $nasCfg = pf_nas_config($cfg, $outlet);
                if ($nasCfg !== null) {
                    $index += pf_search_outlet_index($nasCfg, $cfg, $outlet);
                }
            }
        }
        $keys = array_keys($index);
        sort($keys);
        foreach ($keys as $key) {
            foreach ($index[$key] as $n) {
                $hit = $id !== null ? $key === pf_id_key($id)
                     : (ctype_digit($needle) ? pf_id_number($key) === ltrim($needle, '0')   // "1500": that number, any outlet
                                             : strpos(strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $n)), $needle) !== false);
                if (!$hit) {
                    continue;
                }
                if (isset($found[$key])) {
                    $found[$key]['folder'] = $found[$key]['folder'] ?: $n;
                } elseif (count($found) < $limit) {
                    $found[$key] = pf_out(array('id' => pf_folder_id($n), 'name' => pf_name_from_folder($n), 'folder' => $n), 'nas');
                }
            }
        }
    }
    $body['customers'] = array_values($found);
}

// ---------------------------------------------------------------------------- lookup
elseif ($view === 'lookup') {
    $id = pf_normalize_id(isset($_GET['id']) ? $_GET['id'] : '');
    if ($id === null) {
        pf_fail(400, 'That is not a membership ID (expected something like BM 4521).');
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
        $folders = pf_customer_folders($nas, $base, $id, $cfg, true);
        $nas->logout();
    } catch (Exception $e) {
        error_log("[photoflow] lookup failed for {$id}: " . $e->getMessage());
        pf_fail(502, 'Could not check the NAS: ' . $e->getMessage());
    }
    $c = $pos ? pf_pos_call(function () use ($pos, $id) { return pf_pos_customer($pos->find($id)); }) : null;

    // What this customer already has today, so an AFTER session can offer the same labels back
    // and the confirm screen knows which set of photos is still missing.
    $shot = pf_photographed_on($cfg, $date);
    $key  = pf_id_key($id);
    $body['today'] = isset($shot[$key])
        ? array('before' => $shot[$key]['before'], 'after' => $shot[$key]['after'],
                'beforeExtra' => $shot[$key]['beforeExtra'], 'afterExtra' => $shot[$key]['afterExtra'],
                'groups' => $shot[$key]['groups'])
        : array('before' => 0, 'after' => 0, 'beforeExtra' => 0, 'afterExtra' => 0, 'groups' => array());
    $body['labels']  = pf_recent_labels($cfg, $date);
    $body['id']      = $id;
    $body['status']  = count($folders) === 0 ? 'none' : (count($folders) === 1 ? 'found' : 'duplicate');
    $body['folders'] = $folders;
    $body['customer'] = $c ? pf_out(array_merge($c, array('folder' => count($folders) === 1 ? $folders[0] : null)), 'pos')
                     : (count($folders) === 1 ? pf_out(array('id' => $id, 'name' => pf_name_from_folder($folders[0]), 'folder' => $folders[0]), 'nas') : null);
}

else {
    pf_fail(400, 'Unknown view.');
}

if (!empty($posError)) {
    $body['posError'] = $posError;
}
pf_json(200, $body);

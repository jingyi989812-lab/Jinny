<?php
/**
 * Admin only: manage staff accounts.
 *   GET  admin-users.php                        every account (never a password)
 *   POST admin-users.php {action:'create', username, password, displayName, role, outlets}
 *   POST admin-users.php {action:'update', username, displayName?, role?, outlets?, active?}
 *   POST admin-users.php {action:'reset-password', username, password}
 */
require __DIR__ . '/bootstrap.php';
$me  = pf_require_admin();
$cfg = pf_config();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $out = array();
    foreach (pf_user_list() as $u) {
        $out[] = pf_user_public($u);
    }
    usort($out, function ($a, $b) { return strcmp($a['username'], $b['username']); });
    pf_json(200, array('ok' => true, 'users' => $out, 'outlets' => pf_nas_outlet_codes($cfg)));
}

pf_method('POST');
$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) {
    pf_fail(400, 'Invalid request.');
}
$action = isset($in['action']) ? (string)$in['action'] : '';

try {
    if ($action === 'create') {
        $u = pf_user_create(array(
            'username'    => isset($in['username']) ? $in['username'] : '',
            'password'    => isset($in['password']) ? $in['password'] : '',
            'displayName' => isset($in['displayName']) ? $in['displayName'] : '',
            'role'        => isset($in['role']) ? $in['role'] : 'staff',
            'outlets'     => isset($in['outlets']) ? (array)$in['outlets'] : array(),
            'actor'       => $me['username'],
        ));
        pf_audit($cfg, array('event' => 'user.created', 'actor' => $me['username'],
            'target' => $u['username'], 'role' => $u['role'], 'outlets' => $u['outlets']));
        pf_json(200, array('ok' => true, 'user' => pf_user_public($u)));
    } elseif ($action === 'update') {
        $fields = array();
        foreach (array('displayName', 'role', 'outlets', 'active') as $k) {
            if (array_key_exists($k, $in)) {
                $fields[$k] = $in[$k];
            }
        }
        $u = pf_user_update(isset($in['username']) ? $in['username'] : '', $fields, $me['username']);
        pf_audit($cfg, array('event' => 'user.updated', 'actor' => $me['username'],
            'target' => $u['username'], 'changes' => $fields));
        pf_json(200, array('ok' => true, 'user' => pf_user_public($u)));
    } elseif ($action === 'reset-password') {
        $username = isset($in['username']) ? $in['username'] : '';
        pf_user_reset_password($username, isset($in['password']) ? $in['password'] : '', $me['username']);
        pf_audit($cfg, array('event' => 'user.password_reset', 'actor' => $me['username'],
            'target' => pf_username_key($username)));
        pf_json(200, array('ok' => true));
    } else {
        pf_fail(400, 'Unknown action.');
    }
} catch (InvalidArgumentException $e) {
    pf_fail(400, $e->getMessage());
} catch (Exception $e) {
    error_log('[photoflow] admin-users: ' . $e->getMessage());
    pf_fail(500, 'Could not complete that action.');
}

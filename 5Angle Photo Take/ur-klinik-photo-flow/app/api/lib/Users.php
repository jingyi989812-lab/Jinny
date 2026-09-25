<?php
/**
 * The account store: one JSON file, outside the website folder (next to config.php).
 * Small (staff accounts, not customers — a few dozen at most), so it's read whole and
 * rewritten whole; no database needed. Every write is atomic (temp file + rename), so a
 * crash mid-write can't corrupt it.
 */

function pf_users_file()
{
    return dirname(pf_config_path()) . DIRECTORY_SEPARATOR . 'users.json';
}

function pf_users_load()
{
    $file = pf_users_file();
    if (!is_file($file)) {
        return array('v' => 1, 'users' => array());
    }
    $data = json_decode((string)@file_get_contents($file), true);
    if (!is_array($data) || !isset($data['users']) || !is_array($data['users'])) {
        return array('v' => 1, 'users' => array());
    }
    return $data;
}

function pf_users_save(array $data)
{
    $file = pf_users_file();
    $dir  = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0770, true)) {
        throw new RuntimeException("Cannot create {$dir}.");
    }
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    $part = $file . '.part';
    if (@file_put_contents($part, $json, LOCK_EX) === false || !@rename($part, $file)) {
        @unlink($part);
        if (@file_put_contents($file, $json, LOCK_EX) === false) {
            throw new RuntimeException('Cannot write the account store.');
        }
    }
}

/** Username, lowercased/trimmed — the form every lookup and storage key uses. */
function pf_username_key($raw)
{
    return strtolower(trim((string)$raw));
}

function pf_user_find($username)
{
    $data = pf_users_load();
    $key  = pf_username_key($username);
    return isset($data['users'][$key]) ? $data['users'][$key] : null;
}

/** Every account, keyed by username. Never includes the password hash's plaintext, obviously —
 * it's stored hashed to begin with — but callers building an API response should still use
 * pf_user_public() rather than returning this raw, since it does carry the hash itself. */
function pf_user_list()
{
    $data = pf_users_load();
    return $data['users'];
}

/** An account shape safe to send to the phone: never the password hash. */
function pf_user_public(array $u)
{
    return array(
        'username'          => $u['username'],
        'displayName'       => $u['displayName'],
        'role'              => $u['role'],
        'outlets'           => $u['outlets'],
        'active'            => !empty($u['active']),
        'createdAt'         => isset($u['createdAt']) ? $u['createdAt'] : null,
        'passwordChangedAt' => isset($u['passwordChangedAt']) ? $u['passwordChangedAt'] : null,
    );
}

function pf_user_verify_password($username, $password)
{
    $u = pf_user_find($username);
    if ($u === null || empty($u['active']) || $password === '') {
        return null;
    }
    if (!password_verify((string)$password, (string)$u['passwordHash'])) {
        return null;
    }
    return $u;
}

/** How many active admin accounts exist — used so the last one can never be locked out. */
function pf_user_active_admin_count()
{
    $n = 0;
    foreach (pf_users_load()['users'] as $u) {
        if ($u['role'] === 'admin' && !empty($u['active'])) {
            $n++;
        }
    }
    return $n;
}

/** Create a staff or admin account. Throws (with a message safe to show TK) on bad input. */
function pf_user_create(array $fields)
{
    $key = pf_username_key(isset($fields['username']) ? $fields['username'] : '');
    if ($key === '' || !preg_match('/^[a-z0-9._-]{3,40}$/', $key)) {
        throw new InvalidArgumentException('Username must be 3-40 characters: letters, digits, dot, underscore or dash.');
    }
    $password = isset($fields['password']) ? (string)$fields['password'] : '';
    if (strlen($password) < 8) {
        throw new InvalidArgumentException('Password must be at least 8 characters.');
    }
    $data = pf_users_load();
    if (isset($data['users'][$key])) {
        throw new InvalidArgumentException('That username is already taken.');
    }
    $role    = (isset($fields['role']) && $fields['role'] === 'admin') ? 'admin' : 'staff';
    $outlets = $role === 'admin' ? array()
             : array_values(array_unique(array_map(function ($o) { return strtoupper(trim((string)$o)); }, (array)(isset($fields['outlets']) ? $fields['outlets'] : array()))));
    $displayName = trim((string)(isset($fields['displayName']) ? $fields['displayName'] : ''));
    $data['users'][$key] = array(
        'username'          => $key,
        'displayName'       => $displayName !== '' ? $displayName : $key,
        'passwordHash'      => password_hash($password, PASSWORD_DEFAULT),
        'role'              => $role,
        'outlets'           => $outlets,
        'active'            => true,
        'createdAt'         => gmdate('c'),
        'createdBy'         => (string)(isset($fields['actor']) ? $fields['actor'] : ''),
        'passwordChangedAt' => gmdate('c'),
    );
    pf_users_save($data);
    return $data['users'][$key];
}

/** Edit displayName / role / outlets / active. Never the password — see pf_user_reset_password(). */
function pf_user_update($username, array $fields, $actor)
{
    $key  = pf_username_key($username);
    $data = pf_users_load();
    if (!isset($data['users'][$key])) {
        throw new InvalidArgumentException('No such user.');
    }
    $u = $data['users'][$key];

    $demoting     = array_key_exists('role', $fields) && $fields['role'] !== 'admin' && $u['role'] === 'admin';
    $deactivating = array_key_exists('active', $fields) && !$fields['active'] && !empty($u['active']);
    if (($demoting || $deactivating) && $u['role'] === 'admin' && !empty($u['active']) && pf_user_active_admin_count() <= 1) {
        throw new InvalidArgumentException('Cannot remove the last remaining admin account.');
    }

    if (array_key_exists('displayName', $fields)) {
        $dn = trim((string)$fields['displayName']);
        $u['displayName'] = $dn !== '' ? $dn : $u['username'];
    }
    if (array_key_exists('role', $fields)) {
        $u['role'] = $fields['role'] === 'admin' ? 'admin' : 'staff';
        if ($u['role'] === 'admin') {
            $u['outlets'] = array();
        }
    }
    if (array_key_exists('outlets', $fields) && $u['role'] !== 'admin') {
        $u['outlets'] = array_values(array_unique(array_map(function ($o) { return strtoupper(trim((string)$o)); }, (array)$fields['outlets'])));
    }
    if (array_key_exists('active', $fields)) {
        $u['active'] = (bool)$fields['active'];
    }
    $u['updatedAt'] = gmdate('c');
    $u['updatedBy'] = (string)$actor;
    $data['users'][$key] = $u;
    pf_users_save($data);

    if (array_key_exists('active', $fields) && !$fields['active']) {
        pf_sessions_revoke_all($key);   // deactivating logs them out everywhere immediately
    }
    return $u;
}

function pf_user_reset_password($username, $newPassword, $actor)
{
    if (strlen((string)$newPassword) < 8) {
        throw new InvalidArgumentException('Password must be at least 8 characters.');
    }
    $key  = pf_username_key($username);
    $data = pf_users_load();
    if (!isset($data['users'][$key])) {
        throw new InvalidArgumentException('No such user.');
    }
    $data['users'][$key]['passwordHash']      = password_hash((string)$newPassword, PASSWORD_DEFAULT);
    $data['users'][$key]['passwordChangedAt'] = gmdate('c');
    $data['users'][$key]['updatedBy']         = (string)$actor;
    pf_users_save($data);
    pf_sessions_revoke_all($key);   // old sessions can't be trusted with a changed password
}

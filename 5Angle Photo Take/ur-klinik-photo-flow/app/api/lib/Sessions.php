<?php
/**
 * Session tokens, replacing the old shared device key. One JSON file, outside the website
 * folder (next to config.php and users.json). Only a token's SHA-256 hash is ever stored —
 * same principle as a password hash — so the raw token (the actual bearer secret a phone
 * holds) can't be replayed even if this file were ever read by someone else.
 */

function pf_sessions_file()
{
    return dirname(pf_config_path()) . DIRECTORY_SEPARATOR . 'sessions.json';
}

function pf_sessions_load()
{
    $file = pf_sessions_file();
    if (!is_file($file)) {
        return array('v' => 1, 'sessions' => array());
    }
    $data = json_decode((string)@file_get_contents($file), true);
    return (is_array($data) && isset($data['sessions']) && is_array($data['sessions']))
         ? $data : array('v' => 1, 'sessions' => array());
}

function pf_sessions_save(array $data)
{
    $file = pf_sessions_file();
    $dir  = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0770, true)) {
        throw new RuntimeException("Cannot create {$dir}.");
    }
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $part = $file . '.part';
    if (@file_put_contents($part, $json, LOCK_EX) === false || !@rename($part, $file)) {
        @unlink($part);
        @file_put_contents($file, $json, LOCK_EX);
    }
}

/** How long a phone stays signed in before needing to log in again. */
function pf_session_days(array $cfg)
{
    return isset($cfg['session_days']) ? max(1, (int)$cfg['session_days']) : 30;
}

/** Issues a new token for this user, returning the raw token to give the phone. */
function pf_session_create($username, array $cfg)
{
    $raw  = bin2hex(random_bytes(32));
    $hash = hash('sha256', $raw);
    $data = pf_sessions_load();
    $now  = time();
    // Opportunistic cleanup of anything already expired, so the file doesn't grow forever.
    foreach ($data['sessions'] as $h => $s) {
        if (!isset($s['expiresAt']) || $s['expiresAt'] < $now) {
            unset($data['sessions'][$h]);
        }
    }
    $data['sessions'][$hash] = array(
        'username'  => pf_username_key($username),
        'createdAt' => $now,
        'expiresAt' => $now + 86400 * pf_session_days($cfg),
        'ip'        => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
    );
    pf_sessions_save($data);
    return $raw;
}

/** The username this raw token belongs to, or null if it's missing, unknown, or expired. */
function pf_session_username($rawToken)
{
    if ($rawToken === '') {
        return null;
    }
    $hash = hash('sha256', $rawToken);
    $data = pf_sessions_load();
    if (!isset($data['sessions'][$hash])) {
        return null;
    }
    $s = $data['sessions'][$hash];
    if (!isset($s['expiresAt']) || $s['expiresAt'] < time()) {
        return null;
    }
    return $s['username'];
}

/** Logout: revoke just this one token. */
function pf_session_revoke($rawToken)
{
    if ($rawToken === '') {
        return;
    }
    $hash = hash('sha256', $rawToken);
    $data = pf_sessions_load();
    if (isset($data['sessions'][$hash])) {
        unset($data['sessions'][$hash]);
        pf_sessions_save($data);
    }
}

/** Every session for this user, revoked at once — used when deactivating an account or
 * resetting its password, so an old, possibly-compromised session can't keep working. */
function pf_sessions_revoke_all($username)
{
    $key     = pf_username_key($username);
    $data    = pf_sessions_load();
    $changed = false;
    foreach ($data['sessions'] as $h => $s) {
        if (isset($s['username']) && $s['username'] === $key) {
            unset($data['sessions'][$h]);
            $changed = true;
        }
    }
    if ($changed) {
        pf_sessions_save($data);
    }
}

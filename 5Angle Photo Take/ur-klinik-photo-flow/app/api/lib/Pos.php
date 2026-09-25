<?php
/**
 * UR Klinik Photo Flow — where the POS plugs in.
 *
 * Until the POS is connected (config 'pos' => array('driver' => 'none')), the app runs from the
 * NAS alone: search finds customers by membership ID or by the name on their folder, and
 * Today's Customers lists who has been photographed today.
 *
 * Connecting the POS means writing ONE class — lib/pos/<Name>Pos.php — with the three methods
 * below, then setting 'driver' => '<Name>' in config.php. Nothing in the phone app changes.
 * lib/pos/SamplePos.php is a working example with made-up customers.
 */

interface PosSource
{
    /** Customers booked on $date ("2026-09-14", clinic time), in appointment order. */
    public function today($date);

    /** At most $limit customers whose name, phone number or membership ID matches $query. */
    public function search($query, $limit);

    /** One customer by membership ID in canonical form ("BM 4521"), or null. */
    public function find($id);
}

/*
 * Every method returns customers as plain arrays:
 *
 *   array(
 *     'id'        => 'BM 4521',        // required — any spacing; it is normalised
 *     'name'      => 'Lee Hui Wen',    // required
 *     'phone'     => '0123456789',     // optional — only the last 4 digits reach the phone
 *     'time'      => '6:30 PM',        // optional — appointment time, for today()
 *     'lastVisit' => '2026-08-12',     // optional
 *     'branch'    => 'BM',             // optional — outlet of today's appointment, for the outlet filter
 *     'status'    => 'arrived',        // optional — 'booked' or 'arrived'
 *   )
 */

/** The configured POS, or null when none is connected. */
function pf_pos(array $cfg)
{
    $driver = isset($cfg['pos']['driver']) ? (string)$cfg['pos']['driver'] : 'none';
    if ($driver === '' || strtolower($driver) === 'none') {
        return null;
    }
    if (!preg_match('/^[A-Za-z][A-Za-z0-9]{0,40}$/', $driver)) {
        throw new RuntimeException("Invalid POS driver name in config.php.");
    }
    $file = __DIR__ . '/pos/' . $driver . 'Pos.php';
    if (!is_file($file)) {
        throw new RuntimeException("POS driver file lib/pos/{$driver}Pos.php is missing.");
    }
    require_once $file;
    $class = $driver . 'Pos';
    $pos = new $class($cfg['pos'] + array('timezone' => isset($cfg['timezone']) ? $cfg['timezone'] : null));
    if (!($pos instanceof PosSource)) {
        throw new RuntimeException("{$class} does not implement PosSource.");
    }
    return $pos;
}

/** One POS record reduced to what the phone may see. Null if it has no usable membership ID. */
function pf_pos_customer($raw)
{
    if (!is_array($raw) || !isset($raw['id'])) {
        return null;
    }
    $id = pf_normalize_id($raw['id']);
    if ($id === null) {
        return null;
    }
    $digits = isset($raw['phone']) ? preg_replace('/\D/', '', (string)$raw['phone']) : '';
    return array(
        'id'         => $id,
        'name'       => isset($raw['name']) ? trim((string)$raw['name']) : '',
        'phoneLast4' => strlen($digits) >= 4 ? substr($digits, -4) : null,
        'time'       => isset($raw['time']) && $raw['time'] !== '' ? (string)$raw['time'] : null,
        'lastVisit'  => isset($raw['lastVisit']) && $raw['lastVisit'] !== '' ? (string)$raw['lastVisit'] : null,
        'branch'     => isset($raw['branch']) && $raw['branch'] !== '' ? strtoupper((string)$raw['branch']) : null,
        'status'     => isset($raw['status']) && $raw['status'] !== '' ? (string)$raw['status'] : null,
    );
}

/** A list of POS records, cleaned, without duplicate IDs. */
function pf_pos_customers($list)
{
    $out = array();
    if (!is_array($list)) {
        return $out;
    }
    foreach ($list as $raw) {
        $c = pf_pos_customer($raw);
        if ($c !== null && !isset($out[$c['id']])) {
            $out[$c['id']] = $c;
        }
    }
    return array_values($out);
}

/**
 * For drivers: call a JSON HTTP API. Throws with a readable message on any failure.
 *
 *   $data = pf_http_json('GET', 'https://pos.example/api/customers?q=' . rawurlencode($q),
 *                        array('Authorization: Bearer ' . $this->token));
 */
function pf_http_json($method, $url, array $headers = array(), $body = null, $timeout = 10)
{
    $ch = curl_init();
    $opts = array(
        CURLOPT_URL            => $url,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_HTTPHEADER     => array_merge(array('Accept: application/json'), $headers),
    );
    if ($body !== null) {
        $opts[CURLOPT_POSTFIELDS] = is_string($body) ? $body : json_encode($body);
        $opts[CURLOPT_HTTPHEADER][] = 'Content-Type: application/json';
    }
    curl_setopt_array($ch, $opts);
    $res  = curl_exec($ch);
    $err  = curl_error($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if (PHP_VERSION_ID < 80000) {
        curl_close($ch);
    }
    if ($res === false || $err !== '') {
        throw new RuntimeException('Could not reach the POS: ' . $err);
    }
    if ($http < 200 || $http >= 300) {
        throw new RuntimeException("The POS answered HTTP {$http}.");
    }
    $json = json_decode($res, true);
    if ($json === null && trim($res) !== 'null') {
        throw new RuntimeException('The POS answered with something other than JSON.');
    }
    return $json;
}

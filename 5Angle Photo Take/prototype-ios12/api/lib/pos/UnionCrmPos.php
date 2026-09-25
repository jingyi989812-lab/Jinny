<?php
/**
 * The clinic POS: 33crm "Union" (union.33crm.com). Two exports, both behind TK's token and the
 * POS web login (HTTP authentication):
 *
 * 1. The customer table — who everyone is:
 *      GET https://union.33crm.com/api/api_Table_getDataV2.aspx?token=…&tablename=CustomerXBI1
 *      JSON array, one object per customer (~40,000, ~22 MB):
 *      id, branchid, membershipno ("BM-4521"), customername, telmobile, … plus IC number, date of
 *      birth, address and more — none of which Photo Flow reads or keeps.
 *
 * 2. The appointment report — who is coming today:
 *      GET https://union.33crm.com/apiv2/API_GetData.aspx?token=…&reportname=Report_AppointmentList
 *      CSV: customerType, customername, customerID, followUpListID, appDate, starttime, endtime,
 *      status, branchID, newshowup   (~480,000 rows, the whole history, ~43 MB)
 *
 * How they join: the report's customerID is the table's `id` — one running number across all
 * outlets. The MEMBERSHIP number ("BM-4521") is different: it is counted per outlet, so GL-1560
 * and BM-1560 are two people. Photo folders are named by membership number, so every customer
 * the app shows carries it, taken from the table. pos-refresh.php prints how well the two
 * exports agree, so a wrong join shows up immediately instead of as misfiled photos.
 *
 * Only membership number, name, phone number and visit dates are kept, in a cache file outside
 * the website, refreshed every 'refresh_minutes' (Task Scheduler runs lib/pos-refresh.php).
 *
 * config.php:
 *   'pos' => array(
 *       'driver'          => 'UnionCrm',
 *       'token'           => '…',                 // from TK
 *       'username'        => '…',                 // POS web login, ideally one just for Photo Flow
 *       'password'        => '…',
 *       'cache_dir'       => 'C:\\photoflow-config\\pos-cache',
 *       'refresh_minutes' => 15,
 *       // Only if they ever change:
 *       // 'url'            => 'https://union.33crm.com/apiv2/API_GetData.aspx',
 *       // 'reportname'     => 'Report_AppointmentList',
 *       // 'customer_url'   => 'https://union.33crm.com/api/api_Table_getDataV2.aspx',
 *       // 'customer_table' => 'CustomerXBI1',
 *       // 'customer_token' => '…',              // if TK gave a different token for the table
 *   ),
 */
class UnionCrmPos implements PosSource
{
    const CACHE_VERSION = 2;

    private $cfg;
    private $data = null;

    public function __construct(array $cfg)
    {
        foreach (array('token', 'cache_dir') as $k) {
            if (empty($cfg[$k])) {
                throw new RuntimeException("POS config is missing '{$k}'.");
            }
        }
        $this->cfg = $cfg + array(
            'url'             => 'https://union.33crm.com/apiv2/API_GetData.aspx',
            'reportname'      => 'Report_AppointmentList',
            'customer_url'    => 'https://union.33crm.com/api/api_Table_getDataV2.aspx',
            'customer_table'  => 'CustomerXBI1',
            'customer_token'  => '',
            'username'        => '',
            'password'        => '',
            'refresh_minutes' => 15,
            'timeout'         => 180,
            'verify_tls'      => true,
            'params'          => array(),   // extra report parameters, e.g. a date filter if TK adds one
            'ignore_branches' => array('HQ', 'TEST'),
        );
        if ($this->cfg['customer_token'] === '') {
            $this->cfg['customer_token'] = $this->cfg['token'];
        }
    }

    /** Download now, whatever the cache says. For lib/pos-refresh.php (the scheduled task). */
    public function refreshNow()
    {
        $today = pf_today(array('timezone' => isset($this->cfg['timezone']) ? $this->cfg['timezone'] : null));
        $this->data = $this->refresh($today);
        return $this->data['stats'] + array('today' => count($this->data['today']), 'customers' => count($this->data['customers']));
    }

    public function today($date)
    {
        $d = $this->load($date);
        return $d['today'];
    }

    public function search($query, $limit)
    {
        $d = $this->load(null);
        $text = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$query));
        if ($text === '') {
            return array();
        }
        $id     = pf_normalize_id($query);
        $digits = preg_replace('/\D/', '', (string)$query);
        $number = ctype_digit($text) ? ltrim($text, '0') : null;   // "1560": that number at any outlet
        $exact = array();
        $hits  = array();
        foreach ($d['customers'] as $key => $c) {
            if ($id !== null) {
                if ($key === pf_id_key($id)) {
                    $exact[] = $this->customer($c);
                }
                continue;
            }
            if ($number !== null && pf_id_number($key) === $number) {
                $exact[] = $this->customer($c);
            } elseif (count($hits) < $limit
                      && (($number === null && strpos($c[4], $text) !== false)
                          || (strlen($digits) >= 4 && $c[2] !== '' && strpos($c[2], $digits) !== false))) {
                $hits[] = $this->customer($c);
            }
        }
        return array_slice(array_merge($exact, $hits), 0, $limit);
    }

    public function find($id)
    {
        $d = $this->load(null);
        $key = pf_id_key($id);
        return isset($d['customers'][$key]) ? $this->customer($d['customers'][$key]) : null;
    }

    // ------------------------------------------------------------------------

    /** customers[key] = array(membership ID, name, phone digits, last visit, name for searching) */
    private function customer(array $c)
    {
        return array('id' => $c[0], 'name' => $c[1], 'phone' => $c[2], 'lastVisit' => $c[3]);
    }

    private function cacheFile()
    {
        return rtrim($this->cfg['cache_dir'], '/\\') . DIRECTORY_SEPARATOR . 'appointments.json';
    }

    /** The cached, reduced report — refreshed when stale, or when the clinic date has moved on. */
    private function load($date)
    {
        if ($this->data !== null && ($date === null || $this->data['date'] === $date)) {
            return $this->data;
        }
        $today = pf_today(array('timezone' => isset($this->cfg['timezone']) ? $this->cfg['timezone'] : null));
        $file  = $this->cacheFile();
        $cache = is_file($file) ? json_decode((string)@file_get_contents($file), true) : null;
        $fresh = is_array($cache) && isset($cache['v'], $cache['date'], $cache['built'])
              && $cache['v'] === self::CACHE_VERSION && $cache['date'] === $today
              && time() - $cache['built'] < 60 * max(1, (int)$this->cfg['refresh_minutes']);

        if (!$fresh) {
            $dir = dirname($file);
            if (!is_dir($dir) && !@mkdir($dir, 0770, true)) {
                throw new RuntimeException("Cannot create the POS cache folder {$dir}.");
            }
            // One download at a time. While another request is refreshing, use the old copy if
            // it is from today; otherwise wait for the download to finish.
            $lock = fopen($file . '.lock', 'c');
            $usable = is_array($cache) && isset($cache['date']) && $cache['date'] === $today;
            if ($lock && flock($lock, $usable ? LOCK_EX | LOCK_NB : LOCK_EX)) {
                $again = is_file($file) ? json_decode((string)@file_get_contents($file), true) : null;
                if (is_array($again) && isset($again['built']) && (!is_array($cache) || $again['built'] > $cache['built'])) {
                    $cache = $again;   // someone else just refreshed it
                } else {
                    try {
                        $cache = $this->refresh($today);
                    } catch (Exception $e) {
                        flock($lock, LOCK_UN);
                        fclose($lock);
                        if ($usable) {
                            error_log('[photoflow] POS refresh failed, using older copy: ' . $e->getMessage());
                            $this->data = $cache;
                            return $cache;
                        }
                        throw $e;
                    }
                }
                flock($lock, LOCK_UN);
            }
            if ($lock) {
                fclose($lock);
            }
            if (!is_array($cache) || !isset($cache['today'])) {
                throw new RuntimeException('POS data is not available yet.');
            }
        }
        $this->data = $cache;
        return $cache;
    }

    private function refresh($today)
    {
        // The report is large. On Windows, max_execution_time counts download time too.
        @set_time_limit((int)$this->cfg['timeout'] + 60);
        $dir  = dirname($this->cacheFile());
        $tTmp = tempnam($dir, 'cus');
        $aTmp = tempnam($dir, 'app');
        try {
            // Customers first: without membership numbers, no appointment can be filed correctly.
            $this->download($this->cfg['customer_url'], array('token' => $this->cfg['customer_token'],
                            'tablename' => $this->cfg['customer_table']), $tTmp, 'membershipno', 'customer table');
            $table = $this->readCustomers($tTmp);
            @unlink($tTmp);
            $this->download($this->cfg['url'], array_merge(array('token' => $this->cfg['token'],
                            'reportname' => $this->cfg['reportname']), (array)$this->cfg['params']),
                            $aTmp, 'customerID', 'appointment report');
            $data = $this->reduce($aTmp, $today, $table);
        } catch (Exception $e) {
            @unlink($tTmp);
            @unlink($aTmp);
            throw $e;
        }
        @unlink($aTmp);
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Could not encode POS data: ' . json_last_error_msg());
        }
        $part = $this->cacheFile() . '.part';
        if (@file_put_contents($part, $json) === false || !@rename($part, $this->cacheFile())) {
            // rename over an existing file can fail on Windows; fall back to a direct write
            @unlink($part);
            if (@file_put_contents($this->cacheFile(), $json, LOCK_EX) === false) {
                throw new RuntimeException('Cannot write the POS cache file.');
            }
        }
        return $data;
    }

    private function download($baseUrl, array $query, $toFile, $mustContain, $what)
    {
        $url = $baseUrl . (strpos($baseUrl, '?') === false ? '?' : '&')
             . http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        $fh = fopen($toFile, 'wb');
        $ch = curl_init();
        $opts = array(
            CURLOPT_URL            => $url,
            CURLOPT_FILE           => $fh,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_TIMEOUT        => (int)$this->cfg['timeout'],
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => (bool)$this->cfg['verify_tls'],
            CURLOPT_SSL_VERIFYHOST => $this->cfg['verify_tls'] ? 2 : 0,
            CURLOPT_ENCODING       => '',   // accept gzip: the CSV compresses ~10x
        );
        if ($this->cfg['username'] !== '') {
            // The site's sign-in box is HTTP authentication; let cURL pick Basic, Digest or NTLM.
            $opts[CURLOPT_HTTPAUTH] = CURLAUTH_ANY;
            $opts[CURLOPT_USERPWD]  = $this->cfg['username'] . ':' . $this->cfg['password'];
        }
        curl_setopt_array($ch, $opts);
        $ok   = curl_exec($ch);
        $err  = curl_error($ch);
        $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (PHP_VERSION_ID < 80000) {
            curl_close($ch);
        }
        fclose($fh);

        if ($ok === false || $err !== '') {
            throw new RuntimeException("Could not reach the POS for the {$what}: " . $err);
        }
        if ($http === 401 || $http === 403) {
            throw new RuntimeException("The POS refused the login for the {$what} (HTTP {$http}) — check username, password and token.");
        }
        if ($http !== 200) {
            throw new RuntimeException("The POS answered HTTP {$http} for the {$what}.");
        }
        $head = (string)@file_get_contents($toFile, false, null, 0, 2000);
        if (stripos($head, $mustContain) === false) {
            throw new RuntimeException("The POS did not send the {$what} (wrong token, or its name changed?).");
        }
    }

    /**
     * The customer table, one object at a time (json_decode on the whole 22 MB would need several
     * hundred MB of memory). Keeps membership number, name and phone number; everything else in
     * the table — IC number, birthday, address — is dropped on the spot.
     *
     * Returns array(
     *   'byPosId'   => array(table id => ID key),
     *   'customers' => array(ID key => array(membership ID, name, phone digits, null, search name)),
     *   'stats'     => counts for pos-refresh.php)
     */
    private function readCustomers($file)
    {
        $byPosId = array();
        $customers = array();
        $seen = array();
        $stats = array('tableRows' => 0, 'badMembershipNo' => 0, 'sharedMembershipNo' => 0);
        $ignore = array_map('strtoupper', (array)$this->cfg['ignore_branches']);

        foreach (self::jsonObjects($file) as $r) {
            $stats['tableRows']++;
            if (!isset($r['id'], $r['membershipno'])) {
                continue;
            }
            $id = pf_normalize_id($r['membershipno']);
            $branch = isset($r['branchid']) ? strtoupper(trim((string)$r['branchid'])) : '';
            if ($id === null || in_array($branch, $ignore, true)) {
                $stats['badMembershipNo'] += $id === null ? 1 : 0;
                continue;
            }
            $key = pf_id_key($id);
            if (isset($seen[$key])) {
                // Two customers share one membership number: which folder is whose is unknowable.
                // Leave both out, so neither can be picked from a list — a person has to sort it.
                $stats['sharedMembershipNo']++;
                unset($customers[$key]);
                $byPosId[(string)$r['id']] = null;
                if ($seen[$key] !== true) {
                    $byPosId[$seen[$key]] = null;
                }
                $seen[$key] = true;
                continue;
            }
            $seen[$key] = (string)$r['id'];
            $name = isset($r['customername']) ? trim(preg_replace('/\s+/u', ' ', str_replace("\xC2\xA0", ' ', (string)$r['customername']))) : '';
            $phone = isset($r['telmobile']) ? preg_replace('/\D/', '', (string)$r['telmobile']) : '';
            $byPosId[(string)$r['id']] = $key;
            $customers[$key] = array($id, $name, $phone, null, strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $name)));
        }
        if (count($customers) === 0) {
            throw new RuntimeException('The customer table had no usable customers — has its format changed?');
        }
        $stats['tableCustomers'] = count($customers);
        return array('byPosId' => $byPosId, 'customers' => $customers, 'stats' => $stats);
    }

    /** Yields each top-level object of a JSON array file, reading it in small pieces. */
    private static function jsonObjects($file)
    {
        $fh = fopen($file, 'rb');
        if (!$fh) {
            throw new RuntimeException('Cannot read the downloaded customer table.');
        }
        $depth = 0; $inStr = false; $esc = false; $buf = ''; $started = false;
        while (!feof($fh)) {
            $chunk = fread($fh, 262144);
            $len = strlen($chunk);
            $from = 0;
            for ($i = 0; $i < $len; $i++) {
                $ch = $chunk[$i];
                if ($inStr) {
                    if ($esc) { $esc = false; } elseif ($ch === '\\') { $esc = true; } elseif ($ch === '"') { $inStr = false; }
                    continue;
                }
                if ($ch === '"') {
                    $inStr = true;
                } elseif ($ch === '{' || $ch === '[') {
                    if ($ch === '[' && $depth === 0) { $started = true; }
                    if ($ch === '{' && $depth === 1) { $buf = ''; $from = $i; }
                    $depth++;
                } elseif ($ch === '}' || $ch === ']') {
                    $depth--;
                    if ($ch === '}' && $depth === 1) {
                        $obj = json_decode($buf . substr($chunk, $from, $i - $from + 1), true);
                        $buf = '';
                        $from = $len;
                        if (is_array($obj)) {
                            yield $obj;
                        }
                    }
                }
            }
            if ($depth >= 2) {
                $buf .= substr($chunk, $from);   // an object continues into the next piece
            }
        }
        fclose($fh);
        if (!$started) {
            throw new RuntimeException('The customer table is not a JSON list.');
        }
    }

    /**
     * Stream the appointment CSV once. Keeps today's appointments and each customer's last visit,
     * and joins both to the customer table through customerID.
     */
    private function reduce($file, $today, array $table)
    {
        // No escape character (plain RFC 4180 CSV); PHP before 7.4 insists on one.
        $esc = PHP_VERSION_ID >= 70400 ? '' : '\\';
        $fh = fopen($file, 'rb');
        $bom = fread($fh, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($fh);
        }
        $header = fgetcsv($fh, 0, ',', '"', $esc);
        if (!$header) {
            throw new RuntimeException('The POS report is empty.');
        }
        $col = array();
        foreach ($header as $i => $h) {
            $col[strtolower(trim($h))] = $i;
        }
        foreach (array('customertype', 'customername', 'customerid', 'appdate', 'starttime', 'status', 'branchid') as $need) {
            if (!isset($col[$need])) {
                throw new RuntimeException("The POS report has no '{$need}' column — has its format changed?");
            }
        }
        $ignore  = array_map('strtoupper', (array)$this->cfg['ignore_branches']);
        $arrived = array('SHOWUP' => 1, 'NEWSHOWUP' => 1, 'DONE' => 1);
        $gone    = array('CANCEL' => 1, 'DELETED' => 1);
        $byPosId   = $table['byPosId'];
        $customers = $table['customers'];
        $stats = $table['stats'] + array('todayUnmatched' => 0, 'todayNamesChecked' => 0, 'todayNamesAgree' => 0);

        $todays = array();
        while (($row = fgetcsv($fh, 0, ',', '"', $esc)) !== false) {
            if (count($row) < count($header) || strtoupper($row[$col['customertype']]) !== 'CUSTOMER') {
                continue;
            }
            $posId = ltrim(trim($row[$col['customerid']]), '0');
            if ($posId === '' || !ctype_digit($posId)) {
                continue;
            }
            $d = DateTime::createFromFormat('!d/M/Y', trim($row[$col['appdate']]));
            if (!$d) {
                continue;
            }
            $date   = $d->format('Y-m-d');
            $status = strtoupper(trim($row[$col['status']]));
            $branch = strtoupper(trim($row[$col['branchid']]));
            $key    = isset($byPosId[$posId]) ? $byPosId[$posId] : null;

            if ($key !== null && isset($arrived[$status]) && $date <= $today
                && ($customers[$key][3] === null || $date > $customers[$key][3])) {
                $customers[$key][3] = $date;   // last visit
            }
            if ($date !== $today || isset($gone[$status]) || $branch === '' || in_array($branch, $ignore, true)) {
                continue;
            }
            if ($key === null) {
                $stats['todayUnmatched']++;   // not in the customer table: no membership number to file under
                continue;
            }
            $apptName = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $row[$col['customername']]));
            if ($apptName !== '') {
                $stats['todayNamesChecked']++;
                $tableName = $customers[$key][4];
                if ($tableName !== '' && (strpos($tableName, $apptName) !== false || strpos($apptName, $tableName) !== false)) {
                    $stats['todayNamesAgree']++;
                }
            }
            $todays[] = array('key' => $key, 'branch' => $branch, 'start' => trim($row[$col['starttime']]),
                              'status' => isset($arrived[$status]) ? 'arrived' : 'booked');
        }
        fclose($fh);

        // The join is the one thing that must never silently be wrong: it decides which
        // membership number — and so which folder — today's customers are shown with.
        if ($stats['todayNamesChecked'] >= 10 && $stats['todayNamesAgree'] < 0.6 * $stats['todayNamesChecked']) {
            throw new RuntimeException("Only {$stats['todayNamesAgree']} of {$stats['todayNamesChecked']} of today's appointment "
                . "names match the customer table. customerID may not be the table's id — POS data not used.");
        }

        usort($todays, function ($a, $b) { return (int)$a['start'] - (int)$b['start']; });
        $today_out = array();
        $seen = array();
        foreach ($todays as $t) {
            $k = $t['key'] . '@' . $t['branch'];
            if (isset($seen[$k])) {
                continue;   // two appointments the same day at the same outlet: list once, earliest
            }
            $seen[$k] = true;
            $c = $customers[$t['key']];
            $today_out[] = array('id' => $c[0], 'name' => $c[1], 'phone' => $c[2], 'time' => self::clock($t['start']),
                                 'branch' => $t['branch'], 'status' => $t['status'], 'lastVisit' => $c[3]);
        }
        return array('v' => self::CACHE_VERSION, 'built' => time(), 'date' => $today,
                     'today' => $today_out, 'customers' => $customers, 'stats' => $stats);
    }

    /** "1030" -> "10:30 AM" */
    private static function clock($hhmm)
    {
        $s = str_pad(preg_replace('/\D/', '', (string)$hhmm), 4, '0', STR_PAD_LEFT);
        $h = (int)substr($s, 0, 2);
        $m = substr($s, 2, 2);
        if ($h > 23) {
            return '';
        }
        return ($h % 12 === 0 ? 12 : $h % 12) . ':' . $m . ($h < 12 ? ' AM' : ' PM');
    }
}

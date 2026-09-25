<?php
/**
 * UR Klinik Photo Flow — minimal Synology File Station client.
 *
 * Built on the three calls Eric proved against the clinic NAS in test.php
 * (SYNO.API.Auth login, SYNO.FileStation.CreateFolder, SYNO.FileStation.Upload),
 * hardened for use behind a web endpoint instead of a one-off script:
 *
 *   - login is sent as POST, so the password never appears in a URL or DSM's access log
 *   - every request logs out when it's done, instead of leaving a session open per run
 *   - DSM error codes become messages IT can act on
 *   - uploads don't overwrite by default, so a retried upload is harmless
 *
 * Targets PHP 7.2+.
 */

class SynologyException extends RuntimeException
{
    /** @var int[] per-file codes DSM sometimes adds under error.errors */
    private $detailCodes;

    public function __construct($message, $code = 0, array $detailCodes = array())
    {
        parent::__construct($message, $code);
        $this->detailCodes = $detailCodes;
    }

    public function hasCode($code)
    {
        return $this->getCode() === $code || in_array($code, $this->detailCodes, true);
    }
}

class SynologyFileStation
{
    private $endpoint;
    private $account;
    private $password;
    private $verifyTls;
    private $caFile;
    private $timeout;
    private $sid = null;

    public function __construct(array $cfg)
    {
        foreach (array('host', 'port', 'account', 'password') as $k) {
            if (empty($cfg[$k])) {
                throw new InvalidArgumentException("NAS config is missing '{$k}'.");
            }
        }
        $scheme = isset($cfg['scheme']) ? $cfg['scheme'] : 'https';
        $this->endpoint  = sprintf('%s://%s:%s/webapi/entry.cgi', $scheme, $cfg['host'], $cfg['port']);
        $this->account   = $cfg['account'];
        $this->password  = $cfg['password'];
        $this->verifyTls = isset($cfg['verify_tls']) ? (bool)$cfg['verify_tls'] : true;
        $this->caFile    = isset($cfg['tls_ca_file']) ? $cfg['tls_ca_file'] : null;
        $this->timeout   = isset($cfg['timeout']) ? (int)$cfg['timeout'] : 60;
    }

    public function __destruct()
    {
        $this->logout();
    }

    public function login()
    {
        if ($this->sid !== null) {
            return;
        }
        $res = $this->request(array(
            'api'     => 'SYNO.API.Auth',
            'version' => '6',
            'method'  => 'login',
            'account' => $this->account,
            'passwd'  => $this->password,
            'session' => 'FileStation',
            'format'  => 'sid',
        ), 'post', 'auth');

        if (empty($res['data']['sid'])) {
            throw new SynologyException('Logged in, but the NAS returned no session ID.');
        }
        $this->sid = $res['data']['sid'];
    }

    public function logout()
    {
        if ($this->sid === null) {
            return;
        }
        try {
            $this->request(array(
                'api' => 'SYNO.API.Auth', 'version' => '6', 'method' => 'logout', 'session' => 'FileStation',
            ));
        } catch (Exception $e) {
            // the session expires on its own
        }
        $this->sid = null;
    }

    /** Create $parent/$name and any missing parents. A folder that already exists is fine. */
    public function ensureFolder($parent, $name)
    {
        try {
            $this->request(array(
                'api'          => 'SYNO.FileStation.CreateFolder',
                'version'      => '2',
                'method'       => 'create',
                'folder_path'  => $parent,
                'name'         => $name,
                'force_parent' => 'true',
            ));
        } catch (SynologyException $e) {
            if (!$e->hasCode(414)) {
                throw $e;
            }
        }
    }

    /**
     * Names of ALL the sub-folders of $parent. Callers filter.
     *
     * $pattern is accepted but deliberately not sent: on the clinic NAS's DSM build,
     * SYNO.FileStation.List fails instantly (HTTP 502, empty body) whenever 'pattern' is in the
     * request, at every API version it supports — found by Eric with list-test.php, Sep 2026.
     * A plain listing works. pf_folder_index() caches the result, so this runs rarely.
     */
    public function listFolderNames($parent, $pattern = '')
    {
        // Page through, so a short number like "12" that matches thousands of folders
        // can't silently cut off the one we need — that would start a duplicate folder.
        $names  = array();
        $offset = 0;
        $page   = 1000;
        do {
            $res = $this->request(array(
                'api'         => 'SYNO.FileStation.List',
                'version'     => '2',
                'method'      => 'list',
                'folder_path' => $parent,
                'filetype'    => 'dir',
                'offset'      => (string)$offset,
                'limit'       => (string)$page,
            ));
            $files = (!empty($res['data']['files']) && is_array($res['data']['files'])) ? $res['data']['files'] : array();
            foreach ($files as $f) {
                if (isset($f['name'])) {
                    $names[] = (string)$f['name'];
                }
            }
            $offset += count($files);
            $total = isset($res['data']['total']) ? (int)$res['data']['total'] : 0;
        } while (count($files) === $page && $offset < $total);
        return $names;
    }

    public function folderExists($path)
    {
        $res = $this->request(array(
            'api'     => 'SYNO.FileStation.List',
            'version' => '2',
            'method'  => 'getinfo',
            'path'    => $path,
        ));
        $f = isset($res['data']['files'][0]) ? $res['data']['files'][0] : null;
        return $f !== null && !isset($f['code']) && !empty($f['isdir']);
    }

    /**
     * The bytes of a file on the NAS, or null if it isn't there.
     */
    public function download($path)
    {
        $r = $this->request(array(
            'api'     => 'SYNO.FileStation.Download',
            'version' => '2',
            'method'  => 'download',
            'path'    => $path,
            'mode'    => 'download',
        ), 'get', 'file', null, true);

        if ($r['http'] === 404) {
            return null;
        }
        // A missing file comes back as a JSON error, not as the file.
        if (stripos($r['type'], 'json') !== false || ($r['body'] !== '' && $r['body'][0] === '{')) {
            $json = json_decode($r['body'], true);
            if (is_array($json) && empty($json['success'])) {
                $code = isset($json['error']['code']) ? (int)$json['error']['code'] : 0;
                if ($code === 408) {
                    return null;
                }
                throw new SynologyException(self::describe($code, array(), 'file'), $code);
            }
        }
        if ($r['http'] !== 200) {
            throw new SynologyException("The NAS could not send that file (HTTP {$r['http']}).");
        }
        return $r['body'];
    }

    /**
     * Upload a local file into $folder as $fileName. Returns "saved", or "exists"
     * when overwrite is off and the file is already there.
     */
    public function upload($folder, $localPath, $fileName, $mime, $overwrite)
    {
        // Text fields must come before the file part, or DSM rejects the upload.
        $fields = array(
            'path'             => $folder,
            'dest_folder_path' => $folder,   // the alias test.php also sent; harmless where unused
            'create_parents'   => 'true',
            'overwrite'        => $overwrite ? 'true' : 'false',
            'file'             => new CURLFile($localPath, $mime, $fileName),
        );
        try {
            $this->request(
                array('api' => 'SYNO.FileStation.Upload', 'version' => '2', 'method' => 'upload'),
                'multipart', 'file', $fields
            );
        } catch (SynologyException $e) {
            if ($e->hasCode(414) || $e->hasCode(1805)) {
                return 'exists';
            }
            throw $e;
        }
        return 'saved';
    }

    // ------------------------------------------------------------------------

    /**
     * @param string $via  "get" | "post" | "multipart" — get and multipart match Eric's proven
     *                     calls exactly; post is used only for login, to keep the password out of URLs
     */
    private function request(array $params, $via = 'get', $context = 'file', $multipart = null, $raw = false)
    {
        if ($this->sid !== null) {
            $params['_sid'] = $this->sid;
        }
        // RFC 3986: DSM wants %20, not +, for the spaces in "UR-GY Customer Data".
        $query = http_build_query($params, '', '&', PHP_QUERY_RFC3986);

        $opts = array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => $this->timeout,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => $this->verifyTls,
            CURLOPT_SSL_VERIFYHOST => $this->verifyTls ? 2 : 0,
        );
        if ($this->caFile) {
            $opts[CURLOPT_CAINFO] = $this->caFile;
        }
        if ($via === 'post') {
            $opts[CURLOPT_URL]        = $this->endpoint;
            $opts[CURLOPT_POST]       = true;
            $opts[CURLOPT_POSTFIELDS] = $query;
        } elseif ($via === 'multipart') {
            $opts[CURLOPT_URL]        = $this->endpoint . '?' . $query;
            $opts[CURLOPT_POST]       = true;
            $opts[CURLOPT_POSTFIELDS] = $multipart;
        } else {
            $opts[CURLOPT_URL] = $this->endpoint . '?' . $query;
        }

        $ch = curl_init();
        curl_setopt_array($ch, $opts);
        $body = curl_exec($ch);
        $err  = curl_error($ch);
        $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        if (PHP_VERSION_ID < 80000) {
            curl_close($ch);   // a no-op since PHP 8, and deprecated in 8.5
        }

        if ($body === false || $err !== '') {
            throw new SynologyException('Could not reach the NAS: ' . $err
                . ' — is this server connected to Tailscale?');
        }
        if ($raw) {
            return array('http' => $http, 'type' => $type, 'body' => (string)$body);
        }
        $json = json_decode($body, true);
        if (!is_array($json)) {
            throw new SynologyException("The NAS replied with something other than JSON (HTTP {$http}).");
        }
        if (empty($json['success'])) {
            $code = isset($json['error']['code']) ? (int)$json['error']['code'] : 0;
            $details = array();
            if (!empty($json['error']['errors']) && is_array($json['error']['errors'])) {
                foreach ($json['error']['errors'] as $e) {
                    if (isset($e['code'])) {
                        $details[] = (int)$e['code'];
                    }
                }
            }
            throw new SynologyException(self::describe($code, $details, $context), $code, $details);
        }
        return $json;
    }

    private static function describe($code, array $details, $context)
    {
        $auth = array(
            400 => 'Wrong NAS username or password',
            401 => 'The NAS account is disabled',
            402 => 'The NAS account is not allowed to use File Station',
            403 => 'The NAS account has 2-step verification on — service accounts must not',
            404 => '2-step verification failed',
            407 => 'DSM auto-block has blocked this server after too many failed logins',
        );
        $common = array(
            105  => 'The NAS account has no permission for this folder',
            106  => 'NAS session timed out',
            107  => 'NAS session was ended by a login elsewhere',
            119  => 'NAS session is no longer valid',
            408  => 'Folder not found on the NAS — check base_path in config.php',
            414  => 'File already exists',
            415  => 'NAS disk quota is full',
            416  => 'NAS is out of space',
            418  => 'The NAS rejected the folder or file name',
            419  => 'The NAS rejected the file name',
            1100 => 'The NAS could not create the folder',
            1101 => 'Too many folders in that location',
            1804 => 'The photo is bigger than the NAS allows',
            1805 => 'A file with that name already exists',
        );
        $all = array_merge(array($code), $details);
        if ($context === 'auth') {
            foreach ($all as $c) {
                if (isset($auth[$c])) {
                    return "{$auth[$c]} (DSM code {$c}).";
                }
            }
        }
        foreach ($all as $c) {
            if (isset($common[$c])) {
                return "{$common[$c]} (DSM code {$c}).";
            }
        }
        return "The NAS returned error code {$code}" . ($details ? ' (' . implode(', ', $details) . ')' : '') . '.';
    }
}

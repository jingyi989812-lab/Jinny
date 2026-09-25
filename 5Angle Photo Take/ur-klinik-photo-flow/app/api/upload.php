<?php
/**
 * Save one photo to the NAS.
 *
 * The phone says WHO (membership ID + name), WHICH (phase, angle) and WHEN (session stamp).
 * It never sends a folder path. This file finds the customer's existing folder by membership
 * ID — whatever the name part says — so a nickname or a spelling difference can never start
 * a second folder for the same person.
 *
 *   <base_path>/BM 6830 LIM SU ANN (JESSIE)/<yyyy-mm-dd>/<BEFORE|AFTER>/<n-ANGLE>_<hhmmss>.jpg
 *
 * With the BEFORE front photo the phone also sends "reference", a small copy of it, saved as
 * <customer folder>/_reference.jpg — what the therapist sees next visit to recognise the customer.
 */
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/SynologyFileStation.php';

pf_method('POST');
$me  = pf_require_login();
$cfg = pf_config();

$angles  = pf_angles();
$id      = pf_normalize_id(isset($_POST['customerId']) ? $_POST['customerId'] : '');
$name    = pf_clean_name(isset($_POST['customerName']) ? $_POST['customerName'] : '');
$phase   = isset($_POST['phase'])   ? strtoupper(trim((string)$_POST['phase'])) : '';
$angle   = isset($_POST['angle'])   ? strtolower(trim((string)$_POST['angle'])) : '';
$session = isset($_POST['session']) ? trim((string)$_POST['session']) : '';
// Photos that aren't one of the five face angles — a hand, a leg, a back. One group per label
// the therapist typed, numbered within the group: 6-LEFT-HAND-01_143020.jpg
$extra   = $angle === 'extra';
$group   = isset($_POST['group']) ? (int)$_POST['group'] : 0;
$seq     = isset($_POST['seq'])   ? (int)$_POST['seq']   : 0;
$label   = $extra ? pf_clean_label(isset($_POST['label']) ? $_POST['label'] : '') : '';
// A photo retaken after it already reached the NAS replaces the earlier file of the same session.
$replace = isset($_POST['replace']) && $_POST['replace'] === '1';

if ($id === null)                              pf_fail(400, 'That is not a membership ID (expected something like BM 4521).');
if ($phase !== 'BEFORE' && $phase !== 'AFTER') pf_fail(400, 'Phase must be BEFORE or AFTER.');
if (!$extra && !isset($angles[$angle]))        pf_fail(400, 'Unknown angle.');
if ($extra && ($group < 1 || $group > 99))     pf_fail(400, 'Invalid photo group.');
if ($extra && ($seq < 1 || $seq > 99))         pf_fail(400, 'Invalid photo number.');
if (!preg_match(PF_SESSION_RE, $session))      pf_fail(400, 'Invalid session stamp.');

// ---- the photo ----
if (empty($_FILES['photo'])) {
    // An empty $_FILES on a real POST nearly always means post_max_size was exceeded.
    pf_fail(413, 'No photo arrived. The server upload limit is probably too low — see api/.user.ini.');
}
$f = $_FILES['photo'];
if ($f['error'] !== UPLOAD_ERR_OK) {
    $why = array(
        UPLOAD_ERR_INI_SIZE   => 'Photo is bigger than upload_max_filesize on the server.',
        UPLOAD_ERR_FORM_SIZE  => 'Photo is too big.',
        UPLOAD_ERR_PARTIAL    => 'Only part of the photo arrived — the connection dropped. Try again.',
        UPLOAD_ERR_NO_FILE    => 'No photo arrived.',
        UPLOAD_ERR_NO_TMP_DIR => 'The server has no temp folder for uploads.',
        UPLOAD_ERR_CANT_WRITE => 'The server could not write the upload to disk.',
    );
    pf_fail($f['error'] === UPLOAD_ERR_INI_SIZE ? 413 : 400,
            isset($why[$f['error']]) ? $why[$f['error']] : 'Upload failed.');
}
if (!is_uploaded_file($f['tmp_name'])) {
    pf_fail(400, 'Upload failed.');
}
$maxMb = isset($cfg['max_upload_mb']) ? (int)$cfg['max_upload_mb'] : 15;
if ($f['size'] > $maxMb * 1048576) {
    pf_fail(413, "Photo is bigger than {$maxMb} MB.");
}
$ext  = array('image/jpeg' => 'jpg', 'image/png' => 'png');
$mime = pf_sniff_mime($f['tmp_name']);
if (!isset($ext[$mime])) {
    pf_fail(415, 'Photo must be a JPEG or PNG.');
}

// ---- the small reference copy (optional; only kept for BEFORE front) ----
$ref = null;
if ($phase === 'BEFORE' && $angle === 'front' && !empty($_FILES['reference'])
    && $_FILES['reference']['error'] === UPLOAD_ERR_OK && is_uploaded_file($_FILES['reference']['tmp_name'])
    && $_FILES['reference']['size'] <= 2 * 1048576
    && pf_sniff_mime($_FILES['reference']['tmp_name']) === 'image/jpeg') {
    $ref = $_FILES['reference']['tmp_name'];
}

$outlet = pf_outlet_code($id);
pf_require_outlet($me, $outlet);
$nasCfg = pf_nas_config($cfg, $outlet);
if ($nasCfg === null) {
    pf_fail(400, "No NAS is configured for outlet \"{$outlet}\".");
}
$base = rtrim($nasCfg['base_path'], '/');
$date = pf_today($cfg);

try {
    $nas = new SynologyFileStation($nasCfg);
    $nas->login();

    // ---- find the customer's folder by membership ID ----
    $matches = pf_customer_folders($nas, $base, $id, $cfg, true);

    if (count($matches) > 1) {
        // Guessing here is how photos end up in the wrong folder. Stop and make a person decide.
        $nas->logout();
        pf_fail(409, "There are " . count($matches) . " folders for {$id} (" . implode(' / ', $matches)
            . "). Ask IT to merge them into one, then save again.");
    }
    if (count($matches) === 1) {
        $customerFolder = $matches[0];
        $created = false;
    } else {
        if ($name === '') {
            $nas->logout();
            pf_fail(400, "No folder exists for {$id} yet, and no customer name was sent to create one.");
        }
        $customerFolder = "{$id} {$name}";
        $created = true;
    }

    // ---- save ----
    $customerPath = "{$base}/{$customerFolder}";
    $parent       = "{$customerPath}/{$date}";
    $folder       = "{$parent}/{$phase}";
    // The session stamp keeps two sessions on the same day apart, while a retry of the same
    // session reuses the name and is skipped instead of duplicated.
    $fileName = ($extra ? sprintf('%d-%s-%02d', $group, $label, $seq) : $angles[$angle])
              . '_' . $session . '.' . $ext[$mime];

    $nas->ensureFolder($parent, $phase);
    if ($created) {
        pf_folder_index_add($nas, $cfg, $base, $customerFolder);
    }
    $result = $nas->upload($folder, $f['tmp_name'], $fileName, $mime, $replace);

    // The front BEFORE shot is also this customer's reference photo for their next visit.
    // Prefer the small copy: the phone downloads it every time the customer is looked up.
    if ($phase === 'BEFORE' && $angle === 'front') {
        try {
            if ($ref !== null) {
                $nas->upload($customerPath, $ref, '_reference.jpg', 'image/jpeg', true);
            } else {
                $nas->upload($customerPath, $f['tmp_name'], '_reference.' . $ext[$mime], $mime, true);
            }
        } catch (Exception $e) {
            error_log("[photoflow] reference photo not updated for {$id}: " . $e->getMessage());
        }
    }
    $nas->logout();
} catch (Exception $e) {
    error_log("[photoflow] upload failed for {$id} {$phase} {$angle}: " . $e->getMessage());
    pf_fail(502, 'Could not save to the NAS: ' . $e->getMessage());
}

pf_audit($cfg, array(
    'event'          => 'photo.saved',
    'username'       => $me['username'],
    'customerId'     => $id,
    'customerFolder' => $customerFolder,
    'folderCreated'  => $created,
    'phase'          => $phase,
    'angle'          => $angle,
    'group'          => $extra ? $group : null,
    'seq'            => $extra ? $seq : null,
    'label'          => $extra ? $label : null,
    'path'           => "{$folder}/{$fileName}",
    'bytes'          => (int)$f['size'],
    'result'         => $result,
    'replaced'       => $replace,
    'ip'             => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : null,
));

pf_json(201, array(
    'ok'             => true,
    'result'         => $result,          // "saved", or "exists" when a retry found it already there
    'customerFolder' => $customerFolder,  // the real folder used — may carry a nickname the phone didn't know
    'folderCreated'  => $created,
    'folder'         => $folder,
    'file'           => $fileName,
    'label'          => $extra ? $label : null,
));

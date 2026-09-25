<?php
/**
 * UR Klinik Photo Flow — server configuration.
 *
 * COPY THIS FILE OUTSIDE THE WEBSITE FOLDER, to:
 *     C:\photoflow-config\config.php
 * or anywhere else, and set the PHOTOFLOW_CONFIG environment variable to its full path.
 *
 * It holds NAS and POS passwords. It must never sit inside a folder IIS serves,
 * and must never be sent over WhatsApp or email.
 */
return array(

    // How long a phone stays signed in before needing to log in again. Staff sign in with
    // their own account now (see docs/ADMIN.md) — there is no shared device key anymore.
    'session_days' => 30,

    'nas' => array(
        // Shared by every outlet's NAS — every outlet clinic uses the same account, port and
        // scheme, so this is set once here rather than repeated per outlet.
        'scheme'      => 'https',
        'port'        => 7329,
        'account'     => 'svc_photoflow',          // a dedicated service account, not a person's
        'password'    => 'replace-me',

        // TLS certificate checking. Eric's test switched it off because the NAS uses a
        // self-signed certificate. The link runs over Tailscale, which already encrypts it
        // end to end, so leaving it off is tolerable for now. To switch it on, export the
        // NAS certificate, save it on this server, and point tls_ca_file at it.
        'verify_tls'  => false,
        'tls_ca_file' => null,

        'timeout' => 60,

        // One entry per outlet: host (the NAS's Tailscale address) + base_path (the folder
        // that holds one folder per customer, named "BM 4521 LEE HUI WEN" — exactly as File
        // Station shows it, capitals and spaces matter).
        //
        // The key is the outlet code: the letters at the front of a membership ID
        // ("BM 4521" -> "BM", "SS2 4521" -> "SS2"). It must match exactly, or that outlet's
        // photos have nowhere to be saved and lookups for its customers will fail.
        'outlets' => array(
            'BM' => array('host' => '100.83.5.4', 'base_path' => '/UR-BM Customer Data/New 5 Angle Photo'),
            // 'GL' => array('host' => '100.x.x.x', 'base_path' => '/UR-GL Customer Data/New 5 Angle Photo'),
            // ... one line per outlet ...
        ),
    ),

    // The POS. 'UnionCrm' = the clinic's 33crm system (union.33crm.com). Use 'none' to run
    // from the NAS folders only. See docs/POS-CONNECTION.md.
    // It reads two exports with the same token: the customer table (CustomerXBI1: membership
    // numbers, names, phones) and the appointment report (today's bookings).
    'pos' => array(
        'driver'          => 'UnionCrm',
        'token'           => 'replace-me',              // from TK
        'username'        => 'replace-me',              // a POS login for Photo Flow — ideally not a person's
        'password'        => 'replace-me',
        // Holds the reduced POS data (membership numbers, names, phone numbers, today's bookings —
        // never IC numbers, birthdays or addresses). Outside the website; the IIS app pool needs
        // write access. Never inside the web folder.
        'cache_dir'       => 'C:\\photoflow-config\\pos-cache',
        'refresh_minutes' => 15,
        // Only if TK's links ever change:
        // 'url'            => 'https://union.33crm.com/apiv2/API_GetData.aspx',
        // 'reportname'     => 'Report_AppointmentList',
        // 'customer_url'   => 'https://union.33crm.com/api/api_Table_getDataV2.aspx',
        // 'customer_table' => 'CustomerXBI1',
        // 'customer_token' => 'replace-me',          // only if TK gives the table its own token
    ),

    // Each outlet's folder list is kept here for 'folder_cache_minutes' (that NAS can't search
    // folders by name, so finding one means listing them all). The app pool needs write access.
    'cache_dir'            => 'C:\\photoflow-config\\cache',
    'folder_cache_minutes' => 10,

    'timezone'      => 'Asia/Kuala_Lumpur',     // decides which date folder a photo lands in
    'max_upload_mb' => 15,

    // One JSON line per saved photo, for QA. The IIS app pool needs write access. null disables it.
    'audit_dir' => 'C:\\photoflow-config\\logs',
);

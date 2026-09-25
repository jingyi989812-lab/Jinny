#!/bin/bash
# Fresh fake NASes + config + accounts for tools/test. Fictional data only.
#
# Two outlets, each with its own fake Synology (ports 7329 and 7330), because the real clinic
# has one NAS per outlet: GL on one machine, BM/KW/SS2 on another.
cd "$(dirname "$0")"
W="$PWD/work"; rm -rf "$W"; mkdir -p "$W/logs" "$W/cache" "$W/config"

# --- NAS 1 (port 7329): the GL outlet ---
G="$W/nas/UR-GL Customer Data/5 Angle Photo"
mkdir -p "$G/GL 1500 BETTY LIM" "$G/GL 15000 NOT HER" "$G/2023-01-18"
for i in $(seq 1 1205); do mkdir -p "$G/GL 7$(printf %04d $i) FILLER"; done

# --- NAS 2 (port 7330): BM, KW and SS2 share one machine, one share each ---
B="$W/nas2/UR-BM Customer Data/New 5 Angle Photo"
K="$W/nas2/UR-KW Customer Data/5 Angle Photo"
S2="$W/nas2/UR-SS2 Customer Data/5 Angle Photo"
mkdir -p "$B/BM 1500 ALICE TAN (ALLY)" "$B/BM 1501 JOANNE LEE" "$B/BM 15000 NOT HIM" \
         "$K/KW 1500 DIANA NG" "$K/KW 1500 DIANA NG (DUPLICATE)" "$S2/SS2 1502 CARMEN WONG"

php make_images.php "$W"
cat > "$W/config/config.php" <<CFG
<?php
return array(
    'nas' => array(
        'scheme' => 'http', 'account' => 'svc_photoflow', 'password' => 'test-nas-password',
        'verify_tls' => false, 'timeout' => 30,
        'outlets' => array(
            'GL'  => array('host' => '127.0.0.1', 'port' => 7329, 'base_path' => '/UR-GL Customer Data/5 Angle Photo'),
            'BM'  => array('host' => '127.0.0.1', 'port' => 7330, 'base_path' => '/UR-BM Customer Data/New 5 Angle Photo'),
            'KW'  => array('host' => '127.0.0.1', 'port' => 7330, 'base_path' => '/UR-KW Customer Data/5 Angle Photo'),
            'SS2' => array('host' => '127.0.0.1', 'port' => 7330, 'base_path' => '/UR-SS2 Customer Data/5 Angle Photo'),
        ),
    ),
    'pos' => getenv('PF_POS') === 'none' ? array('driver' => 'none') : array(
        'driver' => 'UnionCrm', 'token' => 'test-pos-token', 'username' => 'photoflow', 'password' => 'test-pos-password',
        'url' => 'http://127.0.0.1:7400/apiv2/API_GetData.aspx',
        'customer_url' => 'http://127.0.0.1:7400/api/api_Table_getDataV2.aspx',
        'cache_dir' => '$W/cache', 'refresh_minutes' => 15, 'verify_tls' => false),
    'cache_dir' => '$W/cache',
    'timezone' => 'Asia/Kuala_Lumpur', 'max_upload_mb' => 15, 'audit_dir' => '$W/logs',
    'session_days' => 30,
);
CFG

# --- accounts: one admin, one therapist who may only use GL ---
export PHOTOFLOW_CONFIG="$W/config/config.php"
php ../../prototype-ios12/api/lib/create-admin.php boss "test-admin-pass-1" "The Boss" >/dev/null
API="$PWD/../../prototype-ios12/api" php -r '
require getenv("API") . "/bootstrap.php";
pf_user_create(array("username" => "gl.therapist", "password" => "test-staff-pass-1",
                     "displayName" => "GL Therapist", "role" => "staff", "outlets" => array("GL"),
                     "actor" => "test-setup"));
echo "accounts: boss (admin), gl.therapist (GL only)\n";'
echo "fake NASes seeded: GL $(ls "$G" | wc -l | tr -d ' ') folders, BM/KW/SS2 $(ls "$B" "$K" "$S2" | grep -c .) entries"

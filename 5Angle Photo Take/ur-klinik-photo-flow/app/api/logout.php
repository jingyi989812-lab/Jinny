<?php
/** POST logout.php — revokes just this phone's session; other devices stay signed in. */
require __DIR__ . '/bootstrap.php';
pf_method('POST');
pf_config();
pf_session_revoke(pf_bearer_token());
pf_json(200, array('ok' => true));

<?php
/**
 * Refreshes the POS cache outside any web request. Run by Windows Task Scheduler every
 * 10 minutes during clinic hours, so phones never wait for the POS download:
 *
 *   Program:   C:\php\php.exe
 *   Arguments: "C:\inetpub\wwwroot\Jinny\prototype\api\lib\pos-refresh.php"
 *
 * Run it by hand once to check the POS login:  php pos-refresh.php
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/Pos.php';

$cfg = pf_config_or_null();
if ($cfg === null) {
    fwrite(STDERR, "No config at " . pf_config_path() . "\n");
    exit(2);
}
$t = microtime(true);
try {
    $pos = pf_pos($cfg);
    if ($pos === null) {
        echo "POS is not connected ('driver' => 'none'). Nothing to do.\n";
        exit(0);
    }
    if (!method_exists($pos, 'refreshNow')) {
        echo "This POS driver has no cache to refresh.\n";
        exit(0);
    }
    $n = $pos->refreshNow();
    printf("OK in %.1fs: %d appointments today, %d customers.\n", microtime(true) - $t, $n['today'], $n['customers']);
    if (isset($n['tableRows'])) {
        printf("Customer table: %d rows, %d usable. Left out: %d with an unreadable membership number, %d sharing one.\n",
               $n['tableRows'], $n['tableCustomers'], $n['badMembershipNo'], $n['sharedMembershipNo']);
        printf("Today's appointments not found in the customer table: %d.\n", $n['todayUnmatched']);
        if ($n['todayNamesChecked'] > 0) {
            $agree = $n['todayNamesAgree'] / $n['todayNamesChecked'];
            printf("Names agree between appointment and customer table: %d of %d (%d%%).\n",
                   $n['todayNamesAgree'], $n['todayNamesChecked'], round($agree * 100));
        }
    }
} catch (Exception $e) {
    fwrite(STDERR, 'FAILED after ' . round(microtime(true) - $t, 1) . 's: ' . $e->getMessage() . "\n");
    exit(1);
}

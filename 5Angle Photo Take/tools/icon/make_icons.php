<?php
/**
 * Builds the app icons from tools/icon/source.webp (the designed icon on a black background).
 * Crops to the icon's own rounded square and paints the black corners with the icon's edge
 * colour: iOS rounds the corners itself, and would otherwise show black specks there.
 * iOS 12 can't read WebP, so everything is written as PNG.
 *
 *   php tools/icon/make_icons.php  →  prototype-ios12/icons/*.png
 */
$root = dirname(__DIR__, 2);
$src = imagecreatefromwebp(__DIR__ . '/source.webp');
$W = imagesx($src); $H = imagesy($src);
$lum = function ($img, $x, $y) { $c = imagecolorat($img, $x, $y); return 0.3 * (($c >> 16) & 255) + 0.59 * (($c >> 8) & 255) + 0.11 * ($c & 255); };
$dark = 45;

// The rounded square: first and last non-black row and column through the middle.
$mid = intdiv($W, 2);
for ($top = 0; $top < $H && $lum($src, $mid, $top) < $dark; $top++);
for ($bot = $H - 1; $bot > 0 && $lum($src, $mid, $bot) < $dark; $bot--);
for ($left = 0; $left < $W && $lum($src, $left, intdiv($H, 2)) < $dark; $left++);
for ($right = $W - 1; $right > 0 && $lum($src, $right, intdiv($H, 2)) < $dark; $right--);
$size = max($bot - $top, $right - $left) + 1;
$cx = intdiv($left + $right, 2); $cy = intdiv($top + $bot, 2);
$x0 = max(0, $cx - intdiv($size, 2)); $y0 = max(0, $cy - intdiv($size, 2));
fprintf(STDERR, "icon square: x %d-%d, y %d-%d → %dpx\n", $left, $right, $top, $bot, $size);

$sq = imagecreatetruecolor($size, $size);
imagecopy($sq, $src, 0, 0, $x0, $y0, $size, $size);

// Corners: the art is a rounded square (corner radius ~265px of 1061). Everything outside that
// shape — black background, plus the dark anti-aliased edge — is replaced by the colour just
// inside the edge, extended outwards along the same direction. iOS then rounds its own corners.
$r = (int)round($size * 0.25);   // measured: light begins ~75px in along the diagonal
$inset = 10;                     // skip the dark anti-aliased rim
foreach (array(array($r, $r), array($size - 1 - $r, $r), array($r, $size - 1 - $r), array($size - 1 - $r, $size - 1 - $r)) as $c) {
    list($ccx, $ccy) = $c;
    $xs = $ccx < $size / 2 ? range(0, $ccx) : range($ccx, $size - 1);
    $ys = $ccy < $size / 2 ? range(0, $ccy) : range($ccy, $size - 1);
    foreach ($ys as $y) {
        foreach ($xs as $x) {
            $dx = $x - $ccx; $dy = $y - $ccy; $d = sqrt($dx * $dx + $dy * $dy);
            if ($d <= $r - $inset || $d == 0) continue;
            $k = ($r - $inset - 2) / $d;
            imagesetpixel($sq, $x, $y, imagecolorat($src, $x0 + (int)round($ccx + $dx * $k), $y0 + (int)round($ccy + $dy * $k)));
        }
    }
}
// Straight edges: a few rows/columns of dark rim can remain; copy the colour from just inside.
for ($k = 0; $k < $size; $k++) {
    for ($e = 0; $e < $inset; $e++) {
        foreach (array(array($e, $k, $inset, $k), array($size - 1 - $e, $k, $size - 1 - $inset, $k),
                       array($k, $e, $k, $inset), array($k, $size - 1 - $e, $k, $size - 1 - $inset)) as $q) {
            if ($lum($sq, $q[0], $q[1]) < 200 && $lum($sq, $q[2], $q[3]) >= 200) {
                imagesetpixel($sq, $q[0], $q[1], imagecolorat($sq, $q[2], $q[3]));
            }
        }
    }
}

$out = $root . '/prototype-ios12/icons';
@mkdir($out, 0755, true);
foreach (array('apple-touch-icon.png' => 180, 'icon-167.png' => 167, 'icon-152.png' => 152, 'icon-120.png' => 120,
               'icon-512.png' => 512, 'icon-192.png' => 192, 'favicon-32.png' => 32) as $name => $px) {
    $d = imagecreatetruecolor($px, $px);
    imagecopyresampled($d, $sq, 0, 0, 0, 0, $px, $px, $size, $size);
    imagepng($d, "$out/$name", 9);
    printf("%-22s %4dpx %6d bytes\n", $name, $px, filesize("$out/$name"));
}

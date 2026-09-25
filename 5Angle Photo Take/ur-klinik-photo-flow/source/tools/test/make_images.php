<?php
// Test JPEGs for tools/test: an 8 MP "photo" and two small "reference" images.
$w = $argv[1];
$i = imagecreatetruecolor(3264, 2448); imagefill($i, 0, 0, imagecolorallocate($i, 90, 120, 160)); imagejpeg($i, "$w/big.jpg", 90);
$t = imagecreatetruecolor(480, 640);   imagefill($t, 0, 0, imagecolorallocate($t, 200, 50, 50));  imagejpeg($t, "$w/thumb.jpg", 85);
$o = imagecreatetruecolor(480, 640);   imagefill($o, 0, 0, imagecolorallocate($o, 20, 150, 50));  imagejpeg($o, "$w/other.jpg", 85);

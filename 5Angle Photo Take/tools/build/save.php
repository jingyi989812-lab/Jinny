<?php
$n = file_put_contents(__DIR__ . '/compiled.js', file_get_contents('php://input'));
echo $n;

#!/bin/bash
# The real backend (prototype-ios12) on PHP's built-in server, with every warning logged.
cd "$(dirname "$0")"

export PHOTOFLOW_CONFIG="$PWD/work/config/config.php"
exec php -d display_errors=1 -d error_reporting=-1 -d log_errors=1 -d error_log="$PWD/work/php-errors.log" \
  -d upload_max_filesize=15M -d post_max_size=16M -d memory_limit=128M -S 127.0.0.1:${PORT:-8091} -t ../../prototype-ios12

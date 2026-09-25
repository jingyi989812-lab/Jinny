#!/bin/bash
# The clinic build (dist/index.html) + the real backend, as deployed: work/site/{index.html, api -> prototype-ios12/api}
cd "$(dirname "$0")"
mkdir -p work/site && cp ../../dist/index.html work/site/index.html && ln -sfn "$PWD/../../prototype-ios12/api" work/site/api
export PHOTOFLOW_CONFIG="$PWD/work/config/config.php"
exec php -d display_errors=0 -d log_errors=1 -d error_log="$PWD/work/php-errors.log" \
  -d upload_max_filesize=15M -d post_max_size=16M -S 127.0.0.1:8095 -t work/site

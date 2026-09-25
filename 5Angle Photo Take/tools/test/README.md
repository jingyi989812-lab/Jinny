# Backend tests

The real PHP backend against a fake Synology (`fake_dsm.py`, which rejects `pattern` like the
clinic NAS) and a fake 33crm (`fake_pos.py`, customer table + appointment report). Fictional
data only. Needs PHP 7.2+ (with gd) and Python 3.

```bash
./setup.sh                      # fresh fake NAS, test images, work/config.php
python3 fake_dsm.py 7329 &
python3 fake_pos.py 7400 &
./run-php.sh &                  # backend on http://127.0.0.1:8091
python3 test_api.py             # expect: 41 passed, 0 failed
```

`./run-clinic.sh` serves the clinic build (`dist/index.html`) with the same backend on
port 8095, to click through on a phone-sized browser.

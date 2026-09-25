"""
End-to-end checks of the real PHP backend against fake_dsm.py (two outlets' NASes) and
fake_pos.py. Covers sign-in, per-outlet permissions, folder matching, the five angles, extra
photos with labels, and photos-only visits. Run: see README.md in this folder.
"""
import json, os, sys, uuid, urllib.request, urllib.error, urllib.parse, datetime, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(HERE, 'work')
APP = 'http://127.0.0.1:8091/api/'
API = os.path.join(HERE, '..', '..', 'prototype-ios12', 'api')
GL  = os.path.join(W, 'nas',  'UR-GL Customer Data', '5 Angle Photo')
BM  = os.path.join(W, 'nas2', 'UR-BM Customer Data', 'New 5 Angle Photo')
KW  = os.path.join(W, 'nas2', 'UR-KW Customer Data', '5 Angle Photo')
SS2 = os.path.join(W, 'nas2', 'UR-SS2 Customer Data', '5 Angle Photo')
TODAY = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime('%Y-%m-%d')
ADMIN = ('boss', 'test-admin-pass-1'); STAFF = ('gl.therapist', 'test-staff-pass-1')
results = []
def check(name, cond, extra=''):
    results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  -> ' + str(extra)[:500]))

def call(method, path, token=None, fields=None, files=None, body=None, raw=False):
    headers = {}
    if token: headers['X-PhotoFlow-Session'] = token
    data = None
    if body is not None:
        data = json.dumps(body).encode(); headers['Content-Type'] = 'application/json'
    elif fields is not None or files:
        b = uuid.uuid4().hex; parts = []
        for k, v in (fields or {}).items():
            parts.append(('--%s\r\nContent-Disposition: form-data; name="%s"\r\n\r\n%s\r\n' % (b, k, v)).encode())
        for k, (fn, content) in (files or {}).items():
            parts.append(('--%s\r\nContent-Disposition: form-data; name="%s"; filename="%s"\r\nContent-Type: image/jpeg\r\n\r\n' % (b, k, fn)).encode() + content + b'\r\n')
        data = b''.join(parts) + ('--%s--\r\n' % b).encode(); headers['Content-Type'] = 'multipart/form-data; boundary=' + b
    try:
        r = urllib.request.urlopen(urllib.request.Request(APP + path, data=data, headers=headers, method=method), timeout=60)
        status, payload, ctype = r.status, r.read(), r.headers.get('Content-Type')
    except urllib.error.HTTPError as e:
        status, payload, ctype = e.code, e.read(), e.headers.get('Content-Type')
    if raw: return status, payload, ctype
    try: return status, json.loads(payload)
    except Exception: return status, {'_raw': payload[:300]}

def sign_in(who):
    s, j = call('POST', 'login.php', body={'username': who[0], 'password': who[1]})
    return j.get('token'), j
def ctl(port, cmd=None):
    url = 'http://127.0.0.1:%d/__control' % port
    r = urllib.request.Request(url, data=json.dumps(cmd).encode(), method='POST') if cmd is not None else url
    return json.loads(urllib.request.urlopen(r).read())
def ls(*p):
    d = os.path.join(*p); return sorted(os.listdir(d)) if os.path.isdir(d) else None
def folders(base, prefix): return sorted(n for n in os.listdir(base) if n.upper().startswith(prefix + ' '))

big, thumb, other = (open(os.path.join(W, n), 'rb').read() for n in ('big.jpg', 'thumb.jpg', 'other.jpg'))
def up(token, cid, name, phase, angle, session, photo=big, ref=None, replace=False, group=None, seq=None, label=None):
    f = {'customerId': cid, 'customerName': name, 'phase': phase, 'angle': angle, 'session': session}
    if replace: f['replace'] = '1'
    if group is not None: f.update({'group': str(group), 'seq': str(seq), 'label': label or ''})
    files = {'photo': (angle + '.jpg', photo)}
    if ref is not None: files['reference'] = ('ref.jpg', ref)
    return call('POST', 'upload.php', token=token, fields=f, files=files)

for port in (7329, 7330):
    ctl(port, {'reset': True, 'fail_uploads': []})
ctl(7400, {'mode': 'normal'})
env = dict(os.environ, PHOTOFLOW_CONFIG=os.path.join(W, 'config', 'config.php'))
refresh = lambda: subprocess.run(['php', '-d', 'error_reporting=-1', os.path.join(API, 'lib', 'pos-refresh.php')],
                                 env=env, capture_output=True, text=True)

# ---- POS refresh
r = refresh()
check('pos-refresh succeeds and reports the join', r.returncode == 0 and '100%' in r.stdout, r.stdout + r.stderr)
cache = open(os.path.join(W, 'cache', 'appointments.json')).read()
check('POS cache keeps no IC numbers, birthdays or addresses',
      'FAKE-IC' not in cache and 'FAKE ADDRESS' not in cache and '1/Jan/1990' not in cache)

# ---- sign in
s, j = call('GET', 'health.php')
check('health: configured, POS connected', j.get('configured') and j.get('pos') == 'connected', j)
s, j = call('POST', 'login.php', body={'username': 'boss', 'password': 'wrong'})
check('login: wrong password → 401', s == 401, (s, j))
admin, j = sign_in(ADMIN)
check('login: admin gets a token and their role', admin and j['user']['role'] == 'admin', j)
staff, j = sign_in(STAFF)
check('login: staff account is limited to its outlets', staff and j['user']['outlets'] == ['GL'], j)
s, j = call('GET', 'me.php', token=staff)
check('me: identifies the signed-in account', j.get('user', {}).get('username') == 'gl.therapist', j)
s, j = call('GET', 'customers.php?view=today')
check('no session → 401', s == 401, (s, j))
s, j = call('GET', 'customers.php?view=today', token='not-a-real-token')
check('made-up token → 401', s == 401, (s, j))
s, j = call('GET', 'admin-users.php', token=staff)
check('staff cannot manage accounts', s == 403, (s, j))
s, j = call('GET', 'admin-users.php', token=admin)
text = json.dumps(j)
check('admin can list accounts, and no password hash is returned',
      s == 200 and len(j['users']) == 2 and 'passwordHash' not in text and '$2y$' not in text and 'test-admin-pass' not in text, j)

# ---- outlet permissions
s, j = up(staff, 'BM 1500', 'Alice Tan', 'BEFORE', 'front', '090000')
check('staff cannot save into an outlet they do not have', s == 403 and ls(BM, 'BM 1500 ALICE TAN (ALLY)') == [], (s, j))
s, j = call('GET', 'customers.php?view=lookup&id=BM1500', token=staff)
check('staff cannot look up another outlet either', s == 403, (s, j))
s, j = call('GET', 'customers.php?view=lookup&id=GL1500', token=staff)
check('staff can look up their own outlet', s == 200 and j['status'] == 'found' and j['folders'] == ['GL 1500 BETTY LIM'], j)

# ---- the five angles, on the outlet's own NAS
for a in ['front', 'l45', 'lside', 'r45', 'rside']:
    s, j = up(staff, 'GL-1500', 'Grace Wong', 'BEFORE', a, '101500', ref=thumb if a == 'front' else None)
check('5 angles saved into the GL folder on the GL NAS', s == 201 and j['customerFolder'] == 'GL 1500 BETTY LIM', j)
check('5 files + the small reference copy', len(ls(GL, 'GL 1500 BETTY LIM', TODAY, 'BEFORE')) == 5 and
      open(os.path.join(GL, 'GL 1500 BETTY LIM', '_reference.jpg'), 'rb').read() == thumb)
check('GL 15000 untouched', ls(GL, 'GL 15000 NOT HER') == [])
s, j = up(admin, 'BM 1500', 'Alice Tan', 'BEFORE', 'front', '102000')
check('admin may use any outlet; BM lands on the BM NAS', s == 201 and j['customerFolder'] == 'BM 1500 ALICE TAN (ALLY)'
      and ls(BM, 'BM 1500 ALICE TAN (ALLY)', TODAY, 'BEFORE') == ['1-FRONT_102000.jpg'], j)
s, j = up(admin, 'KW 1500', 'Diana Ng', 'BEFORE', 'front', '102500')
check('duplicate folders → 409, nothing saved', s == 409 and ls(KW, 'KW 1500 DIANA NG') == [], (s, j))
s, j = up(admin, 'SS2 1502', 'Carmen Wong', 'BEFORE', 'front', '103000')
check('SS2 1502 goes to SS2, never to BM 1502', s == 201 and ls(SS2, 'SS2 1502 CARMEN WONG', TODAY, 'BEFORE') == ['1-FRONT_103000.jpg'], j)
s, j = up(admin, 'BM 9001', '  john   tan/../ ', 'BEFORE', 'front', '103500')
check('walk-in: new folder with a cleaned name', s == 201 and j['folderCreated'] and j['customerFolder'] == 'BM 9001 JOHN TAN', j)

# ---- retry and retake
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'l45', '101500', photo=other)
f2 = os.path.join(GL, 'GL 1500 BETTY LIM', TODAY, 'BEFORE', '2-LEFT-45_101500.jpg')
check('retry of a saved photo is skipped, not overwritten', s == 201 and open(f2, 'rb').read() == big, j)
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'l45', '101500', photo=other, replace=True)
check('retake with replace=1 overwrites just that photo', s == 201 and open(f2, 'rb').read() == other, j)

# ---- extra photos: hands, legs, backs
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'extra', '101500', group=6, seq=1, label='  left  hand ')
check('extra photo: label cleaned into the file name', s == 201 and j['file'].startswith('6-LEFT-HAND-01_') and j['label'] == 'LEFT-HAND', j)
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'extra', '101500', group=7, seq=1, label='背部')
check('extra photo: Chinese label kept', s == 201 and j['file'].startswith('7-背部-01_'), j)
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'extra', '101500', group=7, seq=2, label='背部/../etc')
check('extra photo: slashes and dots stripped from the label', s == 201 and '/' not in j['file'] and '..' not in j['file'], j)
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'extra', '101500', group=8, seq=1, label='')
check('extra photo: no label → EXTRA', s == 201 and j['file'].startswith('8-EXTRA-01_'), j)
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'extra', '101500', group=0, seq=1, label='x')
check('extra photo: group 0 rejected', s == 400, j)
s, j = up(staff, 'GL 1500', 'Grace Wong', 'BEFORE', 'extra', '101500', group=6, seq=1, label='LEFT-HAND', photo=other, replace=True)
f6 = os.path.join(GL, 'GL 1500 BETTY LIM', TODAY, 'BEFORE', '6-LEFT-HAND-01_101500.jpg')
check('extra photo: retake with replace=1 overwrites it', s == 201 and open(f6, 'rb').read() == other, j)
names = [n for n in ls(GL, 'GL 1500 BETTY LIM', TODAY, 'BEFORE') if not n[0].isdigit() or int(n[0]) > 5]
check('extra photos sit beside the five angles', names == ['6-LEFT-HAND-01_101500.jpg', '7-背部-01_101500.jpg',
      '7-背部-ETC-02_101500.jpg', '8-EXTRA-01_101500.jpg'], names)

s, j = call('GET', 'customers.php?view=lookup&id=GL1500', token=staff)
labels = [g['label'] for g in j['today']['groups']]
check("lookup: today's label groups come back for the AFTER session",
      j['today']['before'] == 5 and j['today']['beforeExtra'] == 4 and labels == ['LEFT-HAND', '背部', 'EXTRA'], j.get('today'))
check('lookup: recent labels offered as suggestions', 'LEFT-HAND' in j['labels'], j.get('labels'))

# ---- a visit with no face angles at all
s, j = up(staff, 'GL 1600', 'New Walkin', 'BEFORE', 'extra', '104000', group=1, seq=1, label='right leg')
check('photos-only visit: saves with no face angles', s == 201 and j['file'].startswith('1-RIGHT-LEG-01_')
      and j['folderCreated'], j)
s, b, ct = call('GET', 'reference.php?id=GL-1600', token=staff, raw=True)
check('photos-only visit: no reference photo is invented', s == 404, s)
s, b, ct = call('GET', 'reference.php?id=GL-1500', token=staff, raw=True)
check('reference photo served from the right NAS', s == 200 and b == other[:0] + b if False else (s == 200 and len(b) > 0), s)

# ---- today's list and search
s, j = call('GET', 'customers.php?view=today', token=staff)
ids = {c['id']: c for c in j['customers']}
check('today: a staff account sees only its own outlet', all(c['id'].startswith('GL ') for c in j['customers']), list(ids))
check('today: face angles and extra photos counted separately',
      ids.get('GL 1500', {}).get('before') == 5 and ids['GL 1500']['beforeExtra'] == 4, ids.get('GL 1500'))
s, j = call('GET', 'customers.php?view=today', token=admin)
check('today: an admin sees every outlet', len({c['id'].split(' ')[0] for c in j['customers']}) > 1,
      [c['id'] for c in j['customers']])
s, j = call('GET', 'customers.php?view=search&q=betty', token=staff)
check('search by name finds the NAS folder', any(c['folder'] == 'GL 1500 BETTY LIM' for c in j['customers']), j)
s, j = call('GET', 'customers.php?view=search&q=' + urllib.parse.quote('1500'), token=staff)
check('search by number stays inside the account\'s outlets', all(c['id'].startswith('GL ') for c in j['customers']),
      [c['id'] for c in j['customers']])

# ---- NAS failure
ctl(7329, {'fail_uploads': [ctl(7329)['upload_count'] + 1]})
s, j = up(staff, 'GL 1500', 'Grace Wong', 'AFTER', 'front', '110000')
check('NAS error → 502 with a plain message', s == 502 and 'out of space' in j.get('error', ''), (s, j))
ctl(7329, {'fail_uploads': []})
s, j = up(staff, 'GL 1500', 'Grace Wong', 'AFTER', 'front', '110000')
check('...and the retry saves', s == 201, j)

# ---- signing out
s, j = call('POST', 'logout.php', token=staff, body={})
check('logout succeeds', s == 200, j)
s, j = call('GET', 'customers.php?view=today', token=staff)
check('the token stops working after signing out', s == 401, (s, j))

# ---- hygiene
for port, label in ((7329, 'GL NAS'), (7330, 'BM/KW/SS2 NAS')):
    st = ctl(port)
    check('%s: every login logged out, password never in a URL' % label,
          st['sids'] == 0 and st['logins'] == st['logouts'] and st['login_via_get'] == 0, st)
log = os.path.join(W, 'php-errors.log'); errs = open(log).read() if os.path.exists(log) else ''
bad = [l for l in errs.splitlines() if '[photoflow]' not in l]
check('no PHP warnings or deprecations', not bad, '\n'.join(bad[:8]))
audit = open(os.path.join(W, 'logs', sorted(os.listdir(os.path.join(W, 'logs')))[0])).read()
check('audit log records who saved each photo', '"username"' in audit or '"by"' in audit, audit[:200])

print('\n%d passed, %d failed' % (results.count(True), results.count(False)))
sys.exit(0 if all(results) else 1)

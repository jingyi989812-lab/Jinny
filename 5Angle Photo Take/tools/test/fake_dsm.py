"""
A fake Synology File Station for running the real PHP backend against. Implements only what
Photo Flow calls (Auth login/logout, CreateFolder, List list/getinfo, Upload, Download), and
copies the clinic NAS's quirk: a List request carrying 'pattern' fails with HTTP 502, empty body.
Shares live in ./work/<NAS_DIR or "nas">, so several instances can stand in for several outlets' NASes. Stats and fault injection at /__control. All data fictional.
"""
import http.server, json, os, sys, uuid, urllib.parse, threading
from email.parser import BytesParser
from email.policy import default as default_policy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, 'work', os.environ.get('NAS_DIR', 'nas'))   # one instance per outlet NAS
ACCOUNT, PASSWORD = 'svc_photoflow', 'test-nas-password'
S = {'sids': set(), 'logins': 0, 'logouts': 0, 'fail_uploads': [], 'upload_count': 0,
     'lists': 0, 'pattern_rejected': 0, 'bad_field_order': 0, 'login_via_get': 0}
lock = threading.Lock()

def real(p):
    full = os.path.normpath(os.path.join(ROOT, p.lstrip('/')))
    assert full.startswith(ROOT), 'path escape: ' + p
    return full

class H(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def reply(self, obj, status=200):
        raw = json.dumps(obj).encode()
        self.send_response(status); self.send_header('Content-Type', 'application/json; charset="UTF-8"')
        self.send_header('Content-Length', str(len(raw))); self.end_headers(); self.wfile.write(raw)
    def ok(self, data=None): self.reply({'success': True, 'data': data or {}})
    def err(self, code): self.reply({'success': False, 'error': {'code': code}})

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path)
        if u.path == '/__control':
            with lock: return self.reply(dict(S, sids=len(S['sids'])))
        self.api(dict(urllib.parse.parse_qsl(u.query, keep_blank_values=True)), None, 'GET')

    def do_POST(self):
        u = urllib.parse.urlsplit(self.path)
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)))
        if u.path == '/__control':
            cmd = json.loads(body or b'{}')
            with lock:
                if 'fail_uploads' in cmd: S['fail_uploads'] = cmd['fail_uploads']
                if cmd.get('reset'):
                    S.update(logins=0, logouts=0, upload_count=0, lists=0, pattern_rejected=0, bad_field_order=0, login_via_get=0)
            return self.reply({'ok': True})
        q = dict(urllib.parse.parse_qsl(u.query, keep_blank_values=True))
        ctype = self.headers.get('Content-Type', ''); files = None
        if ctype.startswith('multipart/form-data'):
            msg = BytesParser(policy=default_policy).parsebytes(b'Content-Type: ' + ctype.encode() + b'\r\n\r\n' + body)
            files, seen_file = {}, False
            for part in msg.iter_parts():
                name = part.get_param('name', header='content-disposition')
                if part.get_filename() is not None:
                    seen_file = True; files[name] = (part.get_filename(), part.get_payload(decode=True))
                else:
                    if seen_file: S['bad_field_order'] += 1
                    q[name] = part.get_payload(decode=True).decode()
        else:
            q.update(dict(urllib.parse.parse_qsl(body.decode(), keep_blank_values=True)))
        self.api(q, files, 'POST')

    def api(self, q, files, verb):
        api, method = q.get('api'), q.get('method')
        if api == 'SYNO.API.Auth':
            if method == 'login':
                if verb == 'GET': S['login_via_get'] += 1
                if q.get('account') != ACCOUNT or q.get('passwd') != PASSWORD: return self.err(400)
                sid = uuid.uuid4().hex
                with lock: S['sids'].add(sid); S['logins'] += 1
                return self.ok({'sid': sid})
            with lock: S['sids'].discard(q.get('_sid')); S['logouts'] += 1
            return self.ok()
        if q.get('_sid') not in S['sids']: return self.err(119)

        if api == 'SYNO.FileStation.CreateFolder':
            parent = real(q['folder_path'])
            if not os.path.isdir(parent) and q.get('force_parent') != 'true': return self.err(408)
            os.makedirs(os.path.join(parent, q['name']), exist_ok=True)
            return self.ok({'folders': [{'isdir': True, 'name': q['name']}]})
        if api == 'SYNO.FileStation.List':
            if method == 'list':
                if 'pattern' in q:            # the clinic NAS's quirk
                    S['pattern_rejected'] += 1
                    self.send_response(502); self.send_header('Content-Length', '0'); self.end_headers(); return
                S['lists'] += 1
                d = real(q['folder_path'])
                if not os.path.isdir(d): return self.err(408)
                names = sorted(n for n in os.listdir(d) if os.path.isdir(os.path.join(d, n)) or q.get('filetype') != 'dir')
                off, lim = int(q.get('offset', 0)), int(q.get('limit', 0)) or len(names)
                return self.ok({'total': len(names), 'offset': off,
                                'files': [{'isdir': True, 'name': n, 'path': q['folder_path'] + '/' + n} for n in names[off:off + lim]]})
            p = q['path']; full = real(p)
            if not os.path.exists(full): return self.ok({'files': [{'code': 408, 'path': p}]})
            return self.ok({'files': [{'isdir': os.path.isdir(full), 'name': os.path.basename(full), 'path': p}]})
        if api == 'SYNO.FileStation.Upload':
            with lock:
                S['upload_count'] += 1
                if S['upload_count'] in S['fail_uploads']: return self.err(416)
            folder = real(q.get('path', ''))
            if not os.path.isdir(folder):
                if q.get('create_parents') != 'true': return self.err(408)
                os.makedirs(folder)
            fname, data = files['file']; target = os.path.join(folder, fname)
            if os.path.exists(target) and q.get('overwrite') != 'true':
                return self.ok() if q.get('overwrite') == 'false' else self.err(1805)
            open(target, 'wb').write(data)
            return self.ok()
        if api == 'SYNO.FileStation.Download':
            full = real(q['path'])
            if not os.path.isfile(full): return self.err(408)
            data = open(full, 'rb').read()
            self.send_response(200); self.send_header('Content-Type', 'image/jpeg')
            self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data); return
        return self.err(102)

if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 7329), H).serve_forever()

"""
A fake 33crm POS: the customer table (JSON) and the appointment report (CSV), behind HTTP Basic
auth and a token, shaped like the real exports. Fictional customers only. Every membership
number exists at two outlets (BM-1560 and GL-1560 are different people), as in the real table.
/__control {"mode": "shuffled"} makes the report's customerIDs point at the wrong customers,
to prove the refresh refuses a bad join.
"""
import http.server, json, sys, base64, datetime, urllib.parse
TOKEN, USER, PASS = 'test-pos-token', 'photoflow', 'test-pos-password'
STATE = {'mode': 'normal', 'table_hits': 0, 'report_hits': 0}
FIRST = ['ALICE', 'BETTY', 'CARMEN', 'DIANA', 'EVELYN', 'FIONA', 'GRACE', 'HANNAH', 'IRIS', 'JOANNE',
         'KAREN', 'LINDA', 'MAY', 'NORA', 'OLIVIA', 'PEARL']
LAST = ['TAN', 'LIM', 'WONG', 'LEE', 'NG', 'ONG', 'CHAN', 'TEH']
OUTLETS = ['BM', 'GL', 'SS2', 'KW']

def customers():
    out, pid = [], 100
    for n in range(40):
        for o in OUTLETS[:2] if n % 2 else OUTLETS:        # numbers repeat across outlets
            pid += 1
            name = FIRST[pid % len(FIRST)] + ' ' + LAST[(pid // 3) % len(LAST)]
            out.append({'id': pid, 'branchid': o, 'membershipno': '%s-%d' % (o, 1500 + n), 'ismember': '',
                        'customername': name, 'sex': 'FEMALE', 'icno': 'FAKE-IC-%d' % pid, 'dob': '1/Jan/1990',
                        'telmobile': '01255%05d' % pid, 'email': '', 'address1': 'FAKE ADDRESS %d' % pid})
    out.append({'id': 999, 'branchid': 'BM', 'membershipno': 'BM-9999', 'customername': 'DUPLICATE ONE', 'telmobile': ''})
    out.append({'id': 998, 'branchid': 'BM', 'membershipno': 'BM9999', 'customername': 'DUPLICATE TWO', 'telmobile': ''})
    out.append({'id': 997, 'branchid': 'HQ', 'membershipno': 'HQ-STAFF 1', 'customername': 'STAFF', 'telmobile': ''})
    return out

def report():
    today = datetime.datetime.utcnow() + datetime.timedelta(hours=8)
    d = today.strftime('%d/%b/%Y'); old = (today - datetime.timedelta(days=30)).strftime('%d/%b/%Y')
    cs = customers()[:12]
    rows = ['customerType,customername,customerID,followUpListID,appDate,starttime,endtime,status,branchID,newshowup']
    for i, c in enumerate(cs):
        pid = c['id']
        if STATE['mode'] == 'shuffled': pid = cs[(i + 5) % len(cs)]['id']
        status = 'SHOWUP' if i % 3 == 0 else 'CONFIRMED'
        start = 1000 + (i // 2) * 100 + (i % 2) * 30          # 1000, 1030, 1100, 1130, ...
        rows.append('CUSTOMER,"%s",%d,1,%s,%04d,%04d,%s,%s,0' % (c['customername'].title(), pid, d, start, start + 100, status, c['branchid']))
        rows.append('CUSTOMER,"%s",%d,1,%s,0900,1000,DONE,%s,0' % (c['customername'], pid, old, c['branchid']))
    rows.append('CUSTOMER,"NOT IN TABLE",55555,1,%s,1500,1600,CONFIRMED,BM,0' % d)
    rows.append('CUSTOMER,"CANCELLED ONE",%d,1,%s,1600,1700,CANCEL,BM,0' % (cs[1]['id'], d))
    rows.append('REMARKS,"",,,%s,,,,BM,0' % d)
    return '﻿' + '\r\n'.join(rows) + '\r\n'

class H(http.server.BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    def log_message(self, *a): pass
    def send(self, status, body, ctype='text/plain'):
        b = body.encode('utf-8') if isinstance(body, str) else body
        self.send_response(status); self.send_header('Content-Type', ctype); self.send_header('Content-Length', str(len(b)))
        if status == 401: self.send_header('WWW-Authenticate', 'Basic realm="union.33crm.com"')
        self.end_headers(); self.wfile.write(b)
    def do_POST(self):
        cmd = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
        STATE.update(cmd); self.send(200, json.dumps(STATE), 'application/json')
    def do_GET(self):
        u = urllib.parse.urlsplit(self.path); q = dict(urllib.parse.parse_qsl(u.query))
        if u.path == '/__control': return self.send(200, json.dumps(STATE), 'application/json')
        if self.headers.get('Authorization') != 'Basic ' + base64.b64encode(('%s:%s' % (USER, PASS)).encode()).decode():
            return self.send(401, 'Authorization required')
        if q.get('token') != TOKEN: return self.send(200, 'Invalid token')
        if u.path == '/api/api_Table_getDataV2.aspx' and q.get('tablename') == 'CustomerXBI1':
            STATE['table_hits'] += 1
            return self.send(200, json.dumps(customers(), indent=2), 'application/json')
        if u.path == '/apiv2/API_GetData.aspx' and q.get('reportname') == 'Report_AppointmentList':
            STATE['report_hits'] += 1
            return self.send(200, report(), 'text/csv')
        return self.send(404, 'not found')

if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv) > 1 else 7400), H).serve_forever()

"""
Builds dist/index.html — the clinic version of the app — from prototype-ios12/index.html.

  1. Serve tools/build with PHP (php -S 127.0.0.1:8096 -t tools/build), copy
     prototype-ios12/index.html to tools/build/src.html, open http://127.0.0.1:8096/build.html:
     it compiles the JSX with Babel and writes tools/build/compiled.js.
  2. python3 tools/make_dist.py

The result has no in-browser Babel (the iPhone 6 starts in about a second instead of several),
sets PHOTOFLOW_PILOT (no sample customers, no demo saves), and drops the presentation sidebar.
"""
import os, re, shutil, sys, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'prototype-ios12', 'index.html'), encoding='utf-8').read()
built_from = open(os.path.join(ROOT, 'tools', 'build', 'src.html'), encoding='utf-8').read()
if built_from != src:
    sys.exit('compiled.js is out of date: copy prototype-ios12/index.html to tools/build/src.html and rebuild.')
js = open(os.path.join(ROOT, 'tools', 'build', 'compiled.js'), encoding='utf-8').read()
assert '</script' not in js

def cut(s, start, end, repl):
    i = s.index(start); j = s.index(end, i) + len(end)
    return s[:i] + repl + s[j:]

out = src
out = cut(out, '<div class="side">', '</p>\n  </div>', '<div class="side">\n    <div style="font-weight:800;font-size:13px;letter-spacing:.22em;color:#FFC02E" class="mono">UR KLINIK</div>\n    <h1 style="font-size:34px;line-height:1.08;font-weight:800;margin:10px 0 0;letter-spacing:-.02em">Photo&nbsp;Flow</h1>\n    <p style="color:#A79C89;font-size:15px;line-height:1.6;margin:14px 0 0">For the clinic iPhones. Open this page on the phone and add it to the Home Screen.</p>\n  </div>')
out = out.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js"></script>\n', '')
version = hashlib.sha1(js.encode()).hexdigest()[:8]
app = ('<script>window.PHOTOFLOW_PILOT = true; window.PHOTOFLOW_VERSION = "%s";\n'
       '  /* If React never arrives (no internet), say so instead of spinning forever. */\n'
       '  setTimeout(function(){ if (!window.ReactDOM) { var t = document.querySelector(".boot-txt");'
       ' if (t) t.innerHTML = "Couldn\\u2019t load Photo Flow.<br>Check the wifi, then reload."; } }, 15000);\n'
       '</script>\n<script>\n' % version) + js + '\n</script>'
out = cut(out, '<script type="text/babel" data-presets="react">', '</script>', app)
assert 'text/babel' not in out and 'babel.min.js' not in out and 'DEMO SCRIPT' not in out
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
open(os.path.join(ROOT, 'dist', 'index.html'), 'w', encoding='utf-8').write(out)
# The app icons (index.html links to icons/…).
shutil.copytree(os.path.join(ROOT, 'prototype-ios12', 'icons'), os.path.join(os.path.join(ROOT, 'dist'), 'icons'), dirs_exist_ok=True)
print('dist/index.html', len(out), 'bytes, version', version)

"""
Builds netlify/ — a static demo of Photo Flow for Netlify (or any static host).

Same precompiled app as dist/, but in demo mode: sample customers, nothing is saved.
There is no api/ folder, so the app can't reach a server and falls back to demo by itself.
Run tools/make_dist.py's build step first (tools/build/compiled.js must match the source).
"""
import os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'prototype-ios12', 'index.html'), encoding='utf-8').read()
if open(os.path.join(ROOT, 'tools', 'build', 'src.html'), encoding='utf-8').read() != src:
    sys.exit('compiled.js is out of date — rebuild it first.')
js = open(os.path.join(ROOT, 'tools', 'build', 'compiled.js'), encoding='utf-8').read()
assert '</script' not in js

out = src.replace('<script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js"></script>\n', '')
i = out.index('<script type="text/babel" data-presets="react">')
j = out.index('</script>', i) + len('</script>')
out = out[:i] + '<script>\n' + js + '\n</script>' + out[j:]
assert 'text/babel' not in out and 'PHOTOFLOW_PILOT = true' not in out

d = os.path.join(ROOT, 'netlify')
os.makedirs(d, exist_ok=True)
open(os.path.join(d, 'index.html'), 'w', encoding='utf-8').write(out)
# The app icons (index.html links to icons/…).
shutil.copytree(os.path.join(ROOT, 'prototype-ios12', 'icons'), os.path.join(d, 'icons'), dirs_exist_ok=True)
# Internal prototype: keep it out of search engines, and don't let other sites frame it.
open(os.path.join(d, '_headers'), 'w').write('/*\n  X-Robots-Tag: noindex, nofollow\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n')
open(os.path.join(d, 'robots.txt'), 'w').write('User-agent: *\nDisallow: /\n')
print('netlify/ ready:', sorted(os.listdir(d)), len(out), 'bytes')

#!/usr/bin/env python3
"""Cache busting: rewrite every assets/css|js link in the HTML pages as file?v=<content hash>.

Browsers (and GitHub Pages' CDN) keep CSS/JS for a while; when the HTML changes but the
old stylesheet is still cached, new elements show up unstyled. Run this after editing any
CSS or JS file:   python3 tools/version-assets.py
"""
import glob, hashlib, os, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
pat = re.compile(r'(assets/(?:css|js)/[\w.-]+\.(?:css|js))(\?v=[0-9a-f]+)?')
def ver(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()[:10]
changed = 0
for page in sorted(glob.glob('*.html')):
    src = open(page, encoding='utf-8').read()
    out = pat.sub(lambda m: f'{m.group(1)}?v={ver(m.group(1))}', src)
    if out != src:
        open(page, 'w', encoding='utf-8').write(out); changed += 1
print(f'{changed} page(s) updated')

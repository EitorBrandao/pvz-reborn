#!/usr/bin/env python3
"""Prepara SVG: rgba -> hex + opacidade; opacity -> fill-opacity/stroke-opacity."""
import re, sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()

def rgba(m):
    attr, r, g, b, a = m.group(1), *m.group(2, 3, 4, 5)
    return f'{attr}="#{int(r):02x}{int(g):02x}{int(b):02x}" {attr}-opacity="{float(a)}"'
s = re.sub(r'(fill|stroke)="rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)"', rgba, s)

def tag(m):
    t = m.group(0)
    o = re.search(r'\sopacity="([\d.]+)"', t)
    if not o:
        return t
    v = o.group(1)
    t = t.replace(o.group(0), '')
    if 'stroke-opacity' not in t and re.search(r'stroke="(?!none)', t):
        t = re.sub(r'\s*/?>$', lambda e: f' stroke-opacity="{v}"' + e.group(0), t)
    if 'fill-opacity' not in t and not re.search(r'fill="none"', t):
        t = re.sub(r'\s*/?>$', lambda e: f' fill-opacity="{v}"' + e.group(0), t)
    return t
s = re.sub(r'<[a-z]+\s[^>]*>', tag, s)
open(dst, 'w', encoding='utf-8').write(s)

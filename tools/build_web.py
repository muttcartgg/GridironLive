"""Build web/index.html from src/index.html + src/css/*.css + src/js/*.js, inlining fonts.
The result is one self-contained offline file (the iOS app ships it as-is).
Run after editing anything in src/:  python3 tools/build_web.py

Placeholders in src/index.html:
  /*__APP_CSS__*/        all src/css/*.css files, concatenated in sorted order
  /*__APP_JS__*/         all src/js/*.js files, concatenated in sorted order
  __FONT400__/__FONT700__  Silkscreen (retro pixel font), base64 woff2
  __FONT:<file>__        any font in tools/fonts/, base64 (e.g. __FONT:barlow-condensed-800.woff2__)
"""
import base64, pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
fonts = root / "tools" / "fonts"
html = (root / "src" / "index.html").read_text()
css_dir = root / "src" / "css"
css = "\n".join(p.read_text() for p in sorted(css_dir.glob("*.css"))) if css_dir.exists() else ""
js = "\n".join(p.read_text() for p in sorted((root / "src" / "js").glob("*.js")))
if "/*__APP_CSS__*/" in html:
    html = html.replace("/*__APP_CSS__*/", css)
elif css:
    html = html.replace("</head>", "<style>\n" + css + "\n</style>\n</head>", 1)
# fonts are swapped in before the JS goes in, so the JS can never be mangled by a font placeholder
for w in ("400", "700"):
    b = base64.b64encode((fonts / f"silkscreen-latin-{w}-normal.woff2").read_bytes()).decode()
    html = html.replace(f"__FONT{w}__", b)
def font_sub(m):
    f = fonts / m.group(1)
    if not f.exists():
        sys.exit(f"missing font file tools/fonts/{m.group(1)}")
    return base64.b64encode(f.read_bytes()).decode()
html = re.sub(r"__FONT:([A-Za-z0-9._-]+)__", font_sub, html)
html = html.replace("/*__APP_JS__*/", js)
(root / "web" / "index.html").write_text(html)
print("wrote web/index.html", len(html) // 1024, "KB")

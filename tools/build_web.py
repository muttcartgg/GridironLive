"""Build web/index.html from src/index.html + src/js/*.js, inlining the pixel font.
The result is one self-contained offline file (the iOS app ships it as-is).
Run after editing anything in src/:  python3 tools/build_web.py"""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
fonts = root / "tools" / "fonts"
html = (root / "src" / "index.html").read_text()
js = "\n".join(p.read_text() for p in sorted((root / "src" / "js").glob("*.js")))
html = html.replace("/*__APP_JS__*/", js)
for w in ("400", "700"):
    b = base64.b64encode((fonts / f"silkscreen-latin-{w}-normal.woff2").read_bytes()).decode()
    html = html.replace(f"__FONT{w}__", b)
(root / "web" / "index.html").write_text(html)
print("wrote web/index.html", len(html) // 1024, "KB")

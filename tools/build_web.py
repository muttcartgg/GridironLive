"""Build web/index.html from src/index.html, inlining the pixel font so the game is one offline file.
Run after editing src/index.html:  python3 tools/build_web.py"""
import base64, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
fonts = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "tools" / "fonts"
src = (root / "src" / "index.html").read_text()
for w in ("400", "700"):
    b = base64.b64encode((fonts / f"silkscreen-latin-{w}-normal.woff2").read_bytes()).decode()
    src = src.replace(f"__FONT{w}__", b)
(root / "web" / "index.html").write_text(src)
print("wrote web/index.html", len(src)//1024, "KB")

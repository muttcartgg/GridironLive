"""Builds tools/fonts/glpixsym.ttf: an original symbol-only pixel font for the Pixel UI style.
Silkscreen and Tiny5 have no stars, arrows, triangles or emoji (and Silkscreen's "&" reads as a euro sign), so this
face comes first in the Pixel font stacks, limited by unicode-range to exactly its glyphs (printed by this script),
and keeps every symbol on the same 8-pixels-per-em grid (128 units per pixel, like Tiny5).
Run: python3 tools/fonts/make_pixsym.py   (needs fontTools)"""
import pathlib
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

U = 128  # font units per pixel; em = 8 px
# each glyph: rows top->bottom; '#' = ink; 'top' = y (in px) of the first row's top edge above the baseline
G = {
    0x0026: (5, [".#...", "#.#..", ".#..#", "#.##.", ".##.#"]),  # & (cap height, 1px strokes)
    0x2605: (6, ["...#...", "..###..", "#######", ".#####.", "..###..", ".##.##.", ".#...#."]),  # ★
    0x2606: (6, ["...#...", "..#.#..", "##...##", ".#...#.", "..#.#..", ".#.#.#.", ".#...#."]),  # ☆
    0x25B6: (6, ["#...", "##..", "###.", "####", "###.", "##..", "#..."]),  # ▶
    0x25B8: (5, ["#..", "##.", "###", "##.", "#.."]),  # ▸
    0x25C0: (6, ["...#", "..##", ".###", "####", ".###", "..##", "...#"]),  # ◀
    0x25C2: (5, ["..#", ".##", "###", ".##", "..#"]),  # ◂
    0x25B2: (5, ["...#...", "..###..", ".#####.", "#######"]),  # ▲
    0x25BC: (5, ["#######", ".#####.", "..###..", "...#..."]),  # ▼
    0x25B4: (4, ["..#..", ".###.", "#####"]),  # ▴
    0x25BE: (4, ["#####", ".###.", "..#.."]),  # ▾
    0x2192: (5, ["...#.", "...##", "#####", "...##", "...#."]),  # →
    0x2190: (5, [".#...", "##...", "#####", "##...", ".#..."]),  # ←
    0x2191: (6, ["..#..", ".###.", "#####", "..#..", "..#..", "..#.."]),  # ↑
    0x2193: (6, ["..#..", "..#..", "..#..", "#####", ".###.", "..#.."]),  # ↓
    0x2194: (5, [".#...#.", "##...##", "#######", "##...##", ".#...#."]),  # ↔
    0x279C: (5, ["...#.", "...##", "#####", "...##", "...#."]),  # ➜
    0x203A: (5, ["#..", ".#.", "..#", ".#.", "#.."]),  # ›
    0x2039: (5, ["..#", ".#.", "#..", ".#.", "..#"]),  # ‹
    0x2715: (5, ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"]),  # ✕
    0x2716: (5, ["##.##", "#####", ".###.", "#####", "##.##"]),  # ✖
    0x2713: (5, ["....#", "...##", "#.##.", "###..", ".#..."]),  # ✓
    0x2714: (5, ["....#", "...##", "#.##.", "###..", ".#..."]),  # ✔
    0x221A: (6, ["...###", "...#..", "...#..", "#..#..", ".#.#..", "..#..."]),  # √
    0x2212: (3, ["#####"]),  # −
    0x2248: (4, [".#..#", "#.##.", ".....", ".#..#", "#.##."]),  # ≈
    0x266A: (6, ["..##.", "..#.#", "..#..", "..#..", "###..", "###.."]),  # ♪
    0x2665: (5, [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."]),  # ♥
    0x2600: (6, ["...#...", ".#...#.", "..###..", "#.###.#", "..###..", ".#...#.", "...#..."]),  # ☀
    0x2602: (6, ["..###..", ".#####.", "#######", "...#...", "...#...", ".#.#...", "..#...."]),  # ☂
    0x2744: (6, ["...#...", ".#.#.#.", "..###..", "#######", "..###..", ".#.#.#.", "...#..."]),  # ❄
    0x2691: (6, ["#####.", "######", "#####.", "#.....", "#.....", "#.....", "#....."]),  # ⚑
    0x1F6A9: (6, ["##....", "####..", "#####.", "####..", "##....", "#.....", "#....."]),  # 🚩
    0x1F3C6: (6, ["#######", "#.###.#", ".#####.", "..###..", "...#...", "..###..", ".#####."]),  # 🏆
    0x1F389: (6, [".....#.", ".#.#...", "....#.#", "...##..", "..###.#", ".####..", "#####.."]),  # 🎉
    0x1F3C8: (5, ["..###..", ".#####.", "##.#.##", ".#####.", "..###.."]),  # 🏈
    0x21BB: (6, ["..###.#", ".#...##", "#...###", "#......", "#.....#", ".#...#.", "..###.."]),  # ↻
    0x25CF: (5, [".###.", "#####", "#####", "#####", ".###."]),  # ●
    0x25CB: (5, [".###.", "#...#", "#...#", "#...#", ".###."]),  # ○
    0x25A0: (5, ["#####", "#####", "#####", "#####", "#####"]),  # ■
    0x25A1: (5, ["#####", "#...#", "#...#", "#...#", "#####"]),  # □
    0x25C6: (5, ["..#..", ".###.", "#####", ".###.", "..#.."]),  # ◆
    0x23F8: (5, ["##.##", "##.##", "##.##", "##.##", "##.##"]),  # ⏸
    0x26A1: (6, ["..##", ".##.", "####", ".##.", "##..", "#..."]),  # ⚡
    0x1F525: (6, ["..#..", ".##..", ".###.", "##.##", "#...#", ".###."]),  # 🔥
}


def glyph(rows, top):
    pen = TTGlyphPen(None)
    for r, line in enumerate(rows):
        y1 = (top - r) * U
        x = 0
        while x < len(line):
            if line[x] == '#':
                s = x
                while x < len(line) and line[x] == '#':
                    x += 1
                pen.moveTo((s * U + U, y1)); pen.lineTo((x * U + U, y1))
                pen.lineTo((x * U + U, y1 - U)); pen.lineTo((s * U + U, y1 - U)); pen.closePath()
            else:
                x += 1
    w = max(len(l) for l in rows) + 2
    return pen.glyph(), w * U


def build(out):
    order = ['.notdef']   # no space: letters and spaces always come from Silkscreen / Tiny5
    glyphs = {'.notdef': TTGlyphPen(None).glyph()}
    metrics = {'.notdef': (512, 0)}
    cmap = {}
    for cp, (top, rows) in G.items():
        n = 'u%04X' % cp
        g, adv = glyph(rows, top)
        glyphs[n] = g
        metrics[n] = (adv, U)
        cmap[cp] = n
        order.append(n)
    fb = FontBuilder(1024, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=896, descent=-256)
    fb.setupNameTable({'familyName': 'GL Pixel Symbols', 'styleName': 'Regular'})
    fb.setupOS2(sTypoAscender=896, sTypoDescender=-256, usWinAscent=896, usWinDescent=256, sCapHeight=640, sxHeight=512)
    fb.setupPost()
    fb.save(out)


if __name__ == '__main__':
    build(str(pathlib.Path(__file__).resolve().parent / 'glpixsym.ttf'))
    print('wrote glpixsym.ttf')
    print('unicode-range:' + ','.join('U+%X' % c for c in sorted(G)))

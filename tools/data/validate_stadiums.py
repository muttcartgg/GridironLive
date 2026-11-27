#!/usr/bin/env python3
"""Validates stadium "model" objects (schema v3) in the stadiums pack or in tools/data/stadium_models.json.

  python3 -I tools/data/validate_stadiums.py [file]     (default: /home/claude/packs/gridiron-live-2026-stadiums.json)

Checks every enum, key, range and cross-rule of the schema (press box only on the press side, which must be a
sideline; four compass sides; four corners; hex colours; ...) and a rough seat estimate against "capacity" (warning
only, the generator rescales rows). Exit status 1 on any error.
"""
import sys, json, math, re

AXIS = {'NS', 'EW'}
PLAN = {'oval', 'rect', 'rounded'}
TYPE = {'stand', 'open', 'hill', 'building', 'plaza'}
CORNER = {'full', 'lower', 'none'}
LIGHTS = {'towers', 'rim', 'canopy', 'poles', 'dome'}
ROOF = {'open', 'canopy', 'dome', 'retractable'}
EXT = {'brick-arches', 'brick', 'concrete', 'precast', 'glass', 'steel', 'stone', 'berm'}
PATTERN = {'solid', 'stripes', 'sections', 'checker', 'letters'}
SURFACE = {'grass', 'turf'}
EZ = {'name', 'checker', 'diagonal', 'solid'}
SURROUND = {'campus', 'trees', 'river', 'lake', 'mountains', 'city', 'hills', 'parking', 'desert', 'ocean'}
LANDMARKS = {'rotunda', 'tower', 'hedges', 'bridge', 'statues', 'arch', 'bell', 'skyline', 'hill-letter', 'boathouse'}
TOP = {'v', 'axis', 'pressSide', 'plan', 'stands', 'corners', 'ribbons', 'lights', 'roof', 'exterior', 'seats', 'field',
       'track', 'surround', 'landmarks', 'notes', 'approx'}
SIDE_KEYS = {'type', 'tiers', 'suites', 'pressBox', 'canopy', 'height', 'board'}
HEX = re.compile(r'^#[0-9a-fA-F]{6}$')


def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def estimate(m):
    """Seats ~ rows x stand length x 1.7 seats/yd, corners as quarter rings (same rule the data author used)."""
    long_sides = ('E', 'W') if m['axis'] == 'NS' else ('N', 'S')
    rows = lambda s, first=False: (s.get('tiers') or [{'rows': 0}])[0]['rows'] if first else sum(t['rows'] for t in s.get('tiers') or [])
    total = sum(rows(s) * (125 if k in long_sides else 65) * 1.7 for k, s in m['stands'].items())
    for k, v in m['corners'].items():
        if v != 'none':
            a, b = (rows(m['stands'][x], v == 'lower') for x in k)
            r = min(a, b) if a and b else 0.5 * max(a, b)
            total += 1.7 * math.pi / 2 * (r * 8 + 0.95 * r * (r - 1) / 2)
    return total


def check(m, err):
    if not isinstance(m, dict):
        return err('model is not an object')
    for k in set(m) - TOP:
        err(f'unknown key {k!r}')
    if m.get('v') != 3:
        err(f"v must be 3, got {m.get('v')!r}")
    axis = m.get('axis')
    if axis not in AXIS:
        err(f'axis {axis!r}')
    sidelines = ('W', 'E') if axis == 'NS' else ('N', 'S')
    if m.get('pressSide') not in sidelines:
        err(f"pressSide {m.get('pressSide')!r} is not a sideline for axis {axis}")
    if m.get('plan') not in PLAN:
        err(f"plan {m.get('plan')!r}")
    st = m.get('stands')
    if not isinstance(st, dict) or set(st) != {'N', 'E', 'S', 'W'}:
        return err('stands must have exactly N, E, S, W')
    for k, s in st.items():
        e = lambda msg: err(f'stands.{k}: {msg}')
        for x in set(s) - SIDE_KEYS:
            e(f'unknown key {x!r}')
        if s.get('type') not in TYPE:
            e(f"type {s.get('type')!r}")
        tiers = s.get('tiers', [])
        if s.get('type') == 'stand' and not tiers:
            e('stand without tiers')
        for i, t in enumerate(tiers):
            if not (isinstance(t.get('rows'), int) and 1 <= t['rows'] <= 150):
                e(f'tier {i + 1} rows {t.get("rows")!r}')
            if not (is_num(t.get('rake')) and 0.35 <= t['rake'] <= 0.8):
                e(f'tier {i + 1} rake {t.get("rake")!r} (0.35-0.8)')
            for x in ('gap', 'overhang'):
                if x in t and not (is_num(t[x]) and 0 <= t[x] <= 30):
                    e(f'tier {i + 1} {x} {t[x]!r}')
            for x in set(t) - {'rows', 'rake', 'gap', 'overhang'}:
                e(f'tier {i + 1} unknown key {x!r}')
        for su in s.get('suites', []):
            if not (isinstance(su.get('afterTier'), int) and 1 <= su['afterTier'] <= len(tiers)):
                e(f'suites afterTier {su.get("afterTier")!r} (tiers: {len(tiers)})')
            if not (isinstance(su.get('levels'), int) and 1 <= su['levels'] <= 6):
                e(f'suites levels {su.get("levels")!r}')
        if s.get('pressBox') and k != m.get('pressSide'):
            e('pressBox only on pressSide')
        for x in ('pressBox', 'canopy'):
            if x in s and not isinstance(s[x], bool):
                e(f'{x} must be boolean')
        if 'height' in s and not (is_num(s['height']) and 0 <= s['height'] <= 80):
            e(f"height {s['height']!r}")
        if 'board' in s and not (isinstance(s['board'], dict) and set(s['board']) == {'w', 'h'}
                                 and all(is_num(v) and 0 < v <= 120 for v in s['board'].values())):
            e(f"board {s['board']!r}")
    if not st.get(m.get('pressSide'), {}).get('pressBox'):
        err('no pressBox on the pressSide stand')
    c = m.get('corners')
    if not isinstance(c, dict) or set(c) != {'NE', 'NW', 'SE', 'SW'} or not set(c.values()) <= CORNER:
        err(f'corners {c!r}')
    if m.get('ribbons') not in (0, 1, 2) or isinstance(m.get('ribbons'), bool):
        err(f"ribbons {m.get('ribbons')!r}")
    if m.get('lights') not in LIGHTS:
        err(f"lights {m.get('lights')!r}")
    if m.get('roof') not in ROOF:
        err(f"roof {m.get('roof')!r}")
    if m.get('roof') == 'dome' and m.get('lights') != 'dome':
        err('roof dome needs lights dome')
    ex = m.get('exterior') or {}
    if ex.get('style') not in EXT or not all(HEX.match(str(ex.get(x, ''))) for x in ('color', 'trim')):
        err(f'exterior {ex!r}')
    se = m.get('seats') or {}
    if se.get('pattern') not in PATTERN or not se.get('colors') or not all(HEX.match(str(x)) for x in se['colors']):
        err(f'seats {se!r}')
    if not isinstance(se.get('letters', ''), str) or (se.get('pattern') == 'letters' and not se.get('letters')):
        err('seats.letters must be a string (non-empty for pattern "letters")')
    f = m.get('field') or {}
    if f.get('surface') not in SURFACE or f.get('endzones') not in EZ or not HEX.match(str(f.get('ezColor', ''))) \
            or not (f.get('color') is None or HEX.match(str(f['color']))):
        err(f'field {f!r}')
    if not isinstance(m.get('track'), bool):
        err('track must be boolean')
    for key, allowed in (('surround', SURROUND), ('landmarks', LANDMARKS)):
        v = m.get(key)
        if not isinstance(v, list) or not set(v) <= allowed or len(set(v)) != len(v):
            err(f'{key} {v!r}')
    n = m.get('notes')
    if not isinstance(n, str) or not n or '\n' in n or len(n) > 240:
        err(f'notes must be one short line ({len(n or "")} chars)')
    if not isinstance(m.get('approx'), bool):
        err('approx must be boolean')


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/packs/gridiron-live-2026-stadiums.json'
    doc = json.load(open(path))
    errors, warns = [], []
    if 'stadiums' in doc:      # a pack
        if doc.get('format') != 'gridiron-live-stadiums' or doc.get('version') != 2:
            errors.append(f"pack format/version {doc.get('format')!r}/{doc.get('version')!r} (want gridiron-live-stadiums/2)")
        items = [(e.get('team'), e) for e in doc['stadiums']]
        if len(items) != 138:
            errors.append(f'{len(items)} stadiums, expected 138')
    else:                      # tools/data/stadium_models.json
        items = [(k, {'model': v}) for k, v in doc.items()]
    seen = set()
    for team, e in items:
        if team in seen:
            errors.append(f'{team}: duplicate')
        seen.add(team)
        if 'model' not in e:
            errors.append(f'{team}: no model')
            continue
        check(e['model'], lambda msg, t=team: errors.append(f'{t}: {msg}'))
        if 'capacity' in e and not any(x.startswith(f'{team}:') for x in errors):
            r = estimate(e['model']) / e['capacity']
            if not 0.6 <= r <= 1.5:
                warns.append(f'{team}: seat estimate {r:.2f} x capacity')
    n_approx = sum(1 for _, e in items if e.get('model', {}).get('approx'))
    for w in warns:
        print('warning:', w)
    for x in errors:
        print('ERROR:', x)
    print(f'{path}: {len(items)} entries, {len(items) - sum(1 for _, e in items if "model" not in e)} with a model, '
          f'{n_approx} approx, {len(errors)} errors, {len(warns)} warnings -> {"FAIL" if errors else "OK"}')
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Builds the optional real-stadiums file for Gridiron Live (NOT shipped with the app).

  python3 -I tools/data/build_stadiums.py [outdir]      (default outdir: /home/claude/packs)

Output: gridiron-live-2026-stadiums.json (format "gridiron-live-stadiums", version 1): one entry per FBS program's
2026 home stadium, matched to game teams by abbr/espnId/school exactly like a roster pack (see docs/PACKS.md).
Facts: 2026 home venues from the CFBD 2026 schedules (most-used non-neutral venue), city/state/elevation/roof from the
CFBD team-info file, capacity/opened/surface from Wikipedia "List of NCAA Division I FBS football stadiums" (Nov 2026).
Architecture (shape, decks, ends, press box, video board, seats, signature features) is a stylized description written
for the game's renderer from general knowledge; entries we are not sure about carry "approx": true.
"""
import os, sys, json, collections
import pandas as pd

DATA = os.environ.get('CFBD_DIR', '/home/claude/data/cfbd')
EXTRA = os.environ.get('CFBD_EXTRA', '/tmp/claude-0/-home-claude/aa463a5f-8d8d-586a-b50d-7e483b2bac12/scratchpad/pk-dl')
PACK = os.environ.get('PACK', '/home/claude/packs/gridiron-live-2026-rosters.json')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/packs'

FEATURES = ['hedges', 'hill', 'turf', 'checker', 'mountains', 'water', 'skyline', 'trees', 'tower', 'arches', 'cards', 'pyro', 'dome', 'board', 'canopy']
# ABBR | Wikipedia name | capacity | opened | G grass/hybrid, A artificial |
#   shape axis press ends decks(press/opp) board seats turf sure | features
# shape: bowl (enclosed), horse (horseshoe), u (sidelines + one end), side (two sideline stands)
# ends: one letter per end in axis order (NS: north then south, EW: east then west):
#   L large (full height), M medium (one deck), S small bleachers, B grass hill/berm, X building/facility, O open
# seats: team | primary (all primary color) | metal (aluminum bleachers) | #hex/#hex
T = """
ALA|Bryant–Denny Stadium|100077|1929|G|bowl NS W LL 3/3 N primary - 1|pyro
ARK|Donald W. Reynolds Razorback Stadium|76212|1938|A|bowl NS W LM 3/2 S team - 0|board
AUB|Jordan–Hare Stadium|88043|1939|G|bowl NS W LL 3/2 S team - 1|
UF|Ben Hill Griffin Stadium|88548|1930|G|bowl NS W LL 3/2 S team - 1|
UGA|Sanford Stadium|93033|1929|G|bowl EW S LM 3/2 W primary - 0|hedges
UK|Kroger Field|61000|1973|A|bowl NS W MM 2/2 S team - 0|
LSU|Tiger Stadium|102321|1924|G|bowl NS W LL 3/3 N team - 1|pyro
MSST|Davis Wade Stadium|60311|1914|G|bowl NS W LM 3/2 S primary - 0|
MIZ|Faurot Field at Memorial Stadium|65000|1926|A|horse NS W BL 2/2 N team - 0|hill
OU|Gaylord Family Oklahoma Memorial Stadium|80126|1923|G|bowl NS W LL 3/2 N team - 0|
MISS|Vaught–Hemingway Stadium|64038|1915|G|bowl NS W LL 3/2 S team - 0|trees
SC|Williams–Brice Stadium|77559|1934|G|bowl NS W LL 3/3 S primary - 0|pyro
TENN|Neyland Stadium|101915|1921|G|bowl NS W LL 3/3 N team - 1|checker
TEX|Darrell K Royal–Texas Memorial Stadium|100119|1924|A|bowl NS W LL 3/3 S primary - 1|tower,skyline
TAMU|Kyle Field|102733|1927|G|bowl NS W LL 3/3 S primary - 1|board
VAN|FirstBank Stadium|40350|1922|A|bowl NS W MM 1/1 S team - 0|skyline
ILL|Gies Memorial Stadium|60670|1923|A|horse NS W XL 2/2 N team - 0|board
IU|Memorial Stadium|53524|1960|A|u NS W XM 2/1 S team - 0|
IOWA|Kinnick Stadium|69250|1929|A|bowl NS W LL 2/1 S metal - 1|
MD|SECU Stadium|46185|1950|A|horse EW S OL 2/1 E team - 0|trees
MICH|Michigan Stadium|107601|1927|A|bowl NS W LL 1/1 N metal - 1|
MSU|Spartan Stadium|74866|1923|G|bowl NS W LM 3/2 S team - 0|
MINN|Huntington Bank Stadium|50805|2009|A|horse EW S LO 2/1 W team - 0|skyline,board
NEB|Memorial Stadium|85458|1923|A|bowl NS W LL 3/3 N primary - 1|
NW|Ryan Field|35000|2026|A|bowl NS W MM 2/1 S team - 0|
OSU|Ohio Stadium|102780|1922|A|horse NS W LM 3/3 S team - 1|board
ORE|Autzen Stadium|54000|1967|A|bowl EW S LL 2/1 E team - 0|pyro,trees
PSU|Beaver Stadium|106572|1959|G|bowl NS W LL 3/3 S metal - 1|mountains
PUR|Ross–Ade Stadium|61441|1924|G|horse NS W OL 2/1 N team - 0|
RUTG|SHI Stadium|52454|1994|A|bowl NS W MM 2/1 N team - 0|
UCLA|Rose Bowl|89702|1922|G|bowl NS W LL 1/1 S team - 1|mountains
USC|Los Angeles Memorial Coliseum|77500|1923|G|bowl EW S ML 1/1 E primary - 1|arches,cards,skyline
UW|Husky Stadium|70083|1920|A|horse EW S OL 2/2 W primary - 1|water,mountains,canopy
WIS|Camp Randall Stadium|76057|1917|A|bowl NS E XL 2/2 N metal - 0|
ARIZ|Casino Del Sol Stadium|50782|1928|A|bowl NS W XM 2/2 S team - 0|mountains
ASU|Mountain America Stadium|53599|1958|G|bowl NS W MM 2/2 S team - 0|mountains
BAY|McLane Stadium|45140|2014|A|horse NS W LO 2/1 S team - 0|water
BYU|LaVell Edwards Stadium|62073|1964|G|bowl NS W LL 1/1 N team - 1|mountains
CIN|Nippert Stadium|38088|1915|A|u NS W OM 2/1 S team - 0|skyline
COLO|Folsom Field|50183|1924|A|bowl NS E LM 2/1 N team - 0|mountains
HOU|TDECU Stadium|39700|2014|A|horse NS W OL 2/1 N team - 1|skyline,board
ISU|Jack Trice Stadium|61500|1975|G|bowl NS W ML 2/2 N team - 0|
KU|David Booth Kansas Memorial Stadium|41525|1921|A|horse NS W BL 2/1 S team - 0|hill,tower
KSU|Bill Snyder Family Football Stadium|50000|1968|A|bowl NS W LM 3/2 S primary - 0|
OKST|Boone Pickens Stadium|52305|1919|A|bowl EW S LX 2/2 W team - 0|
TCU|Amon G. Carter Stadium|47000|1929|G|bowl NS W LM 2/2 S team - 0|
TTU|Jones AT&T Stadium|60229|1947|A|bowl NS W MX 2/2 N team - 0|
UCF|FBC Mortgage Stadium|44206|2007|G|horse NS W OL 2/1 N team - 0|
UTAH|Rice–Eccles Stadium|51444|1998|A|bowl NS W ML 2/2 N team - 0|mountains
WVU|Milan Puskar Stadium|60000|1980|A|horse NS W OL 2/1 N team - 0|trees
BC|Alumni Stadium|44500|1957|A|u NS W OM 2/1 N team - 0|trees
CAL|California Memorial Stadium|62467|1923|A|bowl NS W LL 1/1 S team - 1|cards,tower,trees
CLEM|Memorial Stadium|81500|1942|G|bowl EW S BX 2/2 E team - 0|hill,pyro
DUKE|Wallace Wade Stadium|35018|1929|G|horse NS W OL 2/1 S team - 0|trees
FSU|Doak S. Campbell Stadium|67277|1950|G|bowl NS W LL 3/3 S team - 1|pyro
GT|Bobby Dodd Stadium|51913|1913|A|horse NS W SL 2/2 N team - 1|skyline
LOU|L&N Federal Credit Union Stadium|60800|1998|A|bowl NS W LM 2/2 S team - 0|
MIA|Hard Rock Stadium|64767|1987|G|bowl NS W LL 3/3 N team - 0|canopy
UNC|Kenan Stadium|50500|1927|A|bowl EW S XM 2/1 W team - 0|trees
NCST|Carter–Finley Stadium|56919|1966|G|bowl NS W MX 2/1 S team - 0|
PITT|Acrisure Stadium|68400|2001|G|horse NS W LO 3/3 S team - 0|skyline,water,board
SMU|Gerald J. Ford Stadium|32000|2000|A|horse NS W XL 2/1 N team - 0|skyline
STAN|Stanford Stadium|50424|1921|G|bowl NS W MM 2/1 N team - 0|trees,tower
SYR|JMA Wireless Dome|42784|1980|A|bowl EW S LL 2/2 E team - 1|dome
UVA|Scott Stadium|61500|1931|G|horse NS W BL 2/2 N team - 0|hill
VT|Lane Stadium|65632|1965|G|bowl NS W ML 2/2 N team - 0|pyro,mountains
WAKE|Allegacy Federal Credit Union Stadium|31500|1968|A|u NS W OM 2/1 S team - 0|trees
ARMY|Michie Stadium|38000|1924|A|u NS W OM 1/1 N team - 0|water,mountains
CLT|Jerry Richardson Stadium|15314|2013|A|u NS W BX 1/1 N team - 0|
ECU|Dowdy–Ficklen Stadium|51000|1963|G|bowl NS W LM 2/1 S team - 0|
FAU|FAU Stadium|30000|2011|G|horse NS W OL 2/1 N team - 0|water
MEM|Simmons Bank Liberty Stadium|50000|1965|A|bowl NS W MM 2/1 S team - 0|
NAVY|Navy–Marine Corps Memorial Stadium|34000|1959|A|bowl NS W MM 2/1 S team - 0|
UNT|DATCU Stadium|30100|2011|A|u NS W BX 2/1 N team - 0|
RICE|Rice Stadium|47000|1950|A|bowl NS W MX 1/1 N team - 0|skyline
USF|Raymond James Stadium|65857|1998|G|bowl NS W LL 3/3 N team - 0|
TEM|Lincoln Financial Field|67594|2003|G|bowl NS W LL 3/3 N team - 0|skyline
TUL|Yulman Stadium|30000|2014|A|u NS W OX 2/1 N team - 0|
TLSA|Chapman Stadium|30000|1930|A|u NS W MO 1/1 S team - 0|
UAB|Protective Stadium|47100|2021|A|horse NS W LO 2/1 S team - 0|skyline,board
UTSA|Alamodome|64000|1993|A|bowl NS W LL 3/3 N team - 1|dome
APP|Kidd Brewer Stadium|30000|1962|A|u NS W BX 2/1 N team - 0|mountains,trees
ARST|Centennial Bank Stadium|30406|1974|A|u NS W XO 2/1 S team - 0|
CCU|Brooks Stadium|21000|2003|A|side NS W SO 1/1 S team #1b8f8c 1|turf
GASO|Allen E. Paulson Stadium|25000|1984|A|u NS W BM 1/1 N team - 0|trees
GAST|Center Parc Stadium|24333|1996|A|u NS W OM 2/1 N team - 0|skyline
JMU|Bridgeforth Stadium|24877|1975|A|u NS W MO 2/1 S team - 0|mountains
ULL|Cajun Field|30000|1971|A|bowl NS W MM 1/1 S team - 0|
ULM|Malone Stadium|27617|1978|A|u NS W OM 2/1 N team - 0|
LT|Joe Aillet Stadium|28562|1968|A|u NS W OX 2/1 N team - 0|
MRSH|Joan C. Edwards Stadium|30475|1991|A|horse NS W OL 2/1 N team - 0|
ODU|S.B. Ballard Stadium|21944|1936|A|u NS W MO 2/1 S team - 0|
USA|Hancock Whitney Stadium|25450|2020|A|side NS W SX 2/1 S team - 0|
USM|M. M. Roberts Stadium|36000|1932|A|u NS W OL 2/1 N team - 0|
TROY|Veterans Memorial Stadium|30470|1950|A|u NS W LO 2/1 S team - 0|
BOIS|Albertsons Stadium|36387|1970|A|u NS W MX 2/1 S team #1d4fb0 1|turf,board,mountains
CSU|Canvas Stadium|41000|2017|A|u NS E BM 2/1 N team - 0|mountains
FRES|Valley Children's Stadium|40727|1980|A|bowl NS W LL 1/1 S team - 0|
ORST|Reser Stadium|35548|1953|A|u NS W MX 2/2 S team - 0|trees
SDSU|Snapdragon Stadium|35000|2022|G|bowl NS W MM 2/1 N team - 0|canopy
TXST|UFCU Stadium|28388|1981|A|u NS W MO 2/1 S team - 0|
USU|Maverik Stadium|25513|1968|A|u NS W MO 2/1 S team - 0|mountains
WSU|Martin Stadium|32952|1972|A|u EW S OX 2/1 E team - 0|
AF|Falcon Stadium|39441|1962|A|bowl NS W MM 1/1 S team - 0|mountains
HAW|Clarence T. C. Ching Athletics Complex|15194|2015|A|side NS W OO 1/1 S team - 0|mountains,trees
NEV|Mackay Stadium|27000|1966|A|u NS W MO 2/1 S team - 0|mountains
UNM|University Stadium|39224|1960|A|horse NS W OL 2/1 N team - 0|mountains
SJSU|CEFCU Stadium|18203|1933|A|side NS W SO 1/1 S team - 0|
UNLV|Allegiant Stadium|65000|2020|A|bowl NS W LL 3/3 S team - 1|dome,skyline
WYO|War Memorial Stadium|29811|1950|A|side NS W BO 2/1 S team - 0|mountains
UTEP|Sun Bowl Stadium|51500|1963|A|bowl NS W LM 1/1 S team - 0|mountains
NIU|Huskie Stadium|28211|1965|A|u NS W OX 2/1 N team - 0|
NDSU|Fargodome|18700|1992|A|bowl NS W MM 1/1 N team - 1|dome
DEL|Delaware Stadium|18500|1952|A|u NS W OS 1/1 S team - 0|
FIU|Pitbull Stadium|20000|1995|A|u NS W OM 1/1 S team - 0|
JVST|AmFirst Stadium|22500|1947|A|u NS W MO 2/1 S team - 0|
KENN|Fifth Third Stadium|10200|2010|G|side NS W SO 1/1 S team - 0|
LIB|Williams Stadium|25000|1989|A|u NS W OM 2/1 S team - 0|mountains
MTSU|Johnny "Red" Floyd Stadium|27303|1933|A|u NS W OM 2/1 N team - 0|
MOST|Robert W. Plaster Stadium|17500|1941|A|u NS W OS 2/1 N team - 0|
NMSU|Aggie Memorial Stadium|28853|1978|A|bowl NS W MM 1/1 S team - 0|mountains
SHSU|Elliott T. Bowers Stadium|14000|1986|A|side NS W SO 1/1 S team - 0|
WKU|Houchens Industries–L. T. Smith Stadium|22113|1968|A|u NS W OM 2/1 S team - 0|
AKR|InfoCision Stadium|30000|2009|A|u NS W XO 2/1 S team - 0|skyline
BALL|Scheumann Stadium|22500|1967|A|u NS W BM 1/1 N team - 0|
BGSU|Doyt L. Perry Stadium|33572|1966|A|side NS W SO 2/1 S team - 0|
BUFF|UB Stadium|25013|1993|A|u NS W OM 1/1 N team - 0|
CMU|Kelly/Shorts Stadium|35127|1972|A|horse NS W OL 2/1 N team - 0|
EMU|Rynearson Stadium|26188|1969|A|side NS W SO 2/1 S team - 0|
KENT|Dix Stadium|25319|1969|A|side NS W SO 2/1 S team - 0|
M-OH|Yager Stadium|30087|1983|A|u NS W OM 2/1 N team - 0|trees
OHIO|Peden Stadium|24000|1929|A|u NS W MO 1/1 S team - 0|trees
SAC|Hornet Stadium|21195|1969|A|side NS W OO 1/1 S team - 0|
TOL|Glass Bowl|26038|1937|A|bowl NS W MM 1/1 S team - 0|
MASS|Warren McGuirk Alumni Stadium|17000|1965|A|side NS W SO 1/1 S team - 0|
WMU|Waldo Stadium|36361|1939|A|u NS W OM 2/1 N team - 0|
ND|Notre Dame Stadium|77622|1930|A|bowl NS W LL 2/2 S team - 1|tower
UCON|Pratt & Whitney Stadium at Rentschler Field|38000|2003|G|horse NS W OL 2/1 N team - 0|
"""
# a few programs have no espnId in the team-info file
FALLBACK = {'UTSA': ('San Antonio', 'TX', 198), 'APP': ('Boone', 'NC', 1016), 'ULM': ('Monroe', 'LA', 23), 'USM': ('Hattiesburg', 'MS', 50),
            'SHSU': ('Huntsville', 'TX', 120), 'MASS': ('Amherst', 'MA', 80), 'UCON': ('East Hartford', 'CT', 20)}
# display names where the schedule's venue name is too generic or names the field instead of the stadium
NAME = {'MIZ': 'Faurot Field at Memorial Stadium', 'OU': 'Gaylord Family Oklahoma Memorial Stadium', 'ILL': 'Gies Memorial Stadium',
        'KU': 'David Booth Kansas Memorial Stadium', 'WSU': 'Martin Stadium', 'MOST': 'Robert W. Plaster Stadium', 'UTEP': 'Sun Bowl Stadium'}
CW = {'N': 'E', 'E': 'S', 'S': 'W', 'W': 'N'}   # compass turned 90° clockwise
SHAPE = {'bowl': 'enclosed bowl', 'horse': 'horseshoe', 'u': 'U (sidelines + one end)', 'side': 'two sideline grandstands'}
ENDS = {'L': 'large', 'M': 'medium', 'S': 'small', 'B': 'hill', 'X': 'building', 'O': 'open'}


def main():
    pk = json.load(open(PACK))
    teams = {t['abbr']: t for t in pk['teams'] if t.get('division') == 'FBS'}
    inf = pd.read_parquet(os.path.join(EXTRA, 'cfb_team_info_2026.parquet')).set_index('team_id')
    sch = pd.read_parquet(os.path.join(DATA, 'schedules', 'parquet', 'cfb_schedules_2026.parquet'))
    hv = collections.defaultdict(collections.Counter)
    for r in sch.itertuples():
        if not r.neutral_site:
            hv[r.home_team][r.venue] += 1
    out, seen = [], set()
    for line in T.strip().splitlines():
        ab, wname, cap, opened, surf, arch, feats = line.split('|')
        shape, axis, press, ends, decks, board, seats, turf, sure = arch.split()
        t = teams[ab]
        seen.add(ab)
        i = inf.loc[t['espnId']] if t.get('espnId') in inf.index else None
        if i is not None:
            city, state, elev, dome = i.city, i.state, float(i.elevation) if pd.notna(i.elevation) else None, bool(i.dome)
        else:
            city, state, elev = FALLBACK[ab]
            dome = False
        venues = hv.get(t.get('dataName')) or hv.get(t['school']) or collections.Counter()
        vname = venues.most_common(1)[0][0] if venues else wname
        vname = vname.split(' (')[0].replace('-', '–') if '(' in vname else vname.replace('-', '–')
        vname = NAME.get(ab, vname)
        fl = [f for f in feats.split(',') if f]
        assert all(f in FEATURES for f in fl) and len(fl) <= 3, (ab, fl)
        roof = 'dome' if 'dome' in fl or dome else 'open'
        e1, e2 = ('N', 'S') if axis == 'NS' else ('E', 'W')
        endmap = {e1: ENDS[ends[0]], e2: ENDS[ends[1]]}
        dp, do = (int(x) for x in decks.split('/'))
        # renderer frame: the camera sits across from the press box (the press-box stands are the far stands);
        # facing the press box, the right-hand end is the compass point 90° clockwise of the press side
        right = CW[press]
        left = {e1: e2, e2: e1}[right]
        e = {'team': ab, 'school': t['school'], 'espnId': t.get('espnId'), 'conference': t.get('conference'),
             'name': vname, 'city': city, 'state': state, 'capacity': int(cap), 'opened': int(opened),
             'surface': 'grass' if surf == 'G' else 'artificial', 'roof': roof}
        if wname.replace('-', '–') != vname:
            e['aka'] = wname
        if turf != '-':
            e['turf'] = turf
        if elev is not None and elev >= 600:
            e['elevation_ft'] = int(round(elev * 3.28084 / 10) * 10)
        if venues and len(venues) > 1:
            e['also'] = [v for v, _ in venues.most_common()[1:3]]
        open_end = [k for k, v in endmap.items() if v == 'open']
        e['architecture'] = {
            'shape': shape, 'shapeText': SHAPE[shape] + (f' open to the {open_end[0]}' if shape in ('horse', 'u') and open_end else ''),
            'axis': axis, 'pressBox': press, 'decks': {'pressSide': dp, 'otherSide': do},
            'ends': endmap, 'videoBoard': board if board != '-' else None,
            'seats': seats if not seats.startswith('#') else seats.split('/'), 'features': fl,
            'view': {'far': press, 'left': left, 'right': right}}
        if sure != '1':
            e['approx'] = True
        out.append(e)
    missing = sorted(set(teams) - seen)
    assert not missing, missing
    doc = {'format': 'gridiron-live-stadiums', 'version': 1, 'season': 2026, 'name': 'FBS stadiums 2026',
           'notes': 'Personal file, not part of the app. Facts: CFBD 2026 schedules + team info, Wikipedia FBS stadium list (Nov 2026). '
                    'Architecture is a stylized description for the game renderer; "approx": true marks guesses. '
                    'ends L/M/S = stand size, hill = grass berm, building = facility, open = no stands (backdrop shows).',
           'features': FEATURES, 'stadiums': out}
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'gridiron-live-2026-stadiums.json')
    with open(path, 'w') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    n_approx = sum(1 for e in out if e.get('approx'))
    print(f'wrote {path}: {len(out)} stadiums, {n_approx} approx, {os.path.getsize(path)//1024} KB')


if __name__ == '__main__':
    main()

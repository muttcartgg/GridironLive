#!/usr/bin/env python3
"""Builds the optional real-rosters pack for Gridiron Live (NOT shipped with the app).

  python3 -I tools/data/build_pack.py [outdir]      (default outdir: /home/claude/packs)

Inputs (local clone of github.com/sportsdataverse/cfbfastR-data, see docs/PACKS.md):
  rosters/parquet/rosters_2026.parquet, player_stats/csv/player_stats_2025.csv + _2026.csv,
  teams/teams_colors_logos.csv (ESPN ids, colors, logo URLs), team_info/parquet/cfb_team_info_2026.parquet (venues).
Output: gridiron-live-2026-rosters.json (format "gridiron-live-pack" v2) + custom-players-template.json.
Logos are links to the ESPN CDN only; images are never downloaded or embedded. Output is deterministic.
"""
import os, re, sys, json, math, hashlib, random
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DATA = os.environ.get('CFBD_DIR', '/home/claude/data/cfbd')
EXTRA = os.environ.get('CFBD_EXTRA', '/tmp/claude-0/-home-claude/aa463a5f-8d8d-586a-b50d-7e483b2bac12/scratchpad/pk-dl')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/packs'

# ---------- game constants (mirrors src/js/02-data.js) ----------
POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']
POS_COUNTS = {'QB': 3, 'RB': 4, 'WR': 6, 'TE': 3, 'OL': 10, 'DL': 8, 'LB': 6, 'CB': 5, 'S': 4, 'K': 2}
STARTERS = {'QB': 1, 'RB': 1, 'WR': 3, 'TE': 1, 'OL': 5, 'DL': 4, 'LB': 2, 'CB': 3, 'S': 2, 'K': 1}
ROSTER_CAP = 60
ATTR = ['spd', 'agi', 'str', 'awr', 'thr', 'acc', 'cat', 'rte', 'car', 'blk', 'tkl', 'cov', 'shd', 'end']
W8 = {'QB': {'thr': .25, 'acc': .35, 'awr': .25, 'spd': .05, 'agi': .05, 'end': .05}, 'RB': {'spd': .25, 'agi': .2, 'car': .2, 'str': .15, 'cat': .1, 'awr': .05, 'end': .05},
      'WR': {'spd': .25, 'cat': .25, 'rte': .25, 'agi': .1, 'awr': .05, 'str': .05, 'end': .05}, 'TE': {'cat': .2, 'blk': .25, 'str': .15, 'rte': .15, 'spd': .1, 'awr': .1, 'end': .05},
      'OL': {'blk': .45, 'str': .3, 'awr': .15, 'agi': .05, 'end': .05}, 'DL': {'shd': .35, 'str': .25, 'tkl': .15, 'spd': .1, 'agi': .05, 'awr': .05, 'end': .05},
      'LB': {'tkl': .3, 'awr': .2, 'shd': .15, 'cov': .15, 'spd': .1, 'str': .05, 'end': .05}, 'CB': {'cov': .33, 'spd': .27, 'agi': .12, 'cat': .1, 'awr': .1, 'tkl': .05, 'end': .03},
      'S': {'cov': .25, 'tkl': .2, 'spd': .2, 'awr': .2, 'cat': .1, 'agi': .05}, 'K': {'thr': .55, 'acc': .45}}
BIAS = {'QB': {'thr': .5, 'acc': .3, 'awr': .2, 'tkl': -1.8, 'shd': -1.8, 'cov': -1.6, 'blk': -1.4, 'str': -.5, 'car': -.6, 'rte': -1.2},
        'RB': {'spd': .4, 'agi': .4, 'car': .3, 'str': .2, 'thr': -1.8, 'acc': -1.8, 'tkl': -1.2, 'cov': -1.2, 'shd': -1.4, 'blk': -.6, 'rte': -.4},
        'WR': {'spd': .4, 'cat': .3, 'rte': .3, 'agi': .3, 'thr': -1.8, 'acc': -1.8, 'tkl': -1.4, 'cov': -1, 'shd': -1.6, 'blk': -.8, 'str': -.3},
        'TE': {'blk': .1, 'str': .2, 'thr': -1.8, 'acc': -1.8, 'tkl': -1.2, 'cov': -1.4, 'shd': -1.2, 'agi': -.4, 'spd': -.3},
        'OL': {'str': .6, 'blk': .6, 'spd': -.9, 'agi': -.7, 'cat': -1.6, 'rte': -2, 'thr': -2, 'acc': -2, 'car': -1.6, 'cov': -2, 'tkl': -1, 'shd': -.6},
        'DL': {'str': .4, 'shd': .5, 'spd': -.4, 'agi': -.2, 'cat': -1.5, 'rte': -2, 'thr': -2, 'acc': -2, 'car': -1.5, 'cov': -1.5, 'blk': -.6},
        'LB': {'tkl': .3, 'awr': .1, 'shd': .1, 'thr': -2, 'acc': -2, 'rte': -1.6, 'car': -1.2, 'blk': -.8, 'cat': -.6},
        'CB': {'spd': .5, 'cov': .4, 'agi': .4, 'thr': -2, 'acc': -2, 'rte': -.8, 'car': -1, 'blk': -1.4, 'shd': -1.4, 'str': -.4},
        'S': {'spd': .3, 'tkl': .2, 'cov': .2, 'thr': -2, 'acc': -2, 'rte': -1.2, 'car': -1.2, 'blk': -1.2, 'shd': -1},
        'K': {'thr': .3, 'acc': .3, 'spd': -1, 'agi': -1, 'str': -1.2, 'cat': -1.5, 'rte': -2, 'car': -2, 'blk': -2, 'tkl': -1.8, 'cov': -2, 'shd': -2}}
SIZE = {'QB': [75, 1.6, 218, 12], 'RB': [70.5, 1.6, 207, 13], 'WR': [73, 2.2, 192, 14], 'TE': [76.5, 1.2, 247, 12], 'OL': [77, 1.2, 312, 15], 'DL': [75.5, 1.6, 284, 24],
        'LB': [73.5, 1.3, 232, 11], 'CB': [71.5, 1.6, 185, 9], 'S': [72.5, 1.4, 200, 9], 'K': [72.5, 2, 198, 14]}
YRS = ['FR', 'SO', 'JR', 'SR']
clamp = lambda v, a, b: max(a, min(b, v))
r1 = lambda v: round(clamp(v, 1, 5) * 10) / 10
ovr = lambda p: sum(p[k] * w for k, w in W8[p['pos']].items())
o99 = lambda v: 45 + math.pow(clamp((v - 1) / 4, 0, 1), .9) * 52
ovr99 = lambda v: int(clamp(round(o99(v)), 40, 99))


def hrand(*parts):
    """deterministic uniform [-1,1) from any key"""
    h = hashlib.md5('|'.join(str(x) for x in parts).encode()).hexdigest()
    return int(h[:8], 16) / 0x80000000 - 1


# ---------- the game's programs (src/js/02b-ncaa.js) ----------
def game_programs():
    src = open(os.path.join(ROOT, 'src', 'js', '02b-ncaa.js'), encoding='utf-8').read()
    out = []
    for m in re.finditer(r"\{name:'([^']+)',div:'(FBS|FCS)'[^`]*?t:`([^`]*)`", src):
        conf, div, body = m.groups()
        for line in body.strip().split('\n'):
            s, masc, ab, c1, c2, q = line.split('|')
            out.append({'school': s, 'mascot': masc, 'abbr': ab, 'c1': c1, 'c2': c2, 'q': float(q), 'conf': conf, 'div': div})
    return out


def norm(s):
    s = str(s).lower().replace('é', 'e').replace('ʻ', '').replace("'", '').replace('&', ' and ').replace('st.', 'state')
    s = re.sub(r'[().\-]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


ALIAS = {'Appalachian State': 'App State', 'Louisiana-Monroe': 'UL Monroe', 'Hawaii': "Hawai'i", 'San Jose State': 'San José State', 'FIU': 'Florida International',
         'UMass': 'Massachusetts', 'Albany': 'UAlbany', 'Penn': 'Pennsylvania', 'Citadel': 'The Citadel', 'Southeastern Louisiana': 'SE Louisiana',
         'UTRGV': 'UT Rio Grande Valley', 'St. Thomas': 'St. Thomas (MN)', 'LIU': 'Long Island University', 'Pine Bluff': 'Arkansas-Pine Bluff',
         'Grambling State': 'Grambling', 'Miami': 'Miami', 'Miami (OH)': 'Miami (OH)'}


def https(u):
    if not isinstance(u, str) or not u.startswith('http'):
        return None
    return 'https://' + u.split('://', 1)[1]


def hexcol(c):
    return c.upper() if isinstance(c, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', c) else None


# ---------- stats ----------
STAT_COLS = ['game_id', 'team', 'opponent', 'yards_to_goal', 'reception_player_id', 'reception_yds', 'completion_player_id', 'completion_yds', 'rush_player_id', 'rush_yds',
             'interception_player_id', 'interception_thrown_player_id', 'touchdown_player_id', 'incompletion_player_id', 'target_player_id', 'fumble_forced_player_id',
             'fumble_player_id', 'sack_player_id', 'sack_taken_player_id', 'pass_breakup_player_id', 'field_goal_attempt_player_id', 'field_goal_made_player_id',
             'field_goal_attempt_stat']


def season_stats(year):
    d = pd.read_csv(os.path.join(DATA, 'player_stats', 'csv', f'player_stats_{year}.csv'), usecols=STAT_COLS, dtype=str, low_memory=False)
    num = lambda c: pd.to_numeric(d[c], errors='coerce').fillna(0)
    ytg, ry, cy, rcy = num('yards_to_goal'), num('rush_yds'), num('completion_yds'), num('reception_yds')
    S = {}

    def add(col, key, val=None, mask=None):
        m = d[col].notna() & (d[col] != 'NA')
        if mask is not None:
            m &= mask
        ids = d.loc[m, col]
        v = (val[m] if val is not None else pd.Series(1, index=ids.index))
        for pid, x in v.groupby(ids).sum().items():
            S.setdefault(pid, {})[key] = S.get(pid, {}).get(key, 0) + float(x)

    add('completion_player_id', 'comp'); add('completion_player_id', 'pyds', cy); add('completion_player_id', 'ptd', mask=(cy >= ytg) & (ytg > 0))
    add('incompletion_player_id', 'inc'); add('interception_thrown_player_id', 'intt'); add('sack_taken_player_id', 'sckt')
    add('rush_player_id', 'ra'); add('rush_player_id', 'ryds', ry); add('rush_player_id', 'rtd', mask=d.touchdown_player_id == d.rush_player_id)
    add('reception_player_id', 'rec'); add('reception_player_id', 'recy', rcy); add('reception_player_id', 'rectd', mask=(rcy >= ytg) & (ytg > 0))
    add('target_player_id', 'tgt0'); add('fumble_player_id', 'fum')
    add('sack_player_id', 'sck'); add('interception_player_id', 'dint'); add('pass_breakup_player_id', 'pbu'); add('fumble_forced_player_id', 'ff')
    add('field_goal_attempt_player_id', 'fga'); add('field_goal_made_player_id', 'fgm')
    fgd = num('field_goal_attempt_stat')
    add('field_goal_made_player_id', 'fgm40', mask=fgd >= 40); add('field_goal_made_player_id', 'fgm50', mask=fgd >= 50)
    # games the player's team played that season (offense columns use `team`, defense columns use `opponent`)
    games = pd.concat([d[['game_id', 'team']].rename(columns={'team': 't'}), d[['game_id', 'opponent']].rename(columns={'opponent': 't'})]).drop_duplicates()
    tg = games.groupby('t').size().to_dict()
    pteam = {}
    for col, tc in [('completion_player_id', 'team'), ('rush_player_id', 'team'), ('reception_player_id', 'team'), ('target_player_id', 'team'), ('sack_player_id', 'opponent'),
                    ('pass_breakup_player_id', 'opponent'), ('interception_player_id', 'opponent'), ('field_goal_attempt_player_id', 'team')]:
        m = d[col].notna()
        for (pid, t), n in d.loc[m].groupby([col, tc]).size().items():
            if n > pteam.get(pid, ('', 0))[1]:
                pteam[pid] = (t, n)
    for pid, s in S.items():
        s['G'] = tg.get(pteam.get(pid, ('', 0))[0], 12) or 12
    return S


def merged_stats():
    s25, s26 = season_stats(2025), season_stats(2026)
    out = {}
    for pid in set(s25) | set(s26):
        a, b = s25.get(pid), s26.get(pid)
        m = {}
        for src, w in ((b, 1.0), (a, 0.65)):
            if not src:
                continue
            for k, v in src.items():
                m[k] = m.get(k, 0) + v * w
        out[pid] = m
    return out


# ---------- roster positions ----------
PMAP = {'OL': 'OL', 'OT': 'OL', 'G': 'OL', 'C': 'OL', 'OG': 'OL', 'IOL': 'OL', 'T': 'OL', 'DL': 'DL', 'DE': 'DL', 'DT': 'DL', 'NT': 'DL', 'EDGE': 'DL', 'LB': 'LB', 'OLB': 'LB',
        'ILB': 'LB', 'MLB': 'LB', 'CB': 'CB', 'S': 'S', 'FS': 'S', 'SS': 'S', 'QB': 'QB', 'RB': 'RB', 'FB': 'RB', 'HB': 'RB', 'WR': 'WR', 'TE': 'TE', 'PK': 'K', 'K': 'K', 'P': 'K'}


def guess_pos(st, ht, wt):
    if st:
        att = st.get('comp', 0) + st.get('inc', 0)
        if att >= 15:
            return 'QB'
        if st.get('fga', 0) >= 2:
            return 'K'
        off = st.get('ra', 0), st.get('rec', 0) + st.get('tgt0', 0)
        if max(off) >= 3:
            return 'RB' if off[0] > off[1] else ('TE' if (wt or 0) >= 235 else 'WR')
        if st.get('sck', 0) >= 1 and (wt or 0) >= 245:
            return 'DL'
        if st.get('pbu', 0) + st.get('dint', 0) >= 1:
            return 'S' if (wt or 0) >= 200 else 'CB'
        if st.get('sck', 0) >= 1:
            return 'LB'
    if not wt:
        return None
    if wt >= 280:
        return 'OL' if (ht or 0) >= 76 else 'DL'
    if wt >= 235:
        return 'LB'
    if (ht or 0) >= 74:
        return 'WR'
    return 'CB'


def z(vals, x, lo=-2.5, hi=3.0):
    m, sd = vals
    return clamp((x - m) / (sd or 1), lo, hi)


def msd(xs):
    xs = [x for x in xs if x is not None]
    if not xs:
        return (0, 1)
    m = sum(xs) / len(xs)
    return (m, math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs)) or 1)


# ---------- the generated league's team-strength curve (Monte Carlo of genTeam in 02-data.js) ----------
def gen_curve():
    rng = random.Random(7)
    curve = {}
    for qi in range(10, 51):
        q = qi / 10
        vals = []
        for _ in range(160):
            team = []
            for pos in POS_ORDER:
                for _k in range(POS_COUNTS[pos]):
                    yr = rng.randint(1, 4)
                    p = {'pos': pos}
                    for k in ATTR:
                        p[k] = r1(q + BIAS[pos].get(k, 0) + rng.uniform(-1.2, 1.2) + ((yr - 2.5) * .25 if k == 'awr' else 0))
                    team.append(p)
            vals.append(team_ovr(team))
        curve[qi] = sum(vals) / len(vals)
    return curve


def curve_at(curve, q):
    q = clamp(q, 1.0, 5.0) * 10
    a = int(math.floor(q)); b = min(50, a + 1); f = q - a
    return curve[a] * (1 - f) + curve[b] * f


def team_ovr(players):
    by = {}
    for p in players:
        by.setdefault(p['pos'], []).append(p)
    def unit(ps):
        s = n = 0
        for pos in ps:
            for p in sorted(by.get(pos, []), key=lambda x: -ovr(x))[:STARTERS[pos]]:
                s += ovr(p); n += 1
        return s / n if n else 3
    return (unit(['QB', 'RB', 'WR', 'TE', 'OL']) * 1.05 + unit(['DL', 'LB', 'CB', 'S']) * .95) / 2


def select60(players):
    """the in-game rule (02c-packs.js packSelect): position minimums first, then the best of the rest up to 60"""
    by = {}
    for p in players:
        by.setdefault(p['pos'], []).append(p)
    for pos in by:
        by[pos].sort(key=lambda x: -x['_o'])
    chosen, rest = [], []
    for pos in POS_ORDER:
        L = by.get(pos, [])
        chosen += L[:POS_COUNTS[pos]]
        rest += L[POS_COUNTS[pos]:]
    rest.sort(key=lambda x: -x['_o'])
    cap = {'QB': 4, 'K': 3}
    have = {}
    for p in chosen:
        have[p['pos']] = have.get(p['pos'], 0) + 1
    for p in rest:
        if len(chosen) >= ROSTER_CAP:
            break
        if have.get(p['pos'], 0) >= cap.get(p['pos'], 99):
            continue
        chosen.append(p); have[p['pos']] = have.get(p['pos'], 0) + 1
    return chosen


# best-known 2026 names: production decides everything else; these only get a floor (overall 40–99)
STAR_FLOOR = {('OSU', 'Jeremiah Smith'): 98, ('TEX', 'Arch Manning'): 96, ('OSU', 'Julian Sayin'): 95, ('ORE', 'Dante Moore'): 94, ('ND', 'CJ Carr'): 93,
              ('SC', 'LaNorris Sellers'): 92, ('UGA', 'Gunner Stockton'): 92, ('ALA', 'Keelon Russell'): 92, ('TAMU', 'Marcel Reed'): 92, ('MICH', 'Bryce Underwood'): 91}


# ---------- coaches (real names live only in the pack, never in the app) ----------
# FBS head coaches, 2026 season: Wikipedia "List of current NCAA Division I FBS football coaches" (read Oct 2026).
FBS_HC = """Army Black Knights|Jeff Monken|2014
Charlotte 49ers|Tim Albin|2025
East Carolina Pirates|Blake Harrell|2024
Florida Atlantic Owls|Zach Kittley|2025
Memphis Tigers|Charles Huff|2026
Navy Midshipmen|Brian Newberry|2023
North Texas Mean Green|Neal Brown|2026
Rice Owls|Scott Abell|2025
South Florida Bulls|Brian Hartline|2026
Temple Owls|K. C. Keeler|2025
Tulane Green Wave|Will Hall|2026
Tulsa Golden Hurricane|Tre Lamb|2025
UAB Blazers|Alex Mortensen|2025
UTSA Roadrunners|Jeff Traylor|2020
Boston College Eagles|Bill O'Brien|2024
California Golden Bears|Tosh Lupoi|2026
Clemson Tigers|Dabo Swinney|2009
Duke Blue Devils|Manny Diaz|2024
Florida State Seminoles|Mike Norvell|2020
Georgia Tech Yellow Jackets|Brent Key|2022
Louisville Cardinals|Jeff Brohm|2023
Miami Hurricanes|Mario Cristobal|2022
North Carolina Tar Heels|Bill Belichick|2025
NC State Wolfpack|Dave Doeren|2013
Pittsburgh Panthers|Pat Narduzzi|2015
SMU Mustangs|Rhett Lashlee|2022
Stanford Cardinal|Tavita Pritchard|2026
Syracuse Orange|Fran Brown|2024
Virginia Cavaliers|Tony Elliott|2022
Virginia Tech Hokies|James Franklin|2026
Wake Forest Demon Deacons|Jake Dickert|2025
Arizona Wildcats|Brent Brennan|2024
Arizona State Sun Devils|Kenny Dillingham|2023
Baylor Bears|Dave Aranda|2020
BYU Cougars|Kalani Sitake|2016
Cincinnati Bearcats|Scott Satterfield|2023
Colorado Buffaloes|Deion Sanders|2023
Houston Cougars|Willie Fritz|2024
Iowa State Cyclones|Jimmy Rogers|2026
Kansas Jayhawks|Lance Leipold|2021
Kansas State Wildcats|Collin Klein|2026
Oklahoma State Cowboys|Eric Morris|2026
TCU Horned Frogs|Sonny Dykes|2022
Texas Tech Red Raiders|Joey McGuire|2022
UCF Knights|Scott Frost|2025
Utah Utes|Morgan Scalley|2026
West Virginia Mountaineers|Rich Rodriguez|2025
Illinois Fighting Illini|Bret Bielema|2021
Indiana Hoosiers|Curt Cignetti|2024
Iowa Hawkeyes|Kirk Ferentz|1999
Maryland Terrapins|Mike Locksley|2019
Michigan Wolverines|Kyle Whittingham|2026
Michigan State Spartans|Pat Fitzgerald|2026
Minnesota Golden Gophers|P. J. Fleck|2017
Nebraska Cornhuskers|Matt Rhule|2023
Northwestern Wildcats|David Braun|2023
Ohio State Buckeyes|Ryan Day|2019
Oregon Ducks|Dan Lanning|2022
Penn State Nittany Lions|Matt Campbell|2026
Purdue Boilermakers|Barry Odom|2025
Rutgers Scarlet Knights|Greg Schiano|2020
UCLA Bruins|Bob Chesney|2026
USC Trojans|Lincoln Riley|2022
Washington Huskies|Jedd Fisch|2024
Wisconsin Badgers|Luke Fickell|2023
Delaware Fightin' Blue Hens|Ryan Carty|2022
Florida International Panthers|Willie Simmons|2025
Jacksonville State Gamecocks|Charles Kelly|2025
Kennesaw State Owls|Jerry Mack|2025
Liberty Flames|Jamey Chadwell|2023
Middle Tennessee Blue Raiders|Derek Mason|2024
Missouri State Bears|Casey Woods|2026
New Mexico State Aggies|Tony Sanchez|2024
Sam Houston Bearkats|Phil Longo|2025
Western Kentucky Hilltoppers|Tyson Helton|2019
Notre Dame Fighting Irish|Marcus Freeman|2022
UConn Huskies|Jason Candle|2026
Akron Zips|Joe Moorhead|2022
Ball State Cardinals|Mike Uremovich|2025
Bowling Green Falcons|Eddie George|2025
Buffalo Bulls|Pete Lembo|2024
Central Michigan Chippewas|Matt Drinkall|2025
Eastern Michigan Eagles|Chris Creighton|2014
Kent State Golden Flashes|Mark Carney|2025
Miami RedHawks|Chuck Martin|2014
Ohio Bobcats|John Hauser|2025
Sacramento State Hornets|Alonzo Carter|2026
Toledo Rockets|Mike Jacobs|2026
UMass Minutemen|Joe Harasymiak|2025
Western Michigan Broncos|Lance Taylor|2023
Air Force Falcons|Troy Calhoun|2007
Hawaii Rainbow Warriors|Timmy Chang|2022
Nevada Wolf Pack|Jeff Choate|2024
New Mexico Lobos|Jason Eck|2025
North Dakota State Bison|Tim Polasek|2024
Northern Illinois Huskies|Rob Harley (interim)|2026
San Jose State Spartans|Ken Niumatalolo|2024
UNLV Rebels|Dan Mullen|2025
UTEP Miners|Scotty Walden|2024
Wyoming Cowboys|Jay Sawvel|2024
Boise State Broncos|Spencer Danielson|2023
Colorado State Rams|Jim Mora|2026
Fresno State Bulldogs|Matt Entz|2025
Oregon State Beavers|JaMarcus Shephard|2026
San Diego State Aztecs|Sean Lewis|2024
Texas State Bobcats|G. J. Kinne|2023
Utah State Aggies|Bronco Mendenhall|2025
Washington State Cougars|Kirby Moore|2026
Alabama Crimson Tide|Kalen DeBoer|2024
Arkansas Razorbacks|Ryan Silverfield|2026
Auburn Tigers|Alex Golesh|2026
Florida Gators|Jon Sumrall|2026
Georgia Bulldogs|Kirby Smart|2016
Kentucky Wildcats|Will Stein|2026
LSU Tigers|Lane Kiffin|2026
Mississippi State Bulldogs|Jeff Lebby|2024
Missouri Tigers|Eli Drinkwitz|2020
Oklahoma Sooners|Brent Venables|2022
Ole Miss Rebels|Pete Golding|2025
South Carolina Gamecocks|Shane Beamer|2021
Tennessee Volunteers|Josh Heupel|2021
Texas Longhorns|Steve Sarkisian|2021
Texas A&M Aggies|Mike Elko|2024
Vanderbilt Commodores|Clark Lea|2021
Appalachian State Mountaineers|Dowell Loggains|2025
Arkansas State Red Wolves|Butch Jones|2021
Coastal Carolina Chanticleers|Ryan Beard|2026
Georgia Southern Eagles|Clay Helton|2022
Georgia State Panthers|Dell McGee|2024
James Madison Dukes|Billy Napier|2026
Louisiana Ragin' Cajuns|Michael Desormeaux|2022
Louisiana-Monroe Warhawks|Bryant Vincent|2024
Louisiana Tech Bulldogs|Sonny Cumbie|2022
Marshall Thundering Herd|Tony Gibson|2025
Old Dominion Monarchs|Ricky Rahne|2020
South Alabama Jaguars|Major Applewhite|2024
Southern Miss Golden Eagles|Blake Anderson|2025
Troy Trojans|Gerad Parker|2024"""
# signature traits (game trait names) and 1-5 ratings for coaches with a clear identity; others get a trait from their
# school's profile and a rating from program strength
HC_TRAITS = {'Kirby Smart': (5, 'Recruiter', 'Defensive Mastermind'), 'Ryan Day': (5, 'QB Whisperer', 'Recruiter'), 'Dan Lanning': (5, 'Defensive Mastermind', 'Recruiter'),
             'Curt Cignetti': (5, 'Portal King', 'Developer'), 'Lane Kiffin': (5, 'Portal King', 'Offensive Guru'), 'Steve Sarkisian': (5, 'QB Whisperer', 'Offensive Guru'),
             'Kalen DeBoer': (5, 'Offensive Guru', 'QB Whisperer'), 'Marcus Freeman': (5, 'Recruiter', 'Defensive Mastermind'), 'Kyle Whittingham': (5, 'Developer', 'Defensive Mastermind'),
             'Dabo Swinney': (5, 'Recruiter', 'Motivator'), 'Kirk Ferentz': (4, 'Developer', 'Disciplinarian'), 'Bill Belichick': (4, 'Defensive Mastermind', 'Disciplinarian'),
             'James Franklin': (4, 'Recruiter', 'Motivator'), 'Matt Campbell': (4, 'Developer', 'Motivator'), 'Lincoln Riley': (4, 'QB Whisperer', 'Offensive Guru'),
             'Josh Heupel': (4, 'Offensive Guru', 'Air Raid'), 'Brent Venables': (4, 'Defensive Mastermind', 'Pass Rush Guru'), 'Mike Elko': (4, 'Defensive Mastermind'),
             'Deion Sanders': (3, 'Portal King', 'Motivator'), 'Joey McGuire': (4, 'Portal King', 'Motivator'), 'Kenny Dillingham': (4, 'Offensive Guru', 'Portal King'),
             'Mario Cristobal': (4, 'Recruiter'), 'Rich Rodriguez': (3, 'Run Game Architect', 'Offensive Guru'), 'Jeff Monken': (4, 'Run Game Architect', 'Disciplinarian'),
             'Brian Newberry': (3, 'Run Game Architect'), 'Troy Calhoun': (3, 'Run Game Architect', 'Disciplinarian'), 'Lance Leipold': (4, 'Developer'),
             'Bret Bielema': (3, 'Run Game Architect', 'Disciplinarian'), 'Eli Drinkwitz': (4, 'Recruiter', 'Offensive Guru'), 'Mike Norvell': (3, 'Offensive Guru'),
             'Jedd Fisch': (3, 'QB Whisperer', 'Portal King'), 'Dan Mullen': (4, 'QB Whisperer', 'Run Game Architect'), 'Sonny Dykes': (4, 'Air Raid', 'Offensive Guru'),
             'Kalani Sitake': (4, 'Motivator'), 'Rhett Lashlee': (4, 'Offensive Guru', 'Air Raid'), 'Jeff Brohm': (4, 'QB Whisperer', 'Air Raid'),
             'Jeff Traylor': (4, 'Recruiter'), 'Jamey Chadwell': (4, 'Run Game Architect', 'Offensive Guru'), 'Spencer Danielson': (4, 'Defensive Mastermind', 'Motivator'),
             'Jon Sumrall': (4, 'Defensive Mastermind', 'Developer'), 'Pete Golding': (3, 'Defensive Mastermind'), 'Clark Lea': (4, 'Motivator', 'Defensive Mastermind'),
             'Shane Beamer': (3, 'Special Teams Ace', 'Motivator'), 'Tim Polasek': (4, 'Run Game Architect', 'Developer'), 'Alex Golesh': (4, 'Offensive Guru', 'Air Raid'),
             'Collin Klein': (3, 'QB Whisperer', 'Run Game Architect'), 'Pat Fitzgerald': (3, 'Disciplinarian', 'Defensive Mastermind'), 'Greg Schiano': (3, 'Disciplinarian'),
             'Bronco Mendenhall': (4, 'Disciplinarian', 'Developer'), 'Manny Diaz': (3, 'Turnover Specialist', 'Defensive Mastermind'), 'Ken Niumatalolo': (4, 'Run Game Architect', 'Disciplinarian'),
             'Zach Kittley': (3, 'Air Raid', 'QB Whisperer'), 'Willie Fritz': (3, 'Run Game Architect'), 'Pat Narduzzi': (3, 'Defensive Mastermind'), 'Brent Key': (3, 'Motivator', 'Run Game Architect')}
# coordinators verified for 2026 (team abbreviation as used in the game → role → (name, rating, traits, source))
COORDS = {('ALA', 'dc'): ('Kane Wommack', 5, ('Turnover Specialist', 'Defensive Mastermind'), 'Alabama defensive coordinator since 2024; still in the role in Oct 2026 (Alabama coverage, Oct 2026)')}
TRAIT_FALLBACK = ['Motivator', 'Developer', 'Recruiter', 'Offensive Guru', 'Defensive Mastermind', 'Disciplinarian', 'Clock Manager', 'Run Game Architect', 'Portal King', 'QB Whisperer']
HC_ALIAS = {'hawaii rainbow warriors': "hawaii", 'louisiana monroe warhawks': 'ul monroe', 'florida international panthers': 'fiu', 'miami redhawks': 'miami oh',
            'san jose state spartans': 'san jose state', 'uconn huskies': 'uconn', 'umass minutemen': 'umass', 'nc state wolfpack': 'nc state'}


def coaches_for(progs):
    """abbr -> {'hc': {...}, 'dc': {...}} for every FBS program the list names (FCS teams keep generated coaches)"""
    by = {}
    for g in progs:
        by[norm(g['school'] + ' ' + g['mascot'])] = g
        by.setdefault(norm(g['school']), g)
    out, miss = {}, []
    for line in FBS_HC.split('\n'):
        team, name, since = line.split('|')
        k = norm(team)
        g = by.get(k) or by.get(HC_ALIAS.get(k, '#')) or next((by[x] for x in by if k.startswith(x + ' ') and len(x) > 4), None)
        if not g:
            miss.append(team)
            continue
        interim = '(interim)' in name
        name = name.replace('(interim)', '').strip()
        known = HC_TRAITS.get(name)
        if known:
            rating, traits = known[0], list(known[1:])
        else:
            rating = int(max(2, min(4, round(g['q'] - 0.3))))
            traits = [TRAIT_FALLBACK[int((hrand('hc', name) + 1) / 2 * len(TRAIT_FALLBACK)) % len(TRAIT_FALLBACK)]]
        c = {'name': name, 'rating': rating, 'traits': traits, 'since': int(since)}
        if interim:
            c['interim'] = True
        out.setdefault(g['abbr'], {})['hc'] = c
    for (ab, role), (name, rating, traits, src) in COORDS.items():
        out.setdefault(ab, {})[role] = {'name': name, 'rating': rating, 'traits': list(traits), 'source': src}
    return out, miss


def coaches_only(path):
    """add coaches to an existing pack (no roster rebuild): python3 build_pack.py --coaches-only [pack.json]"""
    pk = json.load(open(path, encoding='utf-8'))
    co, miss = coaches_for(game_programs())
    n = 0
    for t in pk['teams']:
        c = co.get(t.get('abbr'))
        if c:
            t['coaches'] = c
            n += 1
        else:
            t.pop('coaches', None)
    pk['notes'] = pk.get('notes', '').split(' Coaches:')[0] + COACH_NOTE
    write_pack(path, pk)
    print(f'coaches added to {n} teams; unmatched: {miss}; size {os.path.getsize(path) / 1e6:.2f} MB')


COACH_NOTE = ' Coaches: 2026 FBS head coaches (Wikipedia list of current FBS coaches, Oct 2026) and verified coordinators; traits and ratings are game estimates.'


def write_pack(path, pack):
    teams_out = pack['teams']
    with open(path, 'w', encoding='utf-8') as f:
        head = {k: v for k, v in pack.items() if k not in ('teams', 'players')}
        f.write(json.dumps(head, ensure_ascii=False)[:-1] + ',\n"players":[],\n"teams":[\n')
        for i, t in enumerate(teams_out):
            meta = {k: v for k, v in t.items() if k != 'roster'}
            f.write(json.dumps(meta, ensure_ascii=False, separators=(',', ':'))[:-1] + ',"roster":[\n')
            f.write(',\n'.join(json.dumps(e, ensure_ascii=False, separators=(',', ':')) for e in t['roster']))
            f.write('\n]}' + (',' if i < len(teams_out) - 1 else '') + '\n')
        f.write(']}\n')
    json.load(open(path, encoding='utf-8'))  # validate



def main():
    progs = game_programs()
    roster = pd.read_parquet(os.path.join(DATA, 'rosters', 'parquet', 'rosters_2026.parquet'))
    tc = pd.read_csv(os.path.join(DATA, 'teams', 'teams_colors_logos.csv'), encoding='latin-1')
    tinfo_path = os.path.join(EXTRA, 'cfb_team_info_2026.parquet')
    ti = pd.read_parquet(tinfo_path) if os.path.exists(tinfo_path) else None
    ds_teams = sorted(roster.team.dropna().unique().tolist())
    # dataset team -> ESPN rows
    by_school = {}
    for _, r in tc.iterrows():
        by_school.setdefault(str(r.school), r)
    info = {}
    if ti is not None:
        for _, r in ti.iterrows():
            info[int(r.team_id)] = r
    nds = {norm(t): t for t in ds_teams}
    alt = {}
    for t in ds_teams:
        r = by_school.get(t)
        if r is not None:
            for c in ('alt_name1', 'alt_name2', 'alt_name3', 'abbreviation'):
                v = r.get(c)
                if isinstance(v, str):
                    alt.setdefault(norm(v), t)
    match, unmatched_game = {}, []
    for g in progs:
        cand = ALIAS.get(g['school'], g['school'])
        t = nds.get(norm(cand)) or alt.get(norm(cand)) or alt.get(norm(g['abbr']))
        if t and t not in match.values():
            match[g['abbr']] = t
        else:
            unmatched_game.append(g['school'])
    used = set(match.values())
    unmatched_ds = [t for t in ds_teams if t not in used]

    coaches, coach_miss = coaches_for(progs)
    stats = merged_stats()
    # population stats for z-scores
    def qb_metrics(s):
        att = s.get('comp', 0) + s.get('inc', 0) + s.get('intt', 0)
        if att < 1:
            return None
        eff = (8.4 * s.get('pyds', 0) + 330 * s.get('ptd', 0) + 100 * s.get('comp', 0) - 200 * s.get('intt', 0)) / att
        return {'att': att, 'eff': (eff * att + 118 * 90) / (att + 90), 'cmp': (s.get('comp', 0) + .6 * 60) / (att + 60), 'ypa': (s.get('pyds', 0) + 6.8 * 70) / (att + 70),
                'intr': (s.get('intt', 0) + .028 * 120) / (att + 120), 'vol': att / s['G'], 'rush': max(0, s.get('ryds', 0) + 6 * s.get('sckt', 0)) / s['G']}

    def rb_metrics(s):
        ra = s.get('ra', 0)
        if ra < 1:
            return None
        return {'vol': ra / s['G'], 'ypc': (s.get('ryds', 0) + 4.3 * 45) / (ra + 45), 'td': s.get('rtd', 0) / s['G'], 'recy': s.get('recy', 0) / s['G'], 'fum': (s.get('fum', 0) + .5) / (ra + s.get('rec', 0) + 30)}

    def wr_metrics(s):
        tg = s.get('rec', 0) + s.get('tgt0', 0)
        if tg < 1:
            return None
        return {'ypg': s.get('recy', 0) / s['G'], 'ypt': (s.get('recy', 0) + 7.5 * 25) / (tg + 25), 'cr': (s.get('rec', 0) + .62 * 25) / (tg + 25), 'td': s.get('rectd', 0) / s['G'],
                'ypr': (s.get('recy', 0) + 12 * 12) / (s.get('rec', 0) + 12), 'vol': tg / s['G']}

    def def_metrics(s):
        v = s.get('sck', 0) * 1.0 + s.get('dint', 0) * 1.6 + s.get('pbu', 0) * .7 + s.get('ff', 0) * 1.2
        if v <= 0:
            return None
        return {'play': v / s['G'], 'sck': s.get('sck', 0) / s['G'], 'cov': (s.get('pbu', 0) + 2 * s.get('dint', 0)) / s['G'], 'int': s.get('dint', 0) / s['G']}

    def k_metrics(s):
        a = s.get('fga', 0)
        if a < 1:
            return None
        return {'pct': (s.get('fgm', 0) + .75 * 10) / (a + 10), 'long': (s.get('fgm50', 0) * 2 + s.get('fgm40', 0) + .5) / (a + 6), 'vol': a / s['G']}

    MET = {'QB': qb_metrics, 'RB': rb_metrics, 'WR': wr_metrics, 'TE': wr_metrics, 'DL': def_metrics, 'LB': def_metrics, 'CB': def_metrics, 'S': def_metrics, 'K': k_metrics}

    # ---- build player records ----
    recs = []
    for _, r in roster.iterrows():
        team = r.team
        if team not in used:
            continue
        rp = str(r.position).upper() if isinstance(r.position, str) else ''
        if rp == 'LS':
            continue
        pid = str(r.athlete_id)
        st = stats.get(pid)
        ht = int(r.height) if pd.notna(r.height) and 60 <= r.height <= 84 else None
        wt = int(r.weight) if pd.notna(r.weight) and 140 <= r.weight <= 420 else None
        pos = PMAP.get(rp)
        if rp == 'DB':
            pos = 'DB'
        elif not pos:
            pos = guess_pos(st, ht, wt)
        if not pos:
            continue
        fn, ln = (r.first_name or '').strip(), (r.last_name or '').strip()
        if not fn and not ln:
            continue
        yr = int(r.year) if pd.notna(r.year) and 1 <= r.year <= 4 else 1
        home = ', '.join([x for x in [r.home_city if isinstance(r.home_city, str) else '', r.home_state if isinstance(r.home_state, str) else ''] if x])
        recs.append({'team': team, 'pid': pid, 'first': fn, 'last': ln, 'pos': pos, 'realPos': rp or None, 'num': int(r.jersey) if pd.notna(r.jersey) and 0 <= r.jersey <= 99 else None,
                     'yr': yr, 'ht': ht, 'wt': wt, 'home': home or None, 'st': st})
    # DB -> CB/S per team by size (and coverage stats)
    by_team = {}
    for p in recs:
        by_team.setdefault(p['team'], []).append(p)
    for team, ps in by_team.items():
        dbs = [p for p in ps if p['pos'] == 'DB']
        if not dbs:
            continue
        sz = lambda p: ((p['wt'] or 192) - 192) / 9 + ((p['ht'] or 72) - 72) / 1.4 + hrand(p['pid'], 'db') * .01
        dbs.sort(key=sz)
        ncb = max(1, round(len(dbs) * .56))
        for i, p in enumerate(dbs):
            p['pos'] = 'CB' if i < ncb else 'S'
            if (p['wt'] or 0) >= 207:
                p['pos'] = 'S'
            elif p['wt'] and p['wt'] <= 178:
                p['pos'] = 'CB'
    # population z-score parameters per position & metric
    pop = {}
    for p in recs:
        f = MET.get(p['pos'])
        p['m'] = f(p['st']) if (f and p['st']) else None
        if p['m']:
            for k, v in p['m'].items():
                pop.setdefault((p['pos'], k), []).append(v)
    P = {k: msd(v) for k, v in pop.items()}
    Z = lambda p, k, **kw: z(P[(p['pos'], k)], p['m'][k], **kw) if p['m'] else None

    prog_by_ds = {match[g['abbr']]: g for g in progs if g['abbr'] in match}
    curve = gen_curve()

    for p in recs:
        g = prog_by_ds[p['team']]
        q = g['q']
        pos = p['pos']
        s = SIZE[pos]
        wz = clamp(((p['wt'] or s[2]) - s[2]) / s[3], -2.5, 2.5)
        hz = clamp(((p['ht'] or s[0]) - s[0]) / s[1], -2.5, 2.5)
        yr = p['yr']
        m = p['m']
        tw = {}  # stat-based tweaks per attribute
        if m:
            if pos == 'QB':
                score = .5 * Z(p, 'eff') + .35 * Z(p, 'vol') + .15 * Z(p, 'rush')
                tw = {'acc': .32 * Z(p, 'cmp'), 'thr': .3 * Z(p, 'ypa') + .05 * hz, 'awr': .25 * Z(p, 'eff') - .12 * Z(p, 'intr'), 'spd': .35 * Z(p, 'rush'), 'agi': .3 * Z(p, 'rush')}
            elif pos == 'RB':
                score = .45 * Z(p, 'vol') + .3 * Z(p, 'ypc') + .15 * Z(p, 'td') + .1 * Z(p, 'recy')
                tw = {'spd': .28 * Z(p, 'ypc'), 'agi': .22 * Z(p, 'ypc'), 'car': .2 * Z(p, 'vol') - .15 * Z(p, 'fum'), 'str': .12 * Z(p, 'td') + .15 * wz, 'cat': .3 * Z(p, 'recy')}
            elif pos in ('WR', 'TE'):
                score = .5 * Z(p, 'ypg') + .2 * Z(p, 'ypt') + .1 * Z(p, 'cr') + .2 * Z(p, 'td')
                tw = {'spd': .28 * Z(p, 'ypr'), 'cat': .28 * Z(p, 'cr') + .1 * Z(p, 'ypg'), 'rte': .3 * Z(p, 'vol'), 'agi': .15 * Z(p, 'ypt'), 'str': .12 * wz}
                if pos == 'TE':
                    tw['blk'] = .2 * wz
            elif pos in ('DL', 'LB', 'CB', 'S'):
                score = Z(p, 'play')
                tw = {'shd': .35 * Z(p, 'sck'), 'cov': .3 * Z(p, 'cov'), 'cat': .3 * Z(p, 'int'), 'tkl': .12 * Z(p, 'play')}
                if pos in ('DL', 'LB'):
                    tw['str'] = .15 * wz
                if pos in ('CB', 'S'):
                    tw['tkl'] = tw['tkl'] + .12 * wz
            elif pos == 'K':
                score = .6 * Z(p, 'pct') + .25 * Z(p, 'long') + .15 * Z(p, 'vol')
                tw = {'acc': .4 * Z(p, 'pct'), 'thr': .4 * Z(p, 'long')}
            else:
                score = 0
            score = clamp(score, -2, 3)
            # a little credit for being on the field at all
            score = score + .35
        else:
            # non-producers: OL and punters have no box-score stats, so class and size carry them;
            # other positions without stats are backups, freshmen or injured
            if pos == 'OL':
                score = .55 * (yr - 2.5) + .45 * wz + .15 * hz
            elif pos == 'K':
                score = -1.1 + .25 * (yr - 1)
            else:
                score = -1.0 + .22 * (yr - 1)
            if pos in ('DL', 'LB', 'TE'):
                score += .2 * wz
        noise = hrand(p['pid'], 'g') * .22
        grade = q + .42 * score + (yr - 2.5) * .1 + noise
        p['grade'] = grade
        p['score'] = score
        attrs = {}
        for k in ATTR:
            b = BIAS[pos].get(k, 0)
            v = grade + b + tw.get(k, 0) + hrand(p['pid'], k) * .28
            if k == 'awr':
                v += (yr - 2.5) * .22
            if k == 'end':
                v += (yr - 2.5) * .08
            if k == 'spd' and pos in ('OL', 'DL', 'LB', 'TE'):
                v -= .12 * wz
            if k == 'str':
                v += .12 * wz
            attrs[k] = v
        p['a'] = attrs

    # ---- per-team calibration to the generated league's strength curve ----
    def floatp(p):
        d = {'pos': p['pos']}
        d.update({k: clamp(v, 1, 5) for k, v in p['a'].items()})
        return d

    devs = []
    for g in progs:
        ds = match.get(g['abbr'])
        if not ds:
            continue
        for p in by_team[ds]:
            p['_o'] = ovr(floatp(p))
        devs.append(team_ovr([floatp(p) for p in select60(by_team[ds])]) - curve_at(curve, g['q']))
    mdev = sorted(devs)[len(devs) // 2]
    teams_out, calib = [], []
    for g in progs:
        ds = match.get(g['abbr'])
        if not ds:
            continue
        ps = by_team[ds]
        target0 = curve_at(curve, g['q'])
        for p in ps:
            p['_o'] = ovr(floatp(p))
        sel = select60(ps)
        raw = team_ovr([floatp(p) for p in sel])
        # production-based team quality nudges the target a little; strength (real recent results) anchors it
        target = target0 - .035 + clamp((raw - target0 - mdev) * .25, -.08, .08)
        for it in range(8):
            for p in ps:
                p['_o'] = ovr(floatp(p))
            sel = select60(ps)
            cur = team_ovr([floatp(p) for p in sel])
            d = target - cur
            if abs(d) < .004:
                break
            for p in ps:
                f = (1.15 if it < 4 else 1.0) * (.5 if p['pos'] == 'K' else 1)
                for k in ATTR:
                    p['a'][k] += d * f
        # round, floors, final overall
        for p in ps:
            p['ar'] = {k: r1(v) for k, v in p['a'].items()}
            fl = STAR_FLOOR.get((g['abbr'], p['first'] + ' ' + p['last']))
            if fl:
                for _ in range(40):
                    if o99(ovr(dict(p['ar'], pos=p['pos']))) >= min(fl, 96.5):
                        break
                    for k in W8[p['pos']]:
                        p['ar'][k] = r1(p['ar'][k] + .1)
            base = o99(ovr(dict(p['ar'], pos=p['pos'])))
            bonus = clamp(p['score'] - 1.0, 0, 2) * (.6 if p['pos'] in ('DL', 'LB', 'CB', 'S') else .4 if p['pos'] == 'K' else 1) if base >= 93 else 0
            if fl:
                bonus = max(bonus, fl - base)
            p['ovr'] = int(clamp(round(base + bonus), 40, 99))
            p['_o'] = ovr(dict(p['ar'], pos=p['pos']))
        sel = select60(ps)
        final = team_ovr([dict(p['ar'], pos=p['pos']) for p in sel])
        calib.append((g['abbr'], g['div'], g['q'], round(target0, 3), round(final, 3)))
        r = by_school.get(ds)
        espn = int(r.team_id) if r is not None else None
        inf = info.get(espn) if espn is not None else None
        team = {'school': g['school'], 'mascot': g['mascot'], 'abbr': g['abbr'], 'dataName': ds, 'espnId': espn,
                'conference': g['conf'], 'division': g['div'], 'primary': (hexcol(r.color) if r is not None else None) or g['c1'],
                'secondary': (hexcol(r.alt_color) if r is not None else None) or g['c2']}
        if r is not None:
            team['logo'] = https(r.logo)
            team['logoDark'] = https(r.logo_dark)
        if inf is not None and isinstance(inf.get('venue_name'), str):
            team['stadium'] = inf.venue_name
            if pd.notna(inf.get('capacity')) and inf.capacity > 1000:
                team['capacity'] = int(inf.capacity)
        if g['abbr'] in coaches:
            team['coaches'] = coaches[g['abbr']]
        ps.sort(key=lambda p: (POS_ORDER.index(p['pos']), -p['_o'], p['pid']))
        team['roster'] = []
        for p in ps:
            e = {'name': (p['first'] + ' ' + p['last']).strip(), 'pos': p['pos'], 'realPos': p['realPos'], 'num': p['num'], 'yr': YRS[p['yr'] - 1],
                 'ht': p['ht'], 'wt': p['wt'], 'home': p['home'], 'espnId': p['pid']}
            e.update(p['ar'])
            e['ovr'] = p['ovr']
            team['roster'].append({k: v for k, v in e.items() if v is not None})
        teams_out.append(team)

    pack = {'format': 'gridiron-live-pack', 'version': 2, 'season': 2026, 'name': 'College football 2026 rosters & logos',
            'notes': 'Rosters: ESPN via cfbfastR-data (2026 season). Ratings are game estimates from 2025+2026 production, class, size and program strength. Logos are links to the ESPN CDN.' + COACH_NOTE,
            'teams': teams_out, 'players': []}
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, 'gridiron-live-2026-rosters.json')
    write_pack(path, pack)
    write_template(os.path.join(OUT, 'custom-players-template.json'))

    nplayers = sum(len(t['roster']) for t in teams_out)
    print(f'wrote {path}  {os.path.getsize(path) / 1e6:.2f} MB  teams {len(teams_out)}  players {nplayers}')
    print('unmatched game programs:', unmatched_game)
    print('coaches:', sum(1 for t in teams_out if 'coaches' in t), 'teams; head-coach list entries not matched:', coach_miss)
    print('dataset teams not in the game (skipped):', unmatched_ds)
    import statistics as stt
    for div in ('FBS', 'FCS'):
        c = [x for x in calib if x[1] == div]
        print(div, 'teamOvr target median %.3f top %.3f | pack median %.3f top %.3f' % (stt.median([x[3] for x in c]), max(x[3] for x in c), stt.median([x[4] for x in c]), max(x[4] for x in c)))
    top = sorted(calib, key=lambda x: -x[4])[:8]
    print('top teams', top)
    allp = [(p['ovr'], p['pos'], p['first'] + ' ' + p['last'], p['team']) for p in recs if 'ovr' in p]
    for pos in ('QB', 'RB', 'WR', 'TE', 'DL', 'LB', 'CB', 'S', 'K'):
        best = sorted([x for x in allp if x[1] == pos], key=lambda x: -x[0])[:6]
        print(pos, [(x[0], x[2], x[3]) for x in best])


def write_template(path):
    tpl = {'format': 'gridiron-live-pack', 'version': 2, 'season': 2026,
           'notes': 'Custom players. team = the school abbreviation used in the game (e.g. UGA) or its name. Ratings: 14 attributes on 1-5 (or 25-99), or only an overall (40-99). Every field except team, name and pos is optional.',
           'players': [
               {'team': 'UGA', 'name': 'Jaxson Merchant', 'pos': 'QB', 'num': 8, 'yr': 'SO', 'rs': True, 'ht': 75, 'wt': 215, 'home': 'Atlanta, GA',
                'spd': 3.9, 'agi': 3.8, 'str': 3.2, 'awr': 4.1, 'thr': 4.6, 'acc': 4.4, 'cat': 2.0, 'rte': 1.8, 'car': 3.0, 'blk': 1.5, 'tkl': 1.2, 'cov': 1.2, 'shd': 1.2, 'end': 4.0},
               {'team': 'Ohio State', 'name': 'Marcus Reed', 'pos': 'WR', 'num': 11, 'yr': 'JR', 'ovr': 88},
               {'team': 'TEX', 'name': 'Dante Cole', 'pos': 'CB', 'yr': 'FR', 'spd': 92, 'agi': 88, 'cov': 84, 'cat': 75, 'awr': 70, 'tkl': 66},
               {'team': 'ND', 'name': 'Luke Brennan', 'pos': 'K', 'num': 39, 'yr': 'SR', 'thr': 4.5, 'acc': 4.3}]}
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(tpl, f, indent=1)


if __name__ == '__main__':
    if '--coaches-only' in sys.argv:
        coaches_only(next((a for a in sys.argv[1:] if a.endswith('.json')), os.path.join('/home/claude/packs', 'gridiron-live-2026-rosters.json')))
    else:
        main()

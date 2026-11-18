#!/usr/bin/env python3
"""Builds the optional fight-songs file for Gridiron Live (NOT shipped with the app).

  python3 -I tools/data/build_fightsongs.py [outdir]      (default outdir: /home/claude/packs)

Output: gridiron-live-2026-fight-songs.json (format "gridiron-live-fight-songs", version 1): one entry per FBS program
(the 138 schools in the 2026 stadiums file), matched to game teams by abbr/espnId/school like a roster pack.

Copyright rules (strict):
  * NO LYRICS anywhere in this file.
  * A melody is written out note by note ONLY for songs first published before 1929 (public domain in the US) whose
    date is well established. Those entries carry "pd": true and an approximate arrangement ("approx": true) written
    from memory of the public-domain tune: rhythm and contour, not a transcription of any edition or recording.
  * Everything else (1929 or later, or a date we are not sure of) is metadata only: title, year/composer when known,
    "pd": false. The game then plays the user's own recording for that team (Settings > Fight songs) or a generic,
    original fight-song-style cadence.

Melody format (what the game reads): {"song","tempo" (quarter notes per minute),"meter" ("2/4"|"4/4"),"pickup" (beats
before the first bar line),"key","notes":[[midi,beats],...]} with midi 0 = rest; 60 = middle C.
"""
import os, sys, json, re

STD = os.environ.get('STADIUMS', '/home/claude/packs/gridiron-live-2026-stadiums.json')
OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/packs'

# ABBR | primary title | year | composer | pd | alternate "title;year;composer;pd" (optional)
# pd = 1 only when first published before 1929 and the date is well established; unknown year -> blank.
T = """
ALA|Yea, Alabama!|1926|Ethelred Lundy Sykes|1|
ARK|Arkansas Fight Song|||0|
AUB|War Eagle|1955|Robert Allen, Al Stillman|0|
UF|The Orange and Blue|||0|
UGA|Glory, Glory||tune: Battle Hymn of the Republic (1861)|1|Hail to Georgia;;;0
UK|On, On, U of K|||0|
LSU|Fight for LSU|1937|Castro Carazo, W. G. Higginbotham|0|Tiger Rag;1917;Original Dixieland Jass Band;1
MSST|Hail State|1939||0|
MIZ|Every True Son|||0|Fight, Tiger;;;0
OU|Boomer Sooner|1905|Arthur M. Alden (tune: Boola Boola, Allan Hirsh, 1900)|1|
MISS|Forward Rebels|||0|
SC|The Step to the Rear|1967|Elmer Bernstein|0|
TENN|Down the Field|1904|Stanleigh P. Friedman|1|Rocky Top;1967;Boudleaux and Felice Bryant;0
TEX|Texas Fight|1923|James E. King, Walter S. Hunnicutt|1|The Eyes of Texas;1903;John Lang Sinclair (tune: I've Been Working on the Railroad);1
TAMU|Aggie War Hymn|1918|J. V. "Pinky" Wilson|1|
VAN|Dynamite|1939||0|
ILL|Illinois Loyalty|1906|Thatcher Howland Guild|1|Oskee Wow-Wow;1910;Harold V. Hill, Howard R. Green;1
IU|Indiana, Our Indiana|1912|Karl L. King, Russell P. Harker|1|
IOWA|Iowa Fight Song|1951|Meredith Willson|0|On Iowa;1917;W. R. Law;1
MD|Maryland Victory Song|||0|
MICH|The Victors|1898|Louis Elbel|1|
MSU|Victory for MSU|1915|Francis Irving Lankey, Arthur Sayles|1|
MINN|Minnesota Rouser|1909|Floyd M. Hutsell, Truman Rickard, Arthur Upson|1|
NEB|There Is No Place Like Nebraska|1923|Harry Pecha|1|
NW|Go U Northwestern|1912|Theodore Van Etten|1|
OSU|Across the Field|1915|William A. Dougherty Jr.|1|Buckeye Battle Cry;1919;Frank Crumit;1
ORE|Mighty Oregon|1916|Albert Perfect, DeWitt Gilbert|1|
PSU|Fight On, State|1935|Joe Saunders|0|The Nittany Lion;1919;Jimmy Leyden;1
PUR|Hail Purdue|1912|Edward S. Wotawa, James R. Morrison|1|
RUTG|The Bells Must Ring|||0|On the Banks of the Old Raritan;1873;Howard N. Fullerton;1
UCLA|Sons of Westwood|||0|Mighty Bruins;;;0
USC|Fight On|1922|Milo Sweet, Glen Grant|1|Conquest;1947;Alfred Newman;0
UW|Bow Down to Washington|1915|Lester J. Wilson|1|
WIS|On, Wisconsin!|1909|William T. Purdy, Carl Beck|1|
ARIZ|Bear Down, Arizona!|1952|Jack Lee|0|
ASU|Maroon and Gold|||0|
BAY|That Good Old Baylor Line|1931||0|Old Fight;;;0
BYU|Rise and Shout|||0|
CIN|Cheer Cincinnati|||0|
COLO|Fight CU|||0|
HOU|Cougar Fight Song|||0|
ISU|ISU Fights|||0|
KU|I'm a Jayhawk|1912|George "Dumpy" Bowles|1|
KSU|Wildcat Victory|||0|
OKST|Ride 'Em Cowboys|||0|
TCU|TCU Fight Song|||0|
TTU|Fight, Raiders, Fight|||0|The Matador Song;;;0
UCF|UCF Fight Song|||0|
UTAH|Utah Man|1904||1|
WVU|Hail, West Virginia|1915|Ira Zinn, Earl Miller, Fred B. Lewis|1|Country Roads;1971;John Denver, Bill Danoff, Taffy Nivert;0
BC|For Boston|1885|T. J. Hurley|1|
CAL|Fight for California|1909|Robert N. Fitch|1|Big C;1913;Harold P. Williams;1
CLEM|Tiger Rag|1917|Original Dixieland Jass Band|1|
DUKE|Fight! Blue Devils, Fight!|||0|Blue and White;;;0
FSU|FSU Fight Song|1950|Doug Alley, Tommy Wright|0|
GT|Ramblin' Wreck from Georgia Tech|1908||1|
LOU|Fight! U of L|||0|
MIA|Miami U How-Dee-Do|||0|
UNC|I'm a Tar Heel Born|||0|Hark the Sound;1897;William Starr Myers;1
NCST|NC State Fight Song|||0|
PITT|Hail to Pitt|1910|George M. Kirk|1|
SMU|Peruna|||0|
STAN|Come Join the Band|||0|All Right Now;1970;Free;0
SYR|Down the Field|1914|C. Harold Lewis, Ralph Murphy|1|
UVA|The Good Old Song|1893|Edward A. Craighill (tune: Auld Lang Syne)|1|Cavalier Song;1925;Lawrence Haywood Lee, Fulton Lewis Jr.;1
VT|Tech Triumph|1919|Wilfred P. Maddux, Mattie Eppes Boggs|1|
WAKE|O Here's to Wake Forest|||0|
ARMY|On, Brave Old Army Team|1911|Philip Egner|1|
CLT|Charlotte Fight Song|||0|
ECU|E.C. Victory|||0|
FAU|FAU Fight Song|||0|
MEM|Go Tigers Go|||0|
NAVY|Anchors Aweigh|1906|Charles A. Zimmermann, Alfred Hart Miles|1|
UNT|Fight, North Texas|||0|
RICE|Rice Fight Never Dies|||0|
USF|Golden Brahman March|||0|
TEM|T for Temple U|||0|
TUL|The Olive and the Blue|||0|
TLSA|Hurricane Fight Song|||0|
UAB|UAB Fight Song|||0|
UTSA|UTSA Fight Song|||0|
APP|Appalachian State Fight Song|||0|
ARST|Arkansas State Fight Song|||0|
CCU|Coastal Carolina Fight Song|||0|
GASO|Georgia Southern Fight Song|||0|
GAST|Georgia State Fight Song|||0|
JMU|JMU Fight Song|||0|
ULL|Louisiana Fight Song|||0|
ULM|Warhawks Fight Song|||0|
LT|Louisiana Tech Fight Song|||0|
MRSH|Sons of Marshall|||0|
ODU|Old Dominion Fight Song|||0|
USA|South Alabama Fight Song|||0|
USM|Southern to the Top|||0|
TROY|Trojans, One and All|||0|
BOIS|Boise State Fight Song|||0|
CSU|Colorado State Fight Song|||0|
FRES|Fresno State Fight Song|||0|
ORST|Hail to Old OSU|||0|
SDSU|San Diego State Fight Song|||0|
TXST|Texas State Fight Song|||0|
USU|Utah State Fight Song|||0|
WSU|Washington, My Washington|||0|
AF|The U.S. Air Force|1939|Robert Crawford|0|
HAW|Co-Ed|||0|
NEV|Nevada Fight Song|||0|
UNM|New Mexico Fight Song|||0|
SJSU|San Jose State Fight Song|||0|
UNLV|Win with the Rebels|||0|
WYO|Ragtime Cowboy Joe|1912|Lewis F. Muir, Maurice Abrahams|1|
UTEP|Miners Fight|||0|
NIU|Huskie Fight Song|||0|
NDSU|NDSU Fight Song|||0|
DEL|Delaware Fight Song|||0|
FIU|FIU Fight Song|||0|
JVST|Jacksonville State Fight Song|||0|
KENN|Kennesaw State Fight Song|||0|
LIB|Liberty Fight Song|||0|
MTSU|MTSU Fight Song|||0|
MOST|Missouri State Fight Song|||0|
NMSU|NM State Fight Song|||0|
SHSU|Sam Houston Fight Song|||0|
WKU|Stand Up and Cheer|||0|
AKR|Blue and Gold|||0|
BALL|Ball State Fight Song|||0|
BGSU|Ay Ziggy Zoomba|||0|Forward Falcons;;;0
BUFF|Buffalo Fight Song|||0|
CMU|Central Michigan Fight Song|||0|
EMU|Eastern Michigan Fight Song|||0|
KENT|Fight On for KSU|||0|
M-OH|Love and Honor|||0|
OHIO|Stand Up and Cheer|||0|
SAC|Sacramento State Fight Song|||0|
TOL|U of Toledo Fight Song|||0|
MASS|Fight Mass|||0|
WMU|Western Michigan Fight Song|||0|
ND|Notre Dame Victory March|1908|Michael J. Shea, John F. Shea|1|
UCON|UConn Husky|||0|
"""

# Approximate arrangements of public-domain tunes (pre-1929), written in C and moved to `key` by the builder.
# Notes: NAME+octave or R, ':' beats (quarter = 1). '|' bar lines are checked against the meter (first bar = pickup).
# "song" names which of the team's songs the melody is (the primary title, or the alternate).
M = {
 'MICH': dict(song='The Victors', key='Bb', tempo=208, meter='2/4', pickup=0, n="""
   G4:2 | E4:.5 F4:.5 G4:.5 E4:.5 | C4:.5 D4:.5 E4:1 | R:2 |
   A4:2 | F4:.5 G4:.5 A4:.5 F4:.5 | D4:.5 E4:.5 F4:1 | R:2 |
   G4:1 R:1 | G4:1 R:1 | E4:.5 F4:.5 G4:.5 A4:.5 | G4:1 E4:1 | D4:.5 E4:.5 D4:.5 C4:.5 | D4:2 | R:2 | R:2 |
   G4:2 | E4:.5 F4:.5 G4:.5 E4:.5 | C4:.5 D4:.5 E4:1 | R:2 |
   A4:2 | F4:.5 G4:.5 A4:.5 F4:.5 | D4:.5 E4:.5 F4:1 | R:2 |
   G4:1 R:1 | C5:1 R:1 | B4:.5 A4:.5 G4:.5 F4:.5 | E4:1 G4:1 | F4:.5 E4:.5 D4:.5 B3:.5 | C4:2 | R:2"""),
 'ND': dict(song='Notre Dame Victory March', key='Bb', tempo=200, meter='2/4', pickup=0, n="""
   E4:1 E4:1 | F4:.5 G4:1.5 | A4:.5 G4:.5 E4:.5 C4:.5 | D4:2 |
   D4:.5 E4:.5 F4:.5 G4:.5 | A4:1.5 A4:.5 | G4:.5 F4:.5 E4:.5 D4:.5 | E4:2 |
   E4:1 E4:1 | F4:.5 G4:1.5 | A4:.5 B4:.5 C5:.5 A4:.5 | G4:2 |
   G4:.5 A4:.5 G4:.5 F4:.5 | E4:1 D4:1 | E4:.5 F4:.5 G4:.5 E4:.5 | D4:2 |
   E4:1 E4:1 | F4:.5 G4:1.5 | A4:.5 G4:.5 E4:.5 C4:.5 | D4:2 |
   D4:.5 E4:.5 F4:.5 G4:.5 | A4:1.5 A4:.5 | B4:.5 C5:.5 D5:.5 B4:.5 | C5:2 |
   C5:.5 C5:.5 B4:.5 A4:.5 | G4:1 E4:1 | A4:.5 A4:.5 G4:.5 F4:.5 | E4:1 C4:1 |
   D4:1 E4:1 | F4:1 A4:1 | G4:1 B3:1 | C4:2"""),
 'WIS': dict(song='On, Wisconsin!', key='Bb', tempo=176, meter='2/4', pickup=0, n="""
   C5:1.5 B4:.5 | A4:1 G4:1 | C5:1.5 B4:.5 | A4:1 G4:1 |
   A4:.5 G4:.5 F4:.5 E4:.5 | D4:1 G4:1 | E4:2 | R:2 |
   E4:.5 F4:.5 G4:.5 A4:.5 | G4:1 E4:1 | D4:.5 E4:.5 F4:.5 D4:.5 | G4:2 |
   E4:.5 F4:.5 G4:.5 A4:.5 | B4:1 A4:1 | G4:2 | R:2 |
   C5:1.5 B4:.5 | A4:1 G4:1 | C5:1.5 B4:.5 | A4:1 G4:1 |
   A4:.5 B4:.5 C5:.5 D5:.5 | E5:1 C5:1 | A4:2 | R:2 |
   G4:.5 G4:.5 A4:.5 G4:.5 | E4:1 C4:1 | D4:1 E4:1 | D4:2 |
   E4:.5 F4:.5 G4:.5 A4:.5 | G4:1 D5:1 | C5:2 | R:2"""),
 'NAVY': dict(song='Anchors Aweigh', key='Bb', tempo=168, meter='4/4', pickup=0, n="""
   E4:1.5 D4:.5 C4:1 G4:1 | A4:2 G4:2 | E4:1.5 D4:.5 C4:1 G4:1 | A4:4 |
   A4:1.5 G4:.5 F4:1 A4:1 | C5:2 B4:1 A4:1 | G4:1 E4:1 D4:1 C4:1 | D4:4 |
   E4:1.5 D4:.5 C4:1 G4:1 | A4:2 G4:2 | E4:1.5 D4:.5 C4:1 G4:1 | C5:4 |
   D5:1.5 C5:.5 B4:1 A4:1 | G4:2 E4:1 G4:1 | A4:1 G4:1 D4:1 E4:1 | C4:4"""),
 'GT': dict(song="Ramblin' Wreck from Georgia Tech", key='Bb', tempo=200, meter='2/4', pickup=1, n="""
   G4:.5 G4:.5 | C5:.5 C5:.5 C5:.5 D5:.5 | E5:.5 C5:.5 C5:.5 G4:.5 | A4:.5 A4:.5 A4:.5 B4:.5 | C5:1.5 G4:.5 |
   A4:.5 A4:.5 A4:.5 A4:.5 | G4:.5 G4:.5 G4:.5 G4:.5 | F4:.5 F4:.5 F4:.5 F4:.5 | E4:1.5 G4:.5 |
   C5:.5 C5:.5 C5:.5 D5:.5 | E5:.5 C5:.5 C5:.5 G4:.5 | A4:.5 A4:.5 B4:.5 B4:.5 | C5:1.5 C5:.5 |
   D5:.5 D5:.5 C5:.5 B4:.5 | A4:.5 A4:.5 G4:.5 E4:.5 | D4:.5 E4:.5 F4:.5 D4:.5 | C4:2"""),
 'OU': dict(song='Boomer Sooner', key='Bb', tempo=184, meter='2/4', pickup=0, n="""
   E4:.75 C4:.25 E4:.75 C4:.25 | E4:1 C4:1 | F4:.75 D4:.25 F4:.75 D4:.25 | F4:1 D4:1 |
   G4:.75 E4:.25 G4:.75 E4:.25 | G4:1 E4:1 | D4:.5 E4:.5 F4:.5 D4:.5 | C4:2 |
   E4:.75 C4:.25 E4:.75 C4:.25 | E4:1 C4:1 | F4:.75 D4:.25 F4:.75 D4:.25 | F4:1 D4:1 |
   G4:.75 E4:.25 G4:.75 E4:.25 | A4:1 F4:1 | G4:1 B3:1 | C4:2"""),
 'TEX': dict(song='The Eyes of Texas', key='Bb', tempo=132, meter='4/4', pickup=1, n="""
   G3:1 | C4:1 C4:.5 C4:.5 C4:1 C4:.5 E4:.5 | G4:1.5 E4:.5 C4:2 | F4:1 F4:.5 F4:.5 E4:1 D4:1 | E4:3 G3:1 |
   C4:1 C4:.5 C4:.5 C4:1 C4:.5 E4:.5 | G4:1.5 E4:.5 C4:2 | D4:1 D4:.5 E4:.5 D4:1 B3:1 | C4:3 R:1 |
   E4:1 F4:.5 G4:.5 A4:1 G4:1 | E4:1 C4:1 G4:2 | F4:1 A4:.5 A4:.5 G4:1 F4:1 | E4:3 G3:1 |
   C4:1 C4:.5 C4:.5 C4:1 C4:.5 E4:.5 | G4:1.5 E4:.5 C4:2 | D4:1 D4:.5 E4:.5 D4:1 B3:1 | C4:4"""),
 'UGA': dict(song='Glory, Glory', key='Bb', tempo=136, meter='4/4', pickup=0, n="""
   G4:1.5 F4:.5 E4:1 G4:1 | C5:1 D5:1 E5:1 C5:1 | A4:1.5 B4:.5 C5:1 A4:1 | G4:1 A4:1 G4:1 E4:1 |
   G4:1.5 F4:.5 E4:1 G4:1 | C5:1 D5:1 E5:2 | D5:1 D5:1 C5:1 B4:1 | C5:4 |
   G4:1.5 F4:.5 E4:1 G4:1 | C5:1 D5:1 E5:1 C5:1 | A4:1.5 B4:.5 C5:1 A4:1 | G4:1 A4:1 G4:1 E4:1 |
   G4:1.5 F4:.5 E4:1 G4:1 | C5:1 D5:1 E5:2 | D5:1 D5:1 C5:1 B4:1 | C5:4"""),
 'UVA': dict(song='The Good Old Song', key='F', tempo=116, meter='4/4', pickup=1, n="""
   G3:1 | C4:1.5 C4:.5 C4:1 E4:1 | D4:1.5 C4:.5 D4:1 E4:.5 D4:.5 | C4:1.5 C4:.5 E4:1 G4:1 | A4:3 A4:1 |
   G4:1.5 E4:.5 E4:1 C4:1 | D4:1.5 C4:.5 D4:1 E4:.5 D4:.5 | C4:1.5 A3:.5 A3:1 G3:1 | C4:3 A4:1 |
   G4:1.5 E4:.5 E4:1 C4:1 | D4:1.5 C4:.5 D4:1 A4:1 | G4:1.5 E4:.5 E4:1 G4:1 | A4:3 C5:1 |
   G4:1.5 E4:.5 E4:1 C4:1 | D4:1.5 C4:.5 D4:1 E4:.5 D4:.5 | C4:1.5 A3:.5 A3:1 G3:1 | C4:4"""),
 'ALA': dict(song='Yea, Alabama!', key='Bb', tempo=192, meter='2/4', pickup=0, n="""
   C5:1.5 G4:.5 | A4:.5 G4:.5 E4:.5 C4:.5 | D4:1 E4:1 | G4:2 |
   E4:.5 E4:.5 F4:.5 G4:.5 | A4:1 A4:1 | G4:.5 F4:.5 E4:.5 D4:.5 | E4:2 |
   C5:1.5 G4:.5 | A4:.5 G4:.5 E4:.5 C4:.5 | D4:1 E4:1 | A4:2 |
   G4:.5 G4:.5 A4:.5 B4:.5 | C5:1 E5:1 | D5:.5 C5:.5 B4:.5 D5:.5 | C5:2"""),
 'USC': dict(song='Fight On', key='Bb', tempo=196, meter='2/4', pickup=0, n="""
   G4:1 G4:1 | A4:.5 G4:.5 E4:.5 G4:.5 | C5:2 | R:2 |
   A4:1 A4:1 | B4:.5 A4:.5 F4:.5 A4:.5 | D5:2 | R:2 |
   C5:.5 B4:.5 A4:.5 G4:.5 | A4:.5 G4:.5 F4:.5 E4:.5 | F4:1 D4:1 | G4:2 |
   G4:1 G4:1 | A4:.5 G4:.5 E4:.5 G4:.5 | C5:1 E5:1 | D5:.5 C5:.5 B4:.5 D5:.5 | C5:2"""),
 'CLEM': dict(song='Tiger Rag', key='Bb', tempo=232, meter='2/4', pickup=0, n="""
   E5:.5 D5:.5 C5:1 | E5:.5 D5:.5 C5:1 | E5:.5 D5:.5 C5:.5 A4:.5 | G4:2 |
   F4:.5 E4:.5 D4:1 | F4:.5 E4:.5 D4:1 | F4:.5 E4:.5 D4:.5 B3:.5 | C4:2 |
   E5:.5 D5:.5 C5:1 | E5:.5 D5:.5 C5:1 | E5:.5 D5:.5 C5:.5 A4:.5 | G4:2 |
   A4:.5 B4:.5 C5:.5 D5:.5 | E5:.5 D5:.5 C5:.5 B4:.5 | A4:1 G4:1 | C5:2"""),
}
M['LSU'] = dict(M['CLEM'])   # LSU's alternate is the same public-domain tune

NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
KEYS = {'C': 0, 'Bb': -2, 'F': 5 - 12, 'Eb': 3, 'G': -5, 'D': 2, 'Ab': -4}

def midi(n):
    if n == 'R':
        return 0
    m = re.fullmatch(r'([A-G])([#b]?)(\d)', n)
    if not m:
        raise SystemExit('bad note ' + n)
    return 12 * (int(m.group(3)) + 1) + NOTE[m.group(1)] + {'#': 1, 'b': -1, '': 0}[m.group(2)]

def melody(abbr, d):
    per = {'2/4': 2, '4/4': 4}[d['meter']]
    bars = [b.split() for b in d['n'].split('|')]
    notes = []
    for i, b in enumerate(bars):
        tot = 0
        for tok in b:
            n, dur = tok.split(':')
            dur = float(dur)
            tot += dur
            m = midi(n)
            notes.append([m + KEYS[d['key']] if m else 0, dur])
        want = d['pickup'] if (i == 0 and d['pickup']) else per
        if i < len(bars) - 1 and abs(tot - want) > 1e-6:
            raise SystemExit(f'{abbr}: bar {i + 1} has {tot} beats, meter wants {want}')
    beats = sum(x[1] for x in notes)
    return {'song': d['song'], 'approx': True, 'tempo': d['tempo'], 'meter': d['meter'], 'pickup': d['pickup'], 'key': d['key'],
            'seconds': round(beats * 60 / d['tempo'], 1),
            'notes': [[n, int(b) if b == int(b) else b] for n, b in notes]}

def main():
    std = json.load(open(STD))['stadiums']
    ids = {e['team']: (e['school'], e.get('espnId')) for e in std}
    rows = [r.split('|') for r in T.strip().splitlines()]
    out, seen = [], set()
    for ab, title, year, comp, pd, alt in rows:
        if ab not in ids:
            raise SystemExit('unknown team ' + ab)
        seen.add(ab)
        school, espn = ids[ab]
        e = {'team': ab, 'school': school}
        if espn:
            e['espnId'] = espn
        e['title'] = title
        if year:
            e['year'] = int(year)
        if comp:
            e['composer'] = comp
        e['pd'] = pd == '1'
        if alt:
            a = alt.split(';')
            e['alt'] = {'title': a[0], **({'year': int(a[1])} if a[1] else {}), **({'composer': a[2]} if a[2] else {}), 'pd': a[3] == '1'}
        if ab in M:
            mel = melody(ab, M[ab])
            src = e if mel['song'] == title else e.get('alt')
            # hard copyright gate: a melody only for a song that is marked public domain AND dated before 1929
            if not src or src.get('title') != mel['song'] or not src.get('pd') or not (src.get('year') or 0) < 1929:
                if not (src and src.get('pd') and src.get('title') == 'Glory, Glory'):   # Battle Hymn tune, 1861
                    raise SystemExit(f'{ab}: melody for {mel["song"]} fails the public-domain check')
            e['melody'] = mel
        out.append(e)
    miss = set(ids) - seen
    if miss:
        raise SystemExit('missing teams: ' + ' '.join(sorted(miss)))
    doc = {'format': 'gridiron-live-fight-songs', 'version': 1, 'season': 2026, 'name': 'FBS fight songs 2026',
           'notes': ('One entry per FBS program. No lyrics. Melodies only for songs first published before 1929 (US public '
                     'domain), as approximate arrangements ("approx": true); every other song is metadata only ("pd": false) '
                     'and plays from your own recording (Settings > Fight songs) or a generic original cadence.'),
           'songs': out}
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, 'gridiron-live-2026-fight-songs.json')
    with open(p, 'w') as f:
        f.write('{' + ',\n'.join(f'{json.dumps(k)}:{json.dumps(v)}' for k, v in doc.items() if k != 'songs'))
        f.write(',\n"songs":[\n' + ',\n'.join(json.dumps(e, ensure_ascii=False) for e in out) + '\n]}\n')
    mel = [e for e in out if 'melody' in e]
    pd = [e for e in out if e['pd'] or (e.get('alt') or {}).get('pd')]
    print(f'wrote {p} {os.path.getsize(p) // 1024} KB: {len(out)} teams, {len(mel)} with a melody, '
          f'{len(pd) - len(mel)} more public-domain songs without one, {len(out) - len(pd)} metadata only')
    print('melodies:', ', '.join(f"{e['team']} ({e['melody']['song']}, {e['melody']['seconds']} s)" for e in mel))

main()

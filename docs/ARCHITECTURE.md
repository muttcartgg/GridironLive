# Gridiron Live: Architecture

An original 2D pixel-art college football game for iPhone. The game is written in HTML5 Canvas and JavaScript. A small native Swift app runs it full-screen in a `WKWebView`. The same file also runs in any browser, so you can test it on a computer without building the app.

## Repository layout

```
src/index.html                 Game source (everything: data, UI, engine, renderer)
web/index.html                 Built game, with the pixel font inlined. This is what ships in the app.
tools/build_web.py             Builds src/ into web/ (inlines the font)
tools/fonts/                   Silkscreen pixel font (SIL Open Font License)
ios/project.yml                XcodeGen spec for the iOS app
ios/GridironLive/*.swift       Native shell: window, WKWebView, save bridge
ios/GridironLive/Assets.xcassets  App icon
.github/workflows/build-ipa.yml   Builds an unsigned .ipa on a GitHub macOS runner
```

## Runtime layers

```
┌──────────────────────────── iOS app (Swift) ────────────────────────────┐
│ SceneDelegate → GameViewController → WKWebView(file://…/web/index.html) │
│ Save bridge: UserDefaults  ⇄  window.__NATIVE_SAVE__ / messageHandlers  │
└──────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── Game (JavaScript) ──────────────────────────┐
│ 1 Utilities + Store (native bridge, falls back to localStorage)         │
│ 2 League data: teams, rosters, ratings, schedule, CPU sim, rankings,    │
│   postseason, offseason (graduation, progression, recruiting)           │
│ 3 Hub UI: setup, home, schedule, Top 25, roster, league, settings       │
│ 4 Game engine: state machine, formations, AI, passing, tackles, clock   │
│ 5 Input: drag-to-aim slingshot, steer, juke                             │
│ 6 Audio: synthesized whistle/crowd (no audio files)                     │
│ 7 HUD: scoreboard, toasts, banners                                      │
│ 8 Pixel renderer: low-res canvas → nearest-neighbour upscale            │
│ 9 Main loop + boot                                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

## Data model (saved as one JSON document)

```js
League {
  version, season, week, phase: 'regular' | 'offseason',
  user: teamId, credits, recruitPts, champ,
  settings: { qlen, diff, muted },
  teams: Team[32], weeks: Week[12..15], rank: teamId[], history: Season[], recruits: Player[] | null
}
Team   { id, city, name, abbr, c1, c2, conf: 0..3, prestige: 1..5, roster: Player[31], rec: {w,l,cw,cl,pf,pa}, cc, titles, ccTitles }
Player { id, first, last, pos, num, yr: 1..4, spd, cat, thr, end (1..5 stars), tone }
Week   { label, kind: 'reg'|'ccg'|'semi'|'final', games: [{ h, a, hs, as, tag?, neutral? }] }
```

Roster: 2 QB, 2 RB, 4 WR, 2 TE, 6 OL, 5 DL, 3 LB, 4 CB, 3 S. Starters are picked automatically by position overall: a weighted mix of the four star ratings, with different weights per position.

## Season pipeline

1. **Regular season (weeks 1–12).** 7 conference games, played as a round-robin within each 8-team conference, plus 5 non-conference games across conferences.
2. **Rankings** are recomputed after every week. They use win percentage, losses, team overall rating, prestige and strength of schedule.
3. **Championship Week.** The top two teams in each conference play for the title.
4. **Playoff.** Semifinals are #1 vs #4 and #2 vs #3, followed by the National Championship.
5. **Offseason.** Seniors graduate and underclassmen may gain stars. You sign recruits with recruiting points, open roster spots are filled with walk-ons, prestige shifts with results, and a new schedule is generated.

CPU games use a ratings-based score model (`simScore`). Your games are played live. You can also simulate them, or simulate to the final from the pause menu.

## Game engine

**Coordinates.** Units are yards. The field runs x 0–120, endzones included, so your goal line is at x=10 and theirs at x=110. It runs y 0–53.3 sideline to sideline. You always attack to the right.

**Phases.**
`presnap → live → dead → (presnap | pat | kick | drive) … → over`

- `drive` shows an opponent's possession. Their drives are simulated from both teams' ratings and shown as a summary card.
- Overtime follows college rules: each team gets a possession from the 25 until one is ahead.

**Passing (the slingshot):**
```
target = QB + (dragStart − dragNow) × aimScale      // y axis divided by the view squash
|target − QB| ≤ maxRange = 44 + 5 × QB.thr
flightTime = d / ((17.5 + 1.8 × QB.thr) + 0.18 d)
```
When the ball lands, it is caught, intercepted or incomplete. The outcome depends on the receiver's distance from the ball, the nearest defender's distance, the receiver's Catching rating and the defender's ball skills.

**Ratings → physics:**

| Rating | Effect |
|---|---|
| Speed | top speed × (0.82 + 0.06 × stars) |
| Catching | catch probability (+3.5% per star uncontested); defenders: interception chance |
| Throw power | max range and ball velocity |
| Endurance | stamina drain rate; how long a pass rusher takes to shed a block |

**Stamina (linear):**
```
progress = elapsed game time / total game time      (0 → 1)
stamina  = 1 − (0.32 − 0.05 × endurance) × progress
speed    = baseSpeed × ratingFactor × stamina
```
A 1-star endurance player ends the game 27% slower. A 5-star player ends only 7% slower.

**Advanced stats.** Every pass attempt records its depth relative to the line of scrimmage, its lateral zone (left/middle/right from the QB's view), the result, the yards gained and the yards after the catch. The post-game screen shows:
- a completion heatmap, 3 lanes × 4 depths, plus total and per-catch yards after the catch
- the college passer-efficiency rating: `(8.4·yds + 330·TD + 100·comp − 200·INT) / att`

## Pixel renderer

Everything on the field is drawn into a low-resolution canvas, at about 3.5 art pixels per yard, then scaled up with nearest-neighbour filtering, which gives crisp pixels at any screen size. The view is squashed vertically (`VY = 0.62`) for a sideline-camera feel, while sprites stay upright. Player sprites are 7×10 pixels with 3 animation frames plus a tackled pose, recolored per team: home teams wear their color, away teams wear white. They get a 1-pixel outline and are cached per palette. Yard numbers and endzone lettering use a built-in 3×5 bitmap font.

## Build pipeline

1. Edit `src/index.html`, then run `python3 tools/build_web.py` to produce `web/index.html`.
2. Push to GitHub. The Build IPA workflow runs `xcodegen` and `xcodebuild` with signing disabled, then zips `Payload/GridironLive.app` into `GridironLive.ipa`.
3. Download the artifact and install it with your sideloading tool, which signs it with your Apple ID.

## Roadmap ideas (Phase 2+)

- A depth chart editor and position changes
- Injuries, and fatigue that carries over between games
- Bowl games for teams outside the playoff, plus Heisman and awards voting
- A transfer portal and NIL budget as a second recruiting currency
- Playing defense yourself, as an option
- Exporting and importing the league as JSON, to share custom team packs
- Haptics through a native bridge, and a Game Center leaderboard

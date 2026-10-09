# Gridiron Live: Architecture

An original 2D pixel-art college football game for iPhone. The game is written in HTML5 Canvas and JavaScript. A small native Swift app runs it full-screen in a `WKWebView`. The same file also runs in any browser, so you can test it on a computer without building the app.

## Repository layout

```
src/index.html                 Page shell: HUD markup + CSS
src/js/01-util.js … 09-main.js Game code: storage/saves, league data, season, hub UI, engine, input, audio/HUD, renderers, loop
web/index.html                 Built game (all JS + font inlined). This is what ships in the app.
tools/build_web.py             Builds src/ into web/
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
│ Save bridge: UserDefaults (gl.kv.*) ⇄ window.__NATIVE_KV__ / kv handler │
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

## Version 3 additions

- **Saves.** There are 3 slots (`gl3.slot1..3`) plus a `gl3.meta` summary. The game autosaves at every snap through `snapshot()` → `LG.live`, so a game can be resumed mid-play. Save codes are base64 JSON with a `GL3:` prefix. v1 saves migrate into slot 1.
- **Ratings.** Ratings are position-specific (`PATTR`): QB Arm/Accuracy/Speed/Stamina; RB, WR and TE Speed/Strength/Catching/Stamina; defense Tackling/Strength/Speed/Stamina, plus Ball skills for DBs; the kicker has Leg/Accuracy. Strength vs. Tackling decides stiff-arms. Accuracy sets the radius of the throw-error circle.
- **Postseason.** Conference title games come first. The 12-team playoff takes the 4 conference champions plus the 8 highest-ranked teams, seeded by ranking, with byes for seeds 1–4 and first-round games on campus. Bowls go to other teams with 6+ wins.
- **Offseason pipeline.** The stages are: recap (awards, AD review) → departures (graduation, early declarations, pro draft, outgoing portal) → coaching carousel → transfer portal (costs NIL) → recruiting board (interest, official visits) → Signing Day → camp (progression, new schedule).
- **Opponent drives.** These are told as a play-by-play ticker (`driveLines`). Your defenders earn tackle, sack and INT credit plus XP.
- **Team packs.** `applyTeamPack()` handles names, colors, prestige, stadiums, conference names, cross-conference rivals and trophies, and rosters (`rosterFromPack`). `REAL_PACK` is the built-in real-programs option.

## Version 4: all of Division I

- `src/js/02b-ncaa.js` holds all 265 FBS and FCS programs in their 2026 conferences: name, mascot, abbreviation, colors, and a strength rating from 1.0 to 5.0 that sets roster quality and prestige. It also lists the real rivalries.
- **Schedule (`buildSchedule`).** Rivalry games go in the last week. Each conference gets a circulant graph so every team plays the same number of conference games (9 for the SEC, Big Ten and Big 12; 8 for most others). Non-conference games fill each team up to 12, mostly against its own division with some FBS-vs-FCS games. Then greedy edge colouring assigns weeks across a 13- or 14-week season with byes.
- **Postseason, by week offset after the regular season (`L.R`).** Offset 0: conference title games, plus the FCS first round. Offset 1: CFP first round, all bowls, the Celebration Bowl (MEAC vs SWAC champions) and the FCS second round. Offsets 2–4: quarterfinals, semifinals, and both national championships.
- **Saves.** Saves are compressed with lz-string, about 0.4 MB per slot. The in-game autosave writes only a small `gl3.live<slot>` record, so snapping the ball stays instant.

## Version 5: gameplay, defense and broadcast

- **Two-sided engine (`05-engine.js`).** The offense always attacks +x in engine coordinates. `S.poss` says who has the ball (`home` is you). `offT()/defT()` give the teams; each player carries `team` and `user`. When the opponent has the ball you can play defense (setting: ask, play or sim); the AI offense calls plays by scheme (`aiPickPlay`), reads coverage with a progression (`aiQB`), and runs with a vision search (`aiRunner`). AI 4th-down, punts, field goals and PATs are in `aiFourth/aiSpecial/aiPAT`.
- **Playbook (`05b-playbook.js`).** Formations, 30+ routes, 50 plays and the six defensive calls. Team schemes (Option, Air Raid, Power, Pro, Spread) shape play calling and simulated stats.
- **Run game.** At the snap, blockers get assignments by global greedy matching (`assignRunBlocks`). Engaged defenders slow sharply and are turned sideways to open lanes; they are never pushed backwards. Linebackers fit the gap before pursuing. Pursuit uses intercept angles.
- **Passing.** Error grows with distance, pressure, moving and weather, and is mostly lateral. Receivers track the ball early and keep working after routes end. Zone defenders read threats in their area; man defenders trail with a shrinking cushion.
- **Clock.** The game clock runs during plays (`CLK.play`) and between plays after in-bounds tackles (`CLK.pre`, capped per snap). It stops on incompletions, out of bounds, scores, changes of possession and penalties, and briefly on first downs inside two minutes of each half. The AI uses its timeouts when trailing late.
- **Ratings.** Attributes stay 1–5 internally; the UI shows 40–99 overalls (`ovr99`, `tOvr99`).
- **Rankings (`updateRankings`).** An opponent-adjusted power rating (margins capped at 24, a preseason prior that fades over about three games) plus a résumé score where win quality depends on the opponent and bad losses cost more.
- **Broadcast (`08b-broadcast.js`).** Crews, captions and `speechSynthesis` voice, studio shows, ticker (other games are pre-simulated at kickoff and `finishWeek` uses those results), lower thirds, win probability, decibel meter, custom stadium sounds, replay recorder and playback, and the social feed. Series records are tracked from games played in the dynasty.
- **Scene (`08c-scene.js`).** Sideline people, chain crew, crowd themes and density, turf wear and snow, time of day, fireworks, field storming and celebration poses.
- **iOS.** `GameViewController` disables WebKit text interaction and long-press recognizers so holding a finger mid-play never brings up the magnifier or callout.

## Version 5.1

- Commentators removed. `08b-broadcast.js` is now a graphics package: result cards (`BC.card`), situation graphics (`BC.presnap` → `#sit`), drive tracker (`S.drive`), linescore (`S.line`), kickoff intro and end-of-quarter cards (`#qcard`), and a graphics-only pregame/halftime show.
- Polls have inertia: last week's position adds `(30 − index) × 0.11` to a team's score, and a loss costs `(0.35 + (1 − opponent quality) × 1.5)`, 40% less when it's within a touchdown. A loss to a good team is now a dip of a few spots.

## Version 6

- `src/js/10-features.js` holds the v6 systems: sliders (`SL`), haptics (`haptic` → `webkit.messageHandlers.haptic`, handled natively in `GameViewController`), wind (`S.wind`), coin toss, icing, in-game injuries (`S.injured`, depth reordered by `applyInjuredDepth`), motion (`S.motion`), hot routes, play-by-play (`S.pbp`), drives (`S.drive` → `S.drives`), box score, player grades, uniforms (`uniColors`), body builds (`BUILD`), photo mode, Quick Play (a temporary league with `L.quick`, never saved), save backups (`gl3.bak<slot>`, at most every 10 minutes) and accessibility.
- Broadcast polish lives in `08b-broadcast.js` (flag card, scoring drives, turnover chip, game lines, ticker headlines and upset alerts, temperature and attendance) and `08c-scene.js` (on-field graphics, pylons, ball trail, flashbulbs, final graphic and title celebrations).

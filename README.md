# Gridiron Live

A college football dynasty game for iPhone, with a modern HD look (or retro pixel, your choice).

- **On the field (v5):** a 50-play playbook (32 pass concepts, 18 runs including options, jet sweeps, reverses and a flea flicker), playable defense with six coverages, a floating joystick for ball carriers and defenders, juke/spin/truck/hurdle/dive buttons, drag-to-aim passing where the camera leads downfield, receivers who keep working after their routes end, zone and man coverage that reads the play, fumbles, big hits, fairer penalties, a real-time college clock with AI timeouts, and celebrations after touchdowns.
- **Broadcast (graphics only, no commentators):** a pregame show (tale of the tape, keys to the game, matchup spotlight) and a halftime report (linescore, team stats, leaders), a kickoff intro card, play result cards, 3rd/4th-down and red-zone graphics, a drive tracker, end-of-quarter linescores, an out-of-town score ticker, player cards, a Heisman tracker, win probability and 4th-down odds, a decibel meter, instant replay with slow-mo, dot tracking and a telestrator, a social feed, and a customizable score bug.
- **Stadium:** animated crowds that bounce, thin out in blowouts and wear student-section themes, cheerleaders, a mascot, the chain crew, coaches who react, fireworks at night, field storming, rivalry trophy presentations, turf wear, muddy uniforms, snow that builds up, afternoon games that turn into night, and signature turf colors.
- **Your program:** all 265 Division I programs (138 FBS, 127 FCS) in their 25 conferences for 2026, with FBS and FCS Top 25 polls, conference title games, the 12-team CFP, a full bowl season, the 24-team FCS playoff and the Celebration Bowl. Also rivalry trophies, the Heisman race and awards, the transfer portal, NIL money, Signing Day, redshirts, early draft declarations, coordinators, facilities, XP, injuries, morale, front-office decisions, the coaching carousel, and school records.
- **Leagues:** all of FBS and FCS (team colors, real rivalries, strength based on recent results), 32 original schools, or your own team pack. Team packs can include real rosters.
- **Saves:** 3 slots (compressed), autosave at every snap, resume a game mid-play, and save codes for backup.

## Version 6.1

- Opponent stats are tracked for simulated drives too, so halftime and post-game numbers are complete for both teams.
- Redesigned bottom score ticker: every out-of-town game has its own kickoff time, so you see upcoming, live and final games with ranks, team colors and quarter/clock; upset alerts; Heisman and Top 5 headlines.
- The bottom score bug option now sits cleanly above the ticker.
- Rankings tab: Top 25 with record vs Top 25, best win, strength-of-schedule rank and power rating, plus others receiving votes; an All teams view of every FBS or FCS team; and a Results view of every game, by week, with filters.
- Better polls: ranked teams that win can't fall more than two spots, and head-to-head results break near-ties.
- New Playoff tab: a full 12-team CFP bracket (projected from today's rankings during the season, live in December) with seeds, bowl names, scores and the champion, plus bubble watch, every bowl result and the FCS bracket.
- The build workflow now publishes the .ipa as a GitHub Release.

## Version 6 additions

**Gameplay:** hot routes (tap a receiver after picking a play), pre-snap motion, no-huddle (repeat your last play instantly), bullet and lob throws, real wind that pushes passes and kicks, in-game injuries with backups stepping in, gameplay sliders (your QB accuracy and run blocking, CPU coverage and tackling, injury frequency), iPhone haptics, a coin toss where you call it and choose to receive or defer, and the CPU icing your kicker late.

**Game tools:** box score, play-by-play log and drive chart in the pause menu, post-game player grades and drive chart, uniform choices (traditional, home colors, road whites, alternate dark, color rush), helmet decals, position body types, and a photo mode with camera control and filters.

**Dynasty and menus:** poll movement arrows, national stat leaders, a trophy case, a game of the week, Quick Play exhibitions between any two programs, automatic save backups you can restore, larger text and color-blind friendly colors.

**Broadcast polish:** team records on the score bug, a points flyout and count-up, a running-clock indicator, scoring-drive and turnover-margin graphics, a broadcast penalty card, punt result cards, a player's game line after big plays, a fourth-quarter moment, a final score graphic with the linescore, championship celebrations, a go-ahead-score slow-mo, upset alerts and headlines in the ticker, temperature and attendance, the offense's formation and personnel shown on defense, the coverage you faced on pass results, on-field line-to-gain and down-and-distance graphics, a field goal range line, pylons, a ball trail and height-based shadow, camera flashes in the stands at night, a score bug entrance, a network bug, a splash screen, smoother menu transitions and tap feedback.

## Play it right now (no install)

Open `web/index.html` in Safari or any browser. In Safari on iPhone, tap Share, then **Add to Home Screen**, and it runs full-screen like an app.

## Build the .ipa (free, from your phone or a computer)

You can't build iPhone apps on Linux or Windows, so this project uses GitHub's free macOS build machines:

1. Create a free GitHub account if you don't have one, then create a new **private** repository.
2. Unzip `gridiron-live.zip`, open the `gridiron-live` folder, and upload **what's inside it** (the `ios`, `web`, `src`, `tools`, `docs` and `.github` folders plus `README.md`) to the repository, keeping the folder structure. On github.com use **Add file → Upload files** and drag the folders in. The `.github` folder is hidden on Mac and iPhone; if it doesn't upload, create `.github/workflows/build-ipa.yml` with **Add file → Create new file** and paste its contents.
3. Open the repository's **Actions** tab. The **Build IPA** workflow runs on every push, or you can start it with **Run workflow**. It takes about 5–10 minutes.
4. When it finishes, open your repository's **Releases** (right side of the repo page, or `/releases`) and tap **GridironLive.ipa** under "Gridiron Live (latest build)". That downloads the .ipa directly, even on iPhone. (The same file is also in the run's Artifacts as a .zip.)
5. Install it with your sideloading tool, such as Sideloadly or AltStore. They sign the app with your Apple ID during install.

Notes:
- With a free Apple ID, sideloaded apps expire after 7 days. Re-install, or let AltStore refresh it, to keep playing. Your save is kept as long as you don't delete the app.
- macOS build minutes on GitHub are limited on private repositories, but one build uses only a few.

## Making changes

Edit files in `src/` (the page is `src/index.html`; the code is in `src/js/`), then run:

```
python3 tools/build_web.py
```

That rebuilds `web/index.html`, the file the app ships. Push it, and GitHub builds a new .ipa.

See `docs/ARCHITECTURE.md` for how everything fits together.

## Controls

| Action | How |
|---|---|
| Call a play | Pick from **Pass**, **Run** or **Special**, or tap **Coach's pick**, then tap **Snap** (**Flip** mirrors it) |
| Throw | Drag backward from anywhere, then release. The circle shows how accurate the throw will be. |
| Bullet pass | Tap a second finger while dragging, or turn on **Bullet** |
| Scramble | Tap the field before throwing, or **Run** |
| Move a ball carrier | Put a finger down anywhere and drag (floating joystick) |
| Moves | **Juke ▲ / Juke ▼ / Spin / Truck / Hurdle / Dive**; on options, **Pitch** |
| Defense | Pick a coverage. Drag to move your player (gold ring). **Tackle** dives at the carrier or plays the ball in the air. **Switch** takes the defender nearest the ball. Tap any defender before the snap to control him. |
| Celebrate | Tap **Celebrate** right after a touchdown |
| Replay | Tap **Replay** after a big play; turn on dot tracking or draw with the telestrator |
| Kick | Tap to lock direction, tap again to lock power |
| Timeout | **Timeout** button before the snap while the clock is running |
| Pause / sim to final / save & exit | Pause button, top-left |

## Real names

New all-of-Division-I dynasties place a handful of well-known 2026 players on their teams (for example Keelon Russell and Ryan Williams at Alabama, Julian Sayin and Jeremiah Smith at Ohio State, Arch Manning at Texas). Everyone else is generated. Edit any name in the roster editor, or import a team pack with full rosters. Social accounts are fictional.

## Team packs and real rosters

In the League tab, **Export team pack** gives you the current league as text. Edit it, or write your own, and **Import team pack** to apply it. Each team can include a `roster` list such as `{"name":"First Last","pos":"QB","num":7,"yr":"JR","ovr":4}`. Positions like EDGE, OT, DT and FS are understood, and empty spots are filled with walk-ons. On the new-dynasty screen, **Load a team pack** starts a dynasty with your pack.

## Credits

Save compression uses lz-string by pieroxy (MIT License, see `tools/LZ-STRING-LICENSE.txt`). The Silkscreen font is by Jason Kottke and is licensed under the SIL Open Font License (see `tools/fonts/OFL-LICENSE.txt`).

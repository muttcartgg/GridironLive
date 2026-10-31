# Roster & logo packs

Gridiron Live ships with generated players and text badges only. Real rosters and team logos come from a **pack**: a JSON file you import yourself. Nothing in a pack is bundled with the app.

## Importing on iPhone

1. Save the pack (`gridiron-live-2026-rosters.json`) to the Files app, for example from AirDrop, Mail or iCloud Drive.
2. In the game, open **Settings → Rosters & data → Import rosters & logos**. On the new-dynasty screen, use **Import rosters & logos** in the League card instead.
3. Tap **Choose file…** and pick the pack. A preview shows how many teams matched, how many players and logos it has, and how many custom players it adds.
4. Pick the options you want, then tap **Import**:
   - **Apply to this dynasty now** replaces the rosters of the matched teams. **Keep my team's roster** leaves your own team alone. This is turned off while a game is in progress.
   - **Use for new dynasties** stores a compressed copy (about 0.7 MB). New dynasties start from it, and the setup screen has an On/Off switch for it.

Logos are links (https or `data:` images), so they need a connection the first time each logo loads. Without one, the generated badges are shown. **Show imported logos** turns them off. **Remove imported data** deletes the stored pack and clears logos from the current dynasty.

## Format (version 2)

```json
{"format":"gridiron-live-pack","version":2,"season":2026,"name":"…",
 "teams":[{"school":"Alabama","mascot":"Crimson Tide","abbr":"ALA","espnId":333,
           "primary":"#9E1B32","secondary":"#FFFFFF","logo":"https://…png","logoDark":"https://…png",
           "stadium":"Bryant-Denny Stadium","capacity":100077,
           "coaches":{"hc":{"name":"First Last","rating":5,"traits":["Offensive Guru","QB Whisperer"],"since":2024},
                      "dc":{"name":"First Last","rating":5,"traits":["Turnover Specialist","Defensive Mastermind"]}},
           "roster":[{"name":"First Last","pos":"QB","realPos":"QB","num":12,"yr":"SO","ht":75,"wt":201,
                      "home":"Dallas, TX","espnId":"5141629","spd":3.9,"agi":3.8,"str":3.0,"awr":4.4,"thr":4.9,
                      "acc":4.9,"cat":2.1,"rte":2.0,"car":3.3,"blk":1.6,"tkl":1.0,"cov":1.0,"shd":1.0,"end":4.4,"ovr":97}]}],
 "players":[{"team":"UGA","name":"…","pos":"WR","ovr":88}]}
```

- **Teams** are matched by `espnId` (after a first import), then `abbr`, then school name. School names, colors and conferences in your league don't change.
- **pos** is one of QB RB WR TE OL DL LB CB S K. Common real positions also work: OT/OG/C/G → OL, DE/DT/NT/EDGE → DL, OLB/ILB/MLB → LB, DB → CB, FS/SS → S, PK/P → K, FB/HB → RB, ATH → WR.
- **Ratings**: the 14 attributes go from 1.0 to 5.0. You can also give them on the 25–99 scale. You can give only some attributes, or only an overall `ovr` from 40 to 99, and the rest is generated around it. When `ovr` is given, the game shows that number.
- **yr** is FR/SO/JR/SR or 1–4. Add `"rs":true`, or write "RS SO", for a redshirt. `num`, `ht` (inches), `wt`, `home` and `espnId` are optional. A player's `espnId` also gives him his real headshot in the game (loaded from ESPN's CDN when online, never stored in the save; Settings › Rosters & data › Show real player photos). Players without one get a team-colour avatar with their number.
- Each team keeps its best 60 players. Every position gets its minimum first (QB 3, RB 4, WR 6, TE 3, OL 10, DL 8, LB 6, CB 5, S 4, K 2), then the remaining spots go to the best players left. Open spots are filled with walk-ons.
- **players** (custom players) are always added to the team named in `team` (an abbreviation or school name). If the roster is full, the weakest spare player at that position is dropped.
- **coaches** (optional) replace a team's head coach (`hc`), offensive coordinator (`oc`) and defensive coordinator (`dc`). `rating` is 1–5, `traits` holds one or two signature traits by name or key: Turnover Specialist (TO), Defensive Mastermind (DM), Pass Rush Guru (PR), QB Whisperer (QBW), Offensive Guru (GURU), Air Raid (AIR), Run Game Architect (RUN), Special Teams Ace (ST), Recruiter (REC), Portal King (PK), Developer (DEV), Motivator (MOT), Clock Manager (CLK), Disciplinarian (DIS), Health First (HLT). `age`, `since` (first season at the school) and `interim` are optional. Your own team keeps you as head coach; when you start a dynasty you inherit the school's coordinators. The game itself only makes up coach names: real ones come only from a pack.
- **schedule** (optional) is a real season: `{"season":2026,"through":8,"weeks":13,"updated":"2026-10-25","games":[[1,"TCU","UNC",10,15,5,"08-29","Aer Lingus College Football Classic"],…]}`. Each game is `[week, home, away, home points, away points, flags, "MM-DD", tag]`. Home and away are pack team `abbr`s (a school outside the game is written `"?Name"`). Points are `null` until the game is final. Flags: 1 neutral site, 2 conference game, 4 final. `through` is the last week whose games are all final.
- Older packs in the `{"conferences":[…],"teams":[…]}` format are still accepted. Their teams are matched by order.

## Real 2026 season mode

When the saved pack ("Use for new dynasties") has a `schedule`, the new-dynasty screen shows **Season: New schedule / Real 2026 · week N**. With Real picked, the dynasty starts inside the real season. The league uses the real schedule (week 1 = the week-0 and week-1 games, week 13 = Rivalry Week) and replays every finished week through the normal weekly flow, using the real final scores. That gives every FBS team its real record and points for and against. Standings, rivalry trophies and news follow from those results. Player stat lines are simulated to fit each real score. The AP-style poll is our voter model run week by week over the real results, and the CFP rankings come from the usual committee model from week 10. Your season picks up in week `through + 1` on the real remaining schedule (neutral sites and named games included). Then conference title games, bowls, the CFP and the FCS playoffs come from the game's postseason. Games after Rivalry Week (Army–Navy) are played in Championship Week.

The data covers only games with an FBS team. FCS-vs-FCS games come from the game's own scheduler (moved to an open week when a real game takes their slot, plus extra non-conference games so FCS teams play 10–12). Results for those games are simulated, including the finished weeks. A school that isn't in the game (Merrimack) counts toward its opponent's record. Normal dynasties are unchanged.

`custom-players-template.json` shows every player field. **Settings → Export my roster (JSON)** writes your team in this format.

## Rebuilding the 2026 pack

```
python3 -I tools/data/build_pack.py [outdir]     # default /home/claude/packs
```

The builder reads a local clone of `sportsdataverse/cfbfastR-data`: the 2026 rosters, 2025 and 2026 play-level player stats, ESPN team ids, colors and logo links, the 2026 team info for stadiums, and `schedules/parquet/cfb_schedules_2026.parquet` for the real season (`schedule`). Schedule teams are matched by ESPN id, then by name, the same way as the rosters. To refresh the data, update those files in the clone (for example `git checkout origin/HEAD -- <path>` after a fetch, or download them from raw.githubusercontent.com) and rebuild. It writes the pack and the template. Ratings come from 2025 and 2026 production (usage, efficiency, TDs and INTs, sacks, PBUs, forced fumbles, FG%), class, size compared with the position norm, and program strength. Each team is then calibrated so its `teamOvr()` follows the generated league's curve for that program's strength. Linemen and punters have no box-score stats, so class, size and team decide their ratings. Output is deterministic.

Coaches: the builder adds `coaches` for every FBS program from the 2026 head-coach list in `build_pack.py` (`FBS_HC`, taken from Wikipedia's list of current FBS coaches in October 2026) and the coordinators in `COORDS` that were verified for 2026: 57 offensive and defensive coordinators at 30 programs (the AP Top 25 of Oct 25 2026 plus big brands). They were checked against ESPN's Power 4 coordinator tracker, FootballScoop's 2025-26 FBS OC and DC change tables and in-season news through Oct 26 2026, and each entry notes its source. SMU, Boise State and Wake Forest (both coordinators), the Ole Miss DC, the Penn State OC and the Oregon OC (fired Oct 26) couldn't be verified and stay generated. Ratings and traits are game estimates (`HC_TRAITS`; other coaches get one trait from a fixed hash). FCS teams keep generated coaches. To refresh only the coaches of an existing pack without the roster data: `python3 -I tools/data/build_pack.py --coaches-only [pack.json]`.

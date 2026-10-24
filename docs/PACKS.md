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
           "roster":[{"name":"First Last","pos":"QB","realPos":"QB","num":12,"yr":"SO","ht":75,"wt":201,
                      "home":"Dallas, TX","espnId":"5141629","spd":3.9,"agi":3.8,"str":3.0,"awr":4.4,"thr":4.9,
                      "acc":4.9,"cat":2.1,"rte":2.0,"car":3.3,"blk":1.6,"tkl":1.0,"cov":1.0,"shd":1.0,"end":4.4,"ovr":97}]}],
 "players":[{"team":"UGA","name":"…","pos":"WR","ovr":88}]}
```

- **Teams** are matched by `espnId` (after a first import), then `abbr`, then school name. School names, colors and conferences in your league don't change.
- **pos** is one of QB RB WR TE OL DL LB CB S K. Common real positions also work: OT/OG/C/G → OL, DE/DT/NT/EDGE → DL, OLB/ILB/MLB → LB, DB → CB, FS/SS → S, PK/P → K, FB/HB → RB, ATH → WR.
- **Ratings**: the 14 attributes go from 1.0 to 5.0. You can also give them on the 25–99 scale. You can give only some attributes, or only an overall `ovr` from 40 to 99, and the rest is generated around it. When `ovr` is given, the game shows that number.
- **yr** is FR/SO/JR/SR or 1–4. Add `"rs":true`, or write "RS SO", for a redshirt. `num`, `ht` (inches), `wt`, `home` and `espnId` are optional.
- Each team keeps its best 60 players. Every position gets its minimum first (QB 3, RB 4, WR 6, TE 3, OL 10, DL 8, LB 6, CB 5, S 4, K 2), then the remaining spots go to the best players left. Open spots are filled with walk-ons.
- **players** (custom players) are always added to the team named in `team` (an abbreviation or school name). If the roster is full, the weakest spare player at that position is dropped.
- Older packs in the `{"conferences":[…],"teams":[…]}` format are still accepted. Their teams are matched by order.

`custom-players-template.json` shows every player field. **Settings → Export my roster (JSON)** writes your team in this format.

## Rebuilding the 2026 pack

```
python3 -I tools/data/build_pack.py [outdir]     # default /home/claude/packs
```

The builder reads a local clone of `sportsdataverse/cfbfastR-data`: the 2026 rosters, 2025 and 2026 play-level player stats, ESPN team ids, colors and logo links, and the 2026 team info for stadiums. It writes the pack and the template. Ratings come from 2025 and 2026 production (usage, efficiency, TDs and INTs, sacks, PBUs, forced fumbles, FG%), class, size compared with the position norm, and program strength. Each team is then calibrated so its `teamOvr()` follows the generated league's curve for that program's strength. Linemen and punters have no box-score stats, so class, size and team decide their ratings. Output is deterministic.

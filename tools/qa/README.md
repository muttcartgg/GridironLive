# QA scripts (headless Chromium via Playwright)

Run from the repo root after `python3 tools/build_web.py`:

```
NODE_PATH=$(npm root -g) node tools/qa/smoke.js            # one full game, offense + defense, prints box score + errors
NODE_PATH=$(npm root -g) node tools/qa/season.js           # full season + offseason + start of next season
NODE_PATH=$(npm root -g) node tools/qa/shots.js web/index.html /tmp/gl-shots   # screenshots (landscape + portrait)
NODE_PATH=$(npm root -g) node tools/qa/slots.js web/index.html /tmp/gl-slots   # five save slots (create 4/5, reload, load, backup, code, delete) + player photos
<<<<<<< HEAD
NODE_PATH=$(npm root -g) node tools/qa/realseason.js [pack.json] [web/index.html] [TEAM]   # "Real 2026 · week N" dynasty: real records check, sims to the national title
=======
NODE_PATH=$(npm root -g) node tools/qa/camfit.js web/index.html /tmp/gl-camfit # device-fit camera: presnap / drop-back / run shots on SE, 14, 16, Pro Max sizes, both orientations
NODE_PATH=$(npm root -g) node tools/qa/native.js                               # emulated iOS shell: lazy save loading, Back up to Files / Restore from file, controller
>>>>>>> worktree-agent-ab1ee49abce67294b
```

Each takes an optional path to the built page (default `web/index.html`) and a team abbreviation (default UGA).
Exit code is 1 when a page error was thrown. Look at screenshots with an image viewer (or the Read tool).

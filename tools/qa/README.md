# QA scripts (headless Chromium via Playwright)

Run from the repo root after `python3 tools/build_web.py`:

```
NODE_PATH=$(npm root -g) node tools/qa/smoke.js            # one full game, offense + defense, prints box score + errors
NODE_PATH=$(npm root -g) node tools/qa/season.js           # full season + offseason + start of next season
NODE_PATH=$(npm root -g) node tools/qa/shots.js web/index.html /tmp/gl-shots   # screenshots (landscape + portrait)
```

Each takes an optional path to the built page (default `web/index.html`) and a team abbreviation (default UGA).
Exit code is 1 when a page error was thrown. Look at screenshots with an image viewer (or the Read tool).

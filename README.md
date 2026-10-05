# Gridiron Live

An original pixel-art college football game for iPhone. You get a 32-team league with conferences, rankings, a playoff and recruiting. On the field you throw with drag-to-aim passing, steer and juke on runs, and watch stamina drop as the game goes on. After each game there's a stats screen with a completion heatmap, yards after catch and QB rating.

All teams, names and art are original. Every school's name and colors can be edited in the game.

## Play it right now (no install)

Open `web/index.html` in Safari or any browser. In Safari on iPhone, tap Share, then **Add to Home Screen**, and it runs full-screen like an app.

## Build the .ipa (free, from your phone or a computer)

You can't build iPhone apps on Linux or Windows, so this project uses GitHub's free macOS build machines:

1. Create a free GitHub account if you don't have one, then create a new **private** repository.
2. Upload everything in this folder to the repository, keeping the folder structure. Make sure the `.github/workflows/build-ipa.yml` file is included.
3. Open the repository's **Actions** tab. The **Build IPA** workflow runs on every push, or you can start it with **Run workflow**. It takes about 5–10 minutes.
4. When it finishes, open the run and download **GridironLive-ipa** from the Artifacts section. It's a .zip, and the `GridironLive.ipa` is inside.
5. Install it with your sideloading tool, such as Sideloadly or AltStore. They sign the app with your Apple ID during install.

Notes:
- With a free Apple ID, sideloaded apps expire after 7 days. Re-install, or let AltStore refresh it, to keep playing. Your save is kept as long as you don't delete the app.
- macOS build minutes on GitHub are limited on private repositories, but one build uses only a few.

## Making changes

Edit `src/index.html`, then run:

```
python3 tools/build_web.py
```

That rebuilds `web/index.html`, the file the app ships. Push it, and GitHub builds a new .ipa.

See `docs/ARCHITECTURE.md` for how everything fits together.

## Controls

| Action | How |
|---|---|
| Call a play | Tap **Pass** or **Run** (on 4th down, also **Punt** or **Field goal**) |
| Throw | Drag backward from anywhere, then release. The ball goes where the reticle is. |
| Scramble | Quick tap before throwing |
| Steer the ball carrier | Hold your finger above or below them |
| Juke | Quick tap while running |
| Kick | Tap when the needle is in the green |
| Pause / sim to final | Pause button, top-left |

## Credits

The Silkscreen font is by Jason Kottke and is licensed under the SIL Open Font License (see `tools/fonts/OFL-LICENSE.txt`).

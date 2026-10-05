# CPBL Baseball Manager

HTML, CSS and JavaScript baseball game with a Three.js stadium and touch controls.

## Data and music

- Daily roster snapshot: CPBL official player directory. The scheduled workflow runs at 04:17 Asia/Taipei.
- Throwing and batting hands: 502 official player profiles at the time of this update. `data/player-traits.json` retains player identifiers and factual attributes.
- Pitch repertoires: Taiwan Baseball Wiki descriptive profiles. 173 pitchers have documented repertoires; other pitchers use explicitly generic fastball/breaking-ball game settings. These descriptions are not live pitch tracking or a guarantee of a current repertoire.
- Cheer arrangements: 153 public downloadable 2020 MIDI arrangements by Toshihiko Hayashi, from https://drive.google.com/drive/folders/1joT1RlpZJ3fUD3UbN-nUP7FCi2BK51oE . The game synthesizes instrumental audio from the downloaded note data. These are not recordings of current stadium vocals. Details are in `data/cheer-sources.json`. Hawks audio uses the existing team-hosted MP3 catalog.

## Regression checks

Run `node scripts/check_physics.cjs` for 13 pitch types, both throwing hands, and 20,000 batted-ball plays. Run `node scripts/check_long_games.cjs` for 24 complete games using the actual game state and Three.js scene transforms. The latter mocks the WebGL renderer and does not substitute for device/GPU testing.

WebGL errors pause the scene and context recovery keeps the 3D renderer. Devices that cannot initialize WebGL still use the 2D fallback. Stadium figures and uniforms are procedural illustrations.

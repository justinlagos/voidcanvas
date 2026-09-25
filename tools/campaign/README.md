# Campaign production scripts

Everything for the "Make Something" statics and videos, so they can be re-rendered when the UI changes.

- `capture.mjs`: product screenshots and effect renders from a local production build (`npm run build && npx next start -p 3123`).
- `statics.mjs`: the 24 statics (plus the mobile bonus) as 1080x1350 PNG, from HTML, with the captures and the campaign photos.
- `footage.mjs`: screen recordings of each campaign flow (Playwright, 1080x1350, drawn cursor and click rings).
- `edit.mjs`: cuts each video with ffmpeg: title cards from HTML, condensed footage, ASS captions, voice lines and music.

Paths point at `/home/claude/statics` and `/home/claude/video` from the session that made them; change the constants at the top of each file. Run them from the repo root with `playwright` installed (`node tools/campaign/<file>`).

Photos in `public/starters` were generated for the campaign and are the shipped starter images for the challenges.

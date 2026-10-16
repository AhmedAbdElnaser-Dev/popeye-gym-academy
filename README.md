# Popeye Academy

A single offline web page from Popeye Gym for one learner: short gym lessons in plain Egyptian Arabic
(muscles, equipment, exercises, how to train right), and after every lesson a typing drill and a
spelling drill built from the same words — so the gym vocabulary and the Arabic spelling stick together.

**Live:** https://ahmedabdelnaser-dev.github.io/popeye-gym-academy/ (GitHub Pages, served from `docs/`).
After the first visit it works with no internet and can be installed to the home screen.

## What the learner gets

- **5 units, 39 lessons**, 3–8 minutes each: الكتابة (built on his own practice sheet) · عضلاتك · الأجهزة والأدوات · التمارين الأساسية · الأداء الصح.
- Every lesson: **اقرأ** (photos that animate between start/end position, a body map that lights the muscle) → **اختبر نفسك** (3 questions with the reason) → **اكتب** (copy the text; each letter turns green or red, the on-screen Arabic keyboard shows the next key, strict mode makes him fix a wrong letter before moving on) → **إملاء** (pick the missing letter, then the word hides and he types it from memory).
- **Progress on the device** (`localStorage`): stars per lesson, XP and levels (مبتدئ → أسد), streak, best speed/accuracy, the letters he confuses most (ة/ه، ى/ي، أ/إ…), and a "واقف عند" card on the home page.
- **No touch-typing.** He types with whatever fingers he likes and may look at the keyboard; the curriculum is about volume: a 1000-letter daily target on the home page, and free practice that chains straight into the next text.
- **نزّل نسختك**: downloads the whole site as one HTML file with his progress embedded; opening that file anywhere restores it. Settings also import progress from such a file.

## Develop

```
python -m venv .venv
.venv/Scripts/python -m pip install playwright fonttools brotli pillow pymupdf
.venv/Scripts/python tools/fetch_images.py   # once: pulls the curated exercise photos (public domain) into assets/exercises/
node tools/check_content.mjs                 # validates content/unit*.js (ids, typing charset, quiz/spelling shapes)
.venv/Scripts/python build.py                # -> dist/Popeye_Academy.html + docs/ (page, sw.js, manifest, icons)
.venv/Scripts/python tools/e2e.py            # full flow in Edge: lesson, strict typing, spelling, export/restore, reset, mobile
.venv/Scripts/python tools/offline_check.py  # serves docs/: service worker, offline reload, manifest, icons
```

- `content/` — one file per unit (`CONTENT_UNITS.push({...})`); `content/STYLE.md` is the writing contract (voice, schema, rules).
- `src/` in load order: `ui.js` → `keyboard-layout.js` (Arabic 101 layout) → `progress.js` → `typing.js` → `quiz.js` → `spelling.js` → `bodymap.js` → `views.js` → `app.js`; `app.css`; `index.html` (template); `sw.js`; `manifest.webmanifest`.
- `build.py` inlines fonts (subset), the banner, all exercise photos (WebP data URIs) and the content into one file, validates the content, and stamps the service-worker version from the page hash.
- The downloadable copy works because the page captures its own pristine HTML at boot and rewrites the `progress-seed` script when exporting.

## Sources

- Exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) — The Unlicense (public domain).
- Fonts: Cairo, Lalezar — SIL Open Font License.
- Gym content is general beginner guidance written for this learner; it is not medical advice.

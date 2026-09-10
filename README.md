# KeyFlow • Premium Gamified 10-Finger Touch Typing Tutor (v3.8.1)

KeyFlow is a production-quality, standalone web application that teaches users proper **10-finger touch typing**, builds muscle memory progressively, and rewards consistency through engaging gamification without becoming distracting.

---

## 🌟 Complete Feature Suite

### 1. 🎧 6 Procedural Mechanical Switch Sound Profiles
- **IBM Model M (Buckling Spring)**: Authentic 1984 metallic buckling spring snap, coil twang, and acoustic barrel clack.
- **Cherry MX Blue**: Crisp, high-frequency tactile clicks.
- **Gateron Brown**: Warm, subtle tactile bumps.
- **Holy Panda / Topre**: Heavy, resonant low-frequency *"thock"*.
- **Vintage Typewriter**: Metallic striker pings + carriage bell ding on lines/words.
- **Bubble Wrap Pop**: Playful, springy pitch-chirp pop.
- **Cadence Metronome**: Adjustable audio tempo (50 to 220 BPM) to train even, rhythmic keystrokes.

### 2. 🎨 5 Keycap Aesthetic Themes (Two-Tone Artisan Mechanical Systems)
- **Simple Default (Clean & Minimal / Không hoa hòe)**: Distraction-free, clean dark aesthetic with high contrast, standard mechanical keycaps, and zero visual clutter.
- **Retro 1984**: Vintage IBM Model M two-tone beige & industrial pebble grey keycaps, amber phosphor CRT display with scanlines, and warm amber LED indicators.
- **Cyberpunk Neon**: Night City synthwave with deep obsidian-plum keycaps, electric cyan & hot magenta legends, laser underglow, and Cyber HUD terminal.
- **Botanical Forest**: Nordic moss & alpine spruce with soft birch ivory alphas, deep forest moss modifiers, and calming sage emerald accents.
- **Tokyo Night / Dracula**: Neo-Shibuya twilight with deep midnight indigo alphas, twilight purple modifiers, pastel cyan & lavender legends, and Shibuya rain glass.

### 3. 📂 Custom Practice & Developer Code Studio (Custom Arena)
- **Paste Custom Text**: Paste articles, book excerpts, poetry, or lyrics with automatic sentence chunking.
- **Developer Code Studio**: Dedicated syntax practice for **JavaScript ES6+**, **Python Data Structures**, **React Hooks**, **Rust Pattern Matching**, and **SQL Aggregations**.
- **Timed Speed Sprints**: 15s Lightning, 30s Power, 60s Standard, and 120s Endurance sprint trials.

### 4. 👻 Ghost Racer & AI Bot Competitors
- **Race Your Personal Best**: Translucent ghost marker matches your historical pace on that lesson.
- **AI Bot Pacemakers**:
  - 🐢 **Turtle Bot** (30 WPM)
  - 🦊 **Fox Bot** (50 WPM)
  - 🦅 **Falcon Bot** (80 WPM)
  - ⚡ **Cyber Bot** (110 WPM)
- Live head-to-head racing lane with real-time lead/lag delta indicator (`+12% Ahead`).

### 5. ⌨️ Multi-Layout Support
- **QWERTY** (Standard US)
- **Colemak** (Ergonomic modern standard)
- **Dvorak** (Vowel home-row cluster)
- **Workman** (Minimal finger strain)
- Automatically adapts keycap legends, key-to-finger maps, and live hand guide highlights.

### 6. 🥷 Hardcore & Blind Training Modes
- **Blind Typing Mode**: Hides on-screen character preview and keycap legends, forcing 100% reliance on pure tactile feel.
- **Sudden Death Mode**: A single mistake instantly resets the current round.

### 7. 📱 100% Offline PWA & Data Portability
- **Installable PWA**: Includes `manifest.json` and `sw.js` for desktop app installation.
- **JSON Backup & Restore**: One-click download of your complete progress (`keyflow-backup-YYYY-MM-DD.json`) and instant restoration on any device.

### 8. 📚 30-Lesson Progressive Curriculum (6 Mastery Levels)
- Home Row Anchors (`F/J`, `D/K`, `S/L`, `A/;`, then `G/H`) $\rightarrow$ Top Row Reaches $\rightarrow$ Bottom Row Dives $\rightarrow$ Opposite-hand Shift rules & Punctuation $\rightarrow$ Number Row & Symbols $\rightarrow$ Code & Prose Fluency.

- Each lesson uses only characters introduced in that lesson or earlier, with explicit G/H and T/Y reach drills and separate Shift practice.
- Technique cues and round prompts sit above the typing text. Beginner speed gates prioritize control, and estimated times reflect text length at the target pace.
- Later lessons use longer workplace, code, endurance, and mixed review passages. Existing lesson IDs and saved achievements remain compatible.
- The course follows QWERTY teaching order; alternate-layout guides remain available. Finger-conditioning drills select keys from the active layout.

### 9. 📚 Lessons Home
- Lessons and progress come first, with stage, search, and progress filters to find available lessons, review attempts, or mastered skills.
- Cards show unlock requirements; the current-lesson shortcut clears conflicting filters and focuses the next lesson.
- Optional goals, coaching, and practice modes live under **More practice & activity**.

### 10. 🎯 Adaptive Focus Coaching
- The Curriculum dashboard recommends the most valuable next action from real practice data: a weak-key drill, weak-finger conditioning session, or the next curriculum lesson.
- Recommendations include the reason, measurable targets, and a one-click launch so every session starts with a clear purpose.

### 11. 📈 Interactive Lesson Results
- Inspect your complete run with a WPM curve, raw pace, and red mistype markers grouped by second.
- Hover, touch, or use the arrow keys to see speed and the typed/expected keys behind each error. Toggle raw pace and mistypes in the legend.
- Pauses are excluded from the timeline; corrected errors remain visible. Older runs without timing data are handled without inventing markers.

### 12. 🕹️ Eight-Game Arcade
- **Word Garden**: Grow twelve flowers through relaxed, untimed typing. Flawless words collect sunshine and combo bonuses.
- **Skyline Stack**: Build fifteen floors before your stability runs out. Mistakes weaken the tower; flawless words repair it.
- **Word Recall**: Memorize ten words, then type them after a timed preview. Optional hints exchange the word bonus for another look.
- Also includes **Typing Quest**, **Type Invaders**, **Nitro Sprint**, **Matrix Rain**, and **KeyBeats**.
- The three new games offer Easy, Medium, and Hard word banks, saved personal bests, XP rewards, and replay. Press Escape to pause; switching away pauses automatically. Unfinished rounds do not award XP.

---

## 🚀 Running KeyFlow Locally

KeyFlow is pure vanilla web standards with **zero build step** and **zero external dependencies**:

```bash
cd "/Volumes/External Mini M4/Development/touch-typing-tutor"
python3 -m http.server 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in any modern browser.

Run all JavaScript checks with `node --test tests/*.test.mjs`.

Open `tests/lesson-chart.html` for an interactive results preview and browser checks for the chart, tooltips, legend controls, keyboard navigation, and older/short runs. Add `?theme=retro`, `botanical`, `tokyo`, or `cyberpunk` to check a theme. Fixtures use an in-memory store and leave saved progress unchanged.

Run curriculum content and targeted-drill checks with `node --test tests/curriculum.test.mjs`.

Open `tests/speed-test.html` on the local server for browser regression checks covering Speed Test selection, records, theme switching, and text stability on first input, errors, pause/resume, restart, line wrapping, and Enter. These checks exercise all five themes and both distraction-free layouts with an in-memory store; saved progress is not modified.

Run the arcade rules and persistence checks with `node --test tests/arcade-challenges.test.mjs` (Node 22+). Open `tests/arcade-challenges.html` on the local server for browser lifecycle checks; these use an isolated store and do not change saved progress.

Open `tests/dashboard.html` on the local server for 12 browser regression checks covering lesson filters, new and returning learners, locking, and keyboard activation. The checks use in-memory fixtures and do not change saved progress.

---

## 🛠️ Developer Console Helpers

Open DevTools Console (`F12` or `Cmd+Option+I`):
- `window.seedTypingTutorDemo()`: Instantly populates realistic progress (Level 12, unlocked lessons, streak, achievements, weak key data).
- `window.resetTypingTutor()`: Wipes local state and restarts onboarding.

## Workspace design system

See [the design system and screen audit](docs/design-system.md) for shared tokens, responsive behavior, theme rules, and practice return routing. Open `tests/components-preview.html` for the component gallery and `tests/workspace.html` for all-screen browser checks. The workspace fixture keeps practice data in memory and leaves saved progress unchanged.

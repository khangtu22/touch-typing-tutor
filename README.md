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
- **Dark Flow (Default)**: Flagship Pro Studio with two-tone carbon slate & obsidian keycaps, ice white & royal indigo legends, and emerald teal telemetry.
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
- Home Row Anchors (`F/J`, `D/K`, `S/L`, `A/;`) $\rightarrow$ Top Row Reaches $\rightarrow$ Bottom Row Dives $\rightarrow$ Opposite-hand Shift rules & Punctuation $\rightarrow$ Number Row & Symbols $\rightarrow$ Code & Prose Fluency.

### 9. 🎯 Adaptive Focus Coaching
- The Curriculum dashboard recommends the most valuable next action from real practice data: a weak-key drill, weak-finger conditioning session, or the next curriculum lesson.
- Recommendations include the reason, measurable targets, and a one-click launch so every session starts with a clear purpose.

---

## 🚀 Running KeyFlow Locally

KeyFlow is pure vanilla web standards with **zero build step** and **zero external dependencies**:

```bash
cd "/Volumes/External Mini M4/Development/touch-typing-tutor"
python3 -m http.server 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in any modern browser.

---

## 🛠️ Developer Console Helpers

Open DevTools Console (`F12` or `Cmd+Option+I`):
- `window.seedTypingTutorDemo()`: Instantly populates realistic progress (Level 12, unlocked lessons, streak, achievements, weak key data).
- `window.resetTypingTutor()`: Wipes local state and restarts onboarding.

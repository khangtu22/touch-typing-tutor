# KeyFlow workspace design system

The application uses one page and control system across Lessons, Code Arena, Speed Test, Arcade, Custom, Quotes, Analytics, Settings, and Results. Theme colors and keyboard artwork provide personality; navigation, typography, spacing, controls, and responsive behavior remain consistent.

## Source of truth

- `styles/main.css`: semantic tokens, typography, spacing, shell, accessibility preferences.
- `styles/themes.css`: the five built-in palettes and their keyboard artwork.
- `styles/components.css`: shared components and their states.
- `styles/workspace.css`: final shared screen composition and responsive rules.
- `js/workspace.js`: presentation accessibility and return-context helpers.
- `tests/components-preview.html`: interactive component gallery.

Load workspace styles after screen styles. New controls should use these tokens and shared classes instead of inline colors or new spacing values.

| Area | Convention |
| --- | --- |
| Surfaces | `--bg-base`, `--surface-1`, `--surface-2`, `--surface-3` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted` |
| Accent | `--accent-primary`, `--accent-surface`, `--accent-border` |
| Actions | Separate `--btn-primary-bg`, `--btn-primary-fg`, hover and active tokens |
| Status | `--success-teal`, `--reward-amber`, `--error-coral`; retain text/icon cues |
| Borders | 1px shared borders; `--border-control` for form boundaries |
| Focus | 2px visible outline using `--focus-ring-color`, offset from the control |
| Spacing | 4, 8, 12, 16, 24, 32, 48, 64px (`--space-1` through `--space-8`) |
| Radius | Controls 8px; cards 16px; dialogs 24px; pills only for badges |
| Type | Inter body 16px; controls 14px; captions 12px; headings 20px; page titles 32px / 28px mobile |
| Monospace | JetBrains Mono for typed text, code, and numeric telemetry |
| Touch targets | Shared buttons, toggles, tabs, and utility actions use at least 44px targets |
| Content width | 1200px shell, 24px desktop gutters, 16px mobile gutters |

Primary button foregrounds are independent of accent colors. Bright themes use dark text; the default purple action uses white. Custom themes calculate black or white button text from relative luminance. Custom variables are applied to the body so built-in body palettes cannot override them. High Contrast overrides both built-in and custom palettes. User-selected custom text/background colors remain editable; their arbitrary combinations are not guaranteed to meet contrast requirements.

## Screen audit and resulting behavior

| Screen / component | Findings and changes |
| --- | --- |
| Global header | One navigation registry, visible active marker plus `aria-current`, responsive rows and a compact mobile drawer. Drawer traps focus, makes its background inert, closes with Escape, and returns focus. |
| Lessons | Learning path precedes optional widgets. Page title, launch action, filters, summaries, and cards follow the common shell. Existing locking and keyboard launch behavior remain intact. |
| Code Arena | Unified code catalog includes the former Custom presets with stable IDs and scoring targets. Corrected search arguments that incorrectly filtered out the catalog. Presets retain chunked rounds. |
| Speed Test | Benchmark and Passage Sprint tabs share the workspace. Sprint records remain separate from vocabulary benchmark records. Mode, preset, and vocabulary selection survive return navigation. |
| Arcade | Compact heading and recommendation, followed by consistent game cards. Personal bests sit with their games. Game art and play mechanics retain their own styles. |
| Custom | Text editor and six-language practice remain here. Draft text survives navigation; tabs and language choices support keyboard use. |
| Quotes | Common heading, controls, cards, and responsive filters. Editorial quote typography remains distinctive. Custom passage dialog supports keyboard dismissal and focus return. |
| Analytics | Overview, History, and Achievements separate the content. Fixed the hidden History card. Period, grouping, search, activity filter, sorting, and pagination live in view state. Empty history no longer claims perfect accuracy. Table controls have labels and keyboard-operable sort buttons. |
| Settings | Desktop category sidebar, mobile accordions with every category heading reachable. Form fields have associated labels and descriptions. File import actions are keyboard-operable buttons. |
| Results | Common card and action system. Back, retry, and follow-on practice retain the launch destination. Certificate and pause dialogs have named controls and initial focus. |
| Themes | Preserve default purple, Retro orange, Cyberpunk cyan, Botanical green, and Tokyo lavender, including keyboard artwork. All share the same structure and control states. |

## Practice return contract

At launch, capture the source destination, its filters and draft state, scroll position, and a stable identity for the launch control. Lesson, pause, Results, retry, and follow-on drills keep that origin. Returning restores the captured state and focuses the original control. If it no longer exists, focus the page heading. Legacy or programmatic launches fall back to the lesson's activity type.

This context is session-only. It does not change stored progress, scoring, historical lesson IDs, or backup format.

## Responsive and accessibility behavior

Navigation uses one row at 1280px and above, two rows on tablets, and a compact drawer below 768px. Catalogs collapse from three to two to one column. Settings changes to accordions below 768px. Tables scroll within their own region instead of widening the page. Modal content scrolls within the viewport. Reduced Motion and High Contrast remain available.

Native controls are preferred. Tab groups support arrow keys, Home, and End. Focus stays visible, inactive screens are hidden, and icon actions have accessible names. Typing controls retain their existing input behavior, including restart, pause, and first-keystroke stability.

## Verification

Run `node --test tests/*.test.mjs`. Serve the repository with a static HTTP server and open:

- `tests/workspace.html`: all destinations and five themes; page headings, overflow, primary contrast in default/hover/active states, form labels, retained drafts and filters, Code Arena return/retry/pause routing, custom theme precedence, and mobile drawer behavior. Uses in-memory progress.
- `tests/speed-test.html`: typing geometry and benchmark behavior across themes.
- `tests/lesson-chart.html`: Results, chart controls, keyboard interaction, and legacy sessions.
- `tests/dashboard.html`: lesson browsing, locking, filters, and launch keys.
- `tests/arcade-challenges.html`: game lifecycle, focus, pause, results, and persistence.
- `tests/hand-guide.html`: hand positioning, four layouts, reduced motion, resizing, and WebGL recovery.

Visual review covers desktop, tablet, and phone layouts. Browser assertions supplement visual review; they are not a full screen-reader or cross-browser accessibility certification. The service-worker cache includes the workspace CSS and module, with an updated cache name for existing installs.

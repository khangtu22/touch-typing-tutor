/**
 * Goals, Smart Reminders & Ergonomic Wellness Manager
 *
 * Provides:
 *  - Daily / weekly goal tracking with three SVG progress rings
 *  - Break-time and 20-20-20 eye-care overlay reminders
 *  - Browser Notification-based daily practice nudges
 */

import { store } from './state.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default goal configuration merged into state.settings.goals */
export const DEFAULT_GOALS = {
  dailyMinutes: 15,           // daily practice time goal in minutes
  dailyWpm: 50,               // daily WPM goal
  weeklyLessons: 5,           // weekly lesson completion goal
  enabled: false,             // goals feature enabled
  notificationsEnabled: false,
  notificationHour: 20        // 8 PM reminder
};

/** Default wellness / ergonomics configuration merged into state.settings.wellness */
export const DEFAULT_WELLNESS = {
  breakInterval: 30,          // minutes between break reminders
  breakEnabled: false,
  eyeCareEnabled: false,      // 20-20-20 rule reminders
  focusModeShortcut: true     // enable 'F' shortcut for focus mode
};

// Design-token colours that match the app's CSS variables
const RING_COLORS = {
  indigo: '#6366f1',  // daily minutes ring
  teal:   '#2dd4bf',  // daily WPM ring   (--success-teal equivalent)
  amber:  '#f59e0b'   // weekly lessons ring
};

// Auto-dismiss overlay after this many milliseconds
const OVERLAY_AUTO_DISMISS_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns an ISO date string (YYYY-MM-DD) for a given Date object.
 * @param {Date} d
 * @returns {string}
 */
function isoDate(d) {
  return d.toISOString().split('T')[0];
}

/**
 * Returns the ISO date string for today.
 * @returns {string}
 */
function today() {
  return isoDate(new Date());
}

/**
 * Returns the ISO date string for the most recent Sunday (start of the
 * week in a Sunday-Saturday calendar).
 * @returns {string}
 */
function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay()); // rewind to Sunday
  return isoDate(d);
}

/**
 * Clamps a number between 0 and 1, then multiplies by 100.
 * @param {number} current
 * @param {number} target
 * @returns {number} percentage 0-100
 */
function toPct(current, target) {
  if (!target || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

// ---------------------------------------------------------------------------
// GoalsManager class
// ---------------------------------------------------------------------------

class GoalsManager {
  constructor() {
    /** @type {number|null} setInterval handle for break checking */
    this.breakTimerInterval = null;

    /** @type {number} timestamp (ms) when the last break was shown / dismissed */
    this.lastBreakTime = Date.now();

    /** @type {number|null} setTimeout handle for the daily notification */
    this._notifTimeout = null;
  }

  // -------------------------------------------------------------------------
  // Goal progress computation
  // -------------------------------------------------------------------------

  /**
   * Computes today's and this-week's progress against the configured goals.
   *
   * @param {object} state - The full app state from store.getState()
   * @returns {{
   *   todayMinutes: number,
   *   todayBestWpm: number,
   *   weekLessons: number,
   *   goals: object,
   *   ringData: Array<{label:string, current:number, target:number, pct:number, color:string}>
   * }}
   */
  getGoalProgress(state) {
    const goals    = { ...DEFAULT_GOALS,   ...(state.settings?.goals    || {}) };
    const sessions = state.sessions || [];
    const todayStr = today();
    const weekStr  = startOfWeek();

    // -- Today's stats ------------------------------------------------------
    // Match sessions by the .date field (YYYY-MM-DD) recorded by store.recordSession,
    // or fall back to the ISO prefix of .recordedAt for legacy entries.
    const todaySessions = sessions.filter(s =>
      s.date === todayStr || (s.recordedAt && s.recordedAt.startsWith(todayStr))
    );

    const todayMinutes = todaySessions.reduce(
      (sum, s) => sum + ((s.durationSec || 0) / 60),
      0
    );

    const todayBestWpm = todaySessions.reduce(
      (best, s) => Math.max(best, s.wpm || 0),
      0
    );

    // -- This week's curriculum lesson completions --------------------------
    // A session counts when it belongs to a curriculum lesson (integer lessonId
    // 1-30) and was recorded on or after the most recent Sunday.
    const weekLessons = sessions.filter(s => {
      const sessionDate = s.date || (s.recordedAt && s.recordedAt.split('T')[0]);
      const isCurriculum = Number.isInteger(s.lessonId) && s.lessonId >= 1 && s.lessonId <= 30;
      return isCurriculum && sessionDate >= weekStr;
    }).length;

    // -- Build ring data ----------------------------------------------------
    const ringData = [
      {
        label:   'Daily Time',
        current: Math.round(todayMinutes * 10) / 10, // 1-decimal minutes
        target:  goals.dailyMinutes,
        pct:     toPct(todayMinutes, goals.dailyMinutes),
        color:   RING_COLORS.indigo
      },
      {
        label:   'Daily WPM',
        current: todayBestWpm,
        target:  goals.dailyWpm,
        pct:     toPct(todayBestWpm, goals.dailyWpm),
        color:   RING_COLORS.teal
      },
      {
        label:   'Weekly Lessons',
        current: weekLessons,
        target:  goals.weeklyLessons,
        pct:     toPct(weekLessons, goals.weeklyLessons),
        color:   RING_COLORS.amber
      }
    ];

    return { todayMinutes, todayBestWpm, weekLessons, goals, ringData };
  }

  // -------------------------------------------------------------------------
  // Break timer
  // -------------------------------------------------------------------------

  /**
   * Starts the background interval that polls whether a break or eye-care
   * reminder is due.  Safe to call multiple times — will not double-start.
   */
  startBreakTimer() {
    if (this.breakTimerInterval !== null) return; // already running

    // Check every 60 seconds to keep overhead negligible.
    this.breakTimerInterval = setInterval(() => this.checkBreak(), 60_000);
    this.lastBreakTime = Date.now();
    console.log('[GoalsManager] Break timer started.');
  }

  /**
   * Stops the break-polling interval.
   */
  stopBreakTimer() {
    if (this.breakTimerInterval !== null) {
      clearInterval(this.breakTimerInterval);
      this.breakTimerInterval = null;
      console.log('[GoalsManager] Break timer stopped.');
    }
  }

  /**
   * Called every minute by the break timer.  Shows a break or eye-care
   * overlay if the configured interval has elapsed since the last one.
   */
  checkBreak() {
    const state    = store.getState();
    const wellness = { ...DEFAULT_WELLNESS, ...(state.settings?.wellness || {}) };

    if (!wellness.breakEnabled && !wellness.eyeCareEnabled) return;

    const elapsedMin = (Date.now() - this.lastBreakTime) / 60_000;

    if (elapsedMin >= wellness.breakInterval) {
      // Alternate between stretch break and eye care if both are on.
      const type = wellness.eyeCareEnabled ? 'eyecare' : 'break';
      this.showBreakOverlay(type);
      this.lastBreakTime = Date.now();
    }
  }

  // -------------------------------------------------------------------------
  // Break overlay
  // -------------------------------------------------------------------------

  /**
   * Creates and injects a full-screen wellness overlay into the document body.
   *
   * @param {'break'|'eyecare'} type - The type of reminder to show.
   */
  showBreakOverlay(type) {
    // Only one overlay at a time.
    if (document.getElementById('break-overlay')) return;

    const isEyeCare = type === 'eyecare';

    // -- Countdown state ----------------------------------------------------
    const COUNTDOWN_SEC = 20;
    let remaining = COUNTDOWN_SEC;
    let countdownInterval = null;

    // -- Build DOM ----------------------------------------------------------
    const overlay = document.createElement('div');
    overlay.id = 'break-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', isEyeCare ? 'Eye care reminder' : 'Break reminder');

    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9999',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:rgba(10,10,20,0.88)',
      'backdrop-filter:blur(12px)',
      '-webkit-backdrop-filter:blur(12px)',
      'animation:breakOverlayFadeIn 0.35s ease'
    ].join(';');

    // Inject keyframe styles once per page lifetime
    if (!document.getElementById('break-overlay-styles')) {
      const styleEl = document.createElement('style');
      styleEl.id = 'break-overlay-styles';
      styleEl.textContent = `
        @keyframes breakOverlayFadeIn {
          from { opacity:0; transform:scale(0.96); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes breakOverlayFadeOut {
          from { opacity:1; transform:scale(1); }
          to   { opacity:0; transform:scale(0.96); }
        }
        @keyframes stretchBob {
          0%,100% { transform:translateY(0); }
          50%     { transform:translateY(-8px); }
        }
        @keyframes eyeBlink {
          0%,90%,100% { transform:scaleY(1); }
          95%          { transform:scaleY(0.05); }
        }
        #break-overlay-card {
          background:var(--surface-1,#1e1e2e);
          border:1px solid var(--surface-3,#313244);
          border-radius:20px;
          padding:2.5rem 3rem;
          text-align:center;
          max-width:440px;
          width:90%;
          box-shadow:0 24px 64px rgba(0,0,0,0.6);
          color:var(--text-primary,#cdd6f4);
          font-family:inherit;
        }
        #break-overlay-card h2 {
          font-size:1.6rem;
          font-weight:700;
          margin:0 0 0.5rem;
        }
        #break-overlay-card p {
          font-size:0.95rem;
          opacity:0.75;
          margin:0 0 1.5rem;
          line-height:1.5;
        }
        .break-emoji-wrap {
          font-size:4rem;
          margin:0.5rem 0 1.25rem;
          display:block;
          line-height:1;
        }
        .break-emoji-stretch { animation:stretchBob 1.6s ease-in-out infinite; display:inline-block; }
        .break-emoji-eye     { animation:eyeBlink 3s ease-in-out infinite; display:inline-block; }
        #break-countdown {
          font-size:2.4rem;
          font-weight:800;
          color:var(--accent-primary,#cba6f7);
          margin-bottom:1.5rem;
          letter-spacing:0.02em;
        }
        #break-dismiss-btn {
          background:var(--accent-primary,#cba6f7);
          color:#11111b;
          border:none;
          border-radius:10px;
          padding:0.65rem 2rem;
          font-size:0.95rem;
          font-weight:700;
          cursor:pointer;
          transition:opacity 0.15s, transform 0.15s;
        }
        #break-dismiss-btn:hover { opacity:0.88; transform:translateY(-1px); }
        #break-progress-bar-wrap {
          background:var(--surface-2,#313244);
          border-radius:999px;
          height:6px;
          margin-bottom:1.25rem;
          overflow:hidden;
        }
        #break-progress-bar {
          height:100%;
          border-radius:999px;
          width:100%;
          background:var(--accent-primary,#cba6f7);
          transition:width 1s linear;
        }
      `;
      document.head.appendChild(styleEl);
    }

    // -- Card content -------------------------------------------------------
    const card = document.createElement('div');
    card.id = 'break-overlay-card';

    if (isEyeCare) {
      card.innerHTML = `
        <h2>👁️ 20-20-20 Eye Care</h2>
        <p>Look at something <strong>20 feet away</strong> for the next <strong>20 seconds</strong> to reduce eye strain.</p>
        <span class="break-emoji-wrap"><span class="break-emoji-eye">👁️</span></span>
        <div id="break-countdown">20</div>
        <div id="break-progress-bar-wrap"><div id="break-progress-bar"></div></div>
        <button id="break-dismiss-btn">Done ✓</button>
      `;
    } else {
      card.innerHTML = `
        <h2>🧘 Time for a Short Break!</h2>
        <p>Stand up, stretch your fingers and roll your shoulders. Your posture will thank you!</p>
        <span class="break-emoji-wrap"><span class="break-emoji-stretch">🙆</span></span>
        <div id="break-countdown">20</div>
        <div id="break-progress-bar-wrap"><div id="break-progress-bar"></div></div>
        <button id="break-dismiss-btn">Skip →</button>
      `;
    }

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // -- Dismiss helper -----------------------------------------------------
    const dismiss = () => {
      clearInterval(countdownInterval);
      clearTimeout(autoDismissTimeout);
      overlay.style.animation = 'breakOverlayFadeOut 0.3s ease forwards';
      setTimeout(() => overlay.remove(), 320);
    };

    // -- Countdown ticker ---------------------------------------------------
    const countdownEl   = card.querySelector('#break-countdown');
    const progressBarEl = card.querySelector('#break-progress-bar');

    // Trigger the CSS transition on the next two frames so the browser paints
    // the initial 100%-width state first, then animates to 0%.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (progressBarEl) progressBarEl.style.width = '0%';
      });
    });

    countdownInterval = setInterval(() => {
      remaining -= 1;
      if (countdownEl) countdownEl.textContent = String(remaining);
      if (remaining <= 0) dismiss();
    }, 1_000);

    // Auto-dismiss safety net (catches edge cases where countdown drifts)
    const autoDismissTimeout = setTimeout(dismiss, OVERLAY_AUTO_DISMISS_MS);

    // Button handler
    const btn = card.querySelector('#break-dismiss-btn');
    if (btn) btn.addEventListener('click', dismiss);

    // ESC key to dismiss
    const onKey = (e) => {
      if (e.key === 'Escape') {
        dismiss();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
  }

  // -------------------------------------------------------------------------
  // Browser Notifications
  // -------------------------------------------------------------------------

  /**
   * Requests the browser Notification permission from the user.
   * @returns {Promise<string>} The resulting permission string.
   */
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.warn('[GoalsManager] Browser Notifications not supported.');
      return 'denied';
    }
    const permission = await Notification.requestPermission();
    console.log('[GoalsManager] Notification permission:', permission);
    return permission;
  }

  /**
   * Schedules a one-shot notification for the specified hour (today or
   * tomorrow) that fires only if the daily goal has not yet been met.
   * Automatically reschedules itself for the following day after firing.
   *
   * @param {number} hour - Hour of day in 24-hour format (0-23).
   */
  scheduleNotification(hour) {
    if (this._notifTimeout !== null) {
      clearTimeout(this._notifTimeout);
      this._notifTimeout = null;
    }

    const now    = new Date();
    const target = new Date();
    target.setHours(hour, 0, 0, 0);

    // If the target time has already passed today, schedule for tomorrow.
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const delayMs = target.getTime() - now.getTime();
    console.log(
      `[GoalsManager] Notification scheduled in ${Math.round(delayMs / 60_000)} min ` +
      `(at ${target.toLocaleTimeString()}).`
    );

    this._notifTimeout = setTimeout(() => {
      this._notifTimeout = null;
      const state    = store.getState();
      const progress = this.getGoalProgress(state);

      // Only nudge if the daily time goal is not yet met.
      if (progress.todayMinutes < progress.goals.dailyMinutes) {
        this.sendGoalReminder(progress);
      }

      // Reschedule for the same hour tomorrow.
      this.scheduleNotification(hour);
    }, delayMs);
  }

  /**
   * Fires a browser Notification reminding the user to practise.
   *
   * @param {{ todayMinutes:number, goals:object }} [progress] - Optional
   *   progress snapshot used to build a personalised message body.
   */
  sendGoalReminder(progress) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const todayMin  = progress?.todayMinutes ?? 0;
    const goalMin   = progress?.goals?.dailyMinutes ?? DEFAULT_GOALS.dailyMinutes;
    const remaining = Math.max(0, Math.round(goalMin - todayMin));

    const body = remaining > 0
      ? `You still need ${remaining} min of practice today. Keep up the streak! 🔥`
      : 'You\'ve hit your daily goal — amazing work! 🎉';

    try {
      const notif = new Notification('KeyFlow Practice Reminder', {
        body,
        icon:   '/favicon.ico',
        badge:  '/favicon.ico',
        tag:    'keyflow-daily-reminder', // replaces any prior notification
        silent: false
      });

      // Auto-close after 8 seconds.
      setTimeout(() => notif.close(), 8_000);
    } catch (err) {
      console.warn('[GoalsManager] Failed to create Notification:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

/** Singleton instance shared across the application. */
export const goalsManager = new GoalsManager();

// ---------------------------------------------------------------------------
// renderGoalRings
// ---------------------------------------------------------------------------

/**
 * Renders three animated SVG progress rings into `container`.
 *
 * Each ring visualises one KPI from `goalProgress.ringData`:
 *   Ring 0 - Daily practice time  (indigo)
 *   Ring 1 - Daily best WPM       (teal)
 *   Ring 2 - Weekly lessons done  (amber)
 *
 * The function is idempotent: calling it again updates the existing rings
 * rather than appending duplicates.
 *
 * @param {HTMLElement} container    - The element to render rings into.
 * @param {object}      goalProgress - Return value of goalsManager.getGoalProgress().
 */
export function renderGoalRings(container, goalProgress) {
  if (!container || !goalProgress) return;

  const { ringData } = goalProgress;
  if (!Array.isArray(ringData) || ringData.length === 0) return;

  // SVG geometry constants
  const SIZE        = 110;
  const STROKE      = 10;
  const RADIUS      = (SIZE - STROKE) / 2;              // 50
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;           // ~314.16

  // Ensure the container is a flex row of rings on first call.
  if (!container.dataset.goalsRingsInit) {
    container.dataset.goalsRingsInit = '1';
    container.style.display        = 'flex';
    container.style.flexDirection  = 'row';
    container.style.justifyContent = 'center';
    container.style.alignItems     = 'flex-start';
    container.style.gap            = '1.5rem';
    container.style.flexWrap       = 'wrap';
  }

  ringData.forEach((ring, idx) => {
    const ringKey = `goal-ring-${idx}`;
    let ringEl    = container.querySelector(`[data-ring-id="${ringKey}"]`);

    if (!ringEl) {
      ringEl = document.createElement('div');
      ringEl.dataset.ringId = ringKey;
      ringEl.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'gap:0.4rem',
        'flex:1',
        'min-width:90px'
      ].join(';');
      container.appendChild(ringEl);
    }

    // stroke-dashoffset: 0 = full ring, CIRCUMFERENCE = empty ring.
    const offset = CIRCUMFERENCE * (1 - ring.pct / 100);

    // Format the centre display value depending on which ring it is.
    let displayValue;
    if (idx === 0) {
      // Daily minutes: one decimal when < 10, otherwise integer + 'm'
      displayValue = ring.current >= 10
        ? `${Math.round(ring.current)}m`
        : `${ring.current.toFixed(1)}m`;
    } else if (idx === 1) {
      // Daily WPM: plain integer
      displayValue = `${ring.current}`;
    } else {
      // Weekly lessons: "current/target" fraction
      displayValue = `${ring.current}/${ring.target}`;
    }

    const pctLabel = `${ring.pct}%`;

    // Re-render the SVG (simpler than diffing individual attributes).
    ringEl.innerHTML = `
      <svg
        width="${SIZE}"
        height="${SIZE}"
        viewBox="0 0 ${SIZE} ${SIZE}"
        role="img"
        aria-label="${ring.label}: ${ring.current} of ${ring.target} (${pctLabel})"
        style="overflow:visible;"
      >
        <!-- Track (background) circle -->
        <circle
          cx="${SIZE / 2}"
          cy="${SIZE / 2}"
          r="${RADIUS}"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          stroke-width="${STROKE}"
        />
        <!-- Progress arc -->
        <circle
          cx="${SIZE / 2}"
          cy="${SIZE / 2}"
          r="${RADIUS}"
          fill="none"
          stroke="${ring.color}"
          stroke-width="${STROKE}"
          stroke-linecap="round"
          stroke-dasharray="${CIRCUMFERENCE}"
          stroke-dashoffset="${CIRCUMFERENCE}"
          transform="rotate(-90 ${SIZE / 2} ${SIZE / 2})"
          style="
            transition:stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1);
            filter:drop-shadow(0 0 4px ${ring.color}88);
          "
          data-progress-arc
        />
        <!-- Centre value label -->
        <text
          x="${SIZE / 2}"
          y="${SIZE / 2 - 4}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="${ring.color}"
          font-size="13"
          font-weight="700"
          font-family="inherit"
        >${displayValue}</text>
        <!-- Centre percentage label -->
        <text
          x="${SIZE / 2}"
          y="${SIZE / 2 + 13}"
          text-anchor="middle"
          dominant-baseline="middle"
          fill="rgba(255,255,255,0.45)"
          font-size="9"
          font-family="inherit"
        >${pctLabel}</text>
      </svg>
      <!-- Descriptive label below the ring -->
      <span style="
        font-size:0.72rem;
        color:rgba(255,255,255,0.55);
        text-align:center;
        letter-spacing:0.03em;
        white-space:nowrap;
      ">${ring.label}</span>
    `;

    // Animate from empty (CIRCUMFERENCE) to the target offset on the next
    // two animation frames so the initial paint is visible first.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const arc = ringEl.querySelector('[data-progress-arc]');
        if (arc) arc.style.strokeDashoffset = String(offset);
      });
    });
  });
}
